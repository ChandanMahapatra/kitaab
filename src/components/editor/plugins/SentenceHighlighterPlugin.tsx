"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";
import { $getRoot, $createTextNode, $isTextNode, TextNode, LexicalNode } from "lexical";
import { $createIssueNode, IssueNode, $isIssueNode } from "@/components/editor/nodes/IssueNode";
import { AnalysisResult, Issue } from "@/lib/analysis";
import { getCachedMarkdown } from "@/lib/markdownCache";

const DEBOUNCE_DELAY = 500; // Debounce DOM updates to avoid frequent re-highlighting

interface SentenceHighlighterPluginProps {
    analysis: AnalysisResult | null;
}

export function SentenceHighlighterPlugin({ analysis }: SentenceHighlighterPluginProps) {
    const [editor] = useLexicalComposerContext();
    const lastAnalysisRef = useRef<AnalysisResult | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!analysis || !editor.hasNodes([IssueNode])) {
            return;
        }

        // Skip if analysis hasn't changed meaningfully
        const sentenceIssues = analysis.issues.filter(
            i => i.type === 'complex' || i.type === 'veryComplex'
        );
        const lastSentenceIssues = lastAnalysisRef.current?.issues.filter(
            i => i.type === 'complex' || i.type === 'veryComplex'
        ) || [];

        // Quick check: compare counts
        if (sentenceIssues.length === lastSentenceIssues.length) {
            // Compare issue positions and lengths
            const isSame = sentenceIssues.every((issue, idx) => {
                const lastIssue = lastSentenceIssues[idx];
                return lastIssue && 
                       issue.index === lastIssue.index && 
                       issue.length === lastIssue.length &&
                       issue.type === lastIssue.type;
            });
            if (isSame) return;
        }

        lastAnalysisRef.current = analysis;

        // Debounce the DOM update to avoid frequent re-highlighting
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            editor.update(() => {
                const { markdown } = getCachedMarkdown();

                if (sentenceIssues.length === 0) {
                    removeAllSentenceIssueNodes(editor);
                    return;
                }

                removeAllSentenceIssueNodes(editor);
                applySentenceHighlights(sentenceIssues, markdown);
            });
        }, DEBOUNCE_DELAY);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [analysis, editor]);

    return null;
}

function removeAllSentenceIssueNodes(editor: ReturnType<typeof useLexicalComposerContext>[0]) {
    const root = $getRoot();
    const nodesToProcess: TextNode[] = [];
    
    // Collect all issue nodes that are sentence-level
    const collectNodes = (node: LexicalNode) => {
        if ($isIssueNode(node)) {
            const issueType = (node as IssueNode).__issueType;
            if (issueType === 'complex' || issueType === 'veryComplex') {
                // Replace with plain text node
                const textNode = $createTextNode(node.getTextContent());
                textNode.setFormat(node.getFormat());
                textNode.setStyle(node.getStyle());
                node.replace(textNode);
                return;
            }
        }
        
        if ('getChildren' in node && typeof node.getChildren === 'function') {
            const children = node.getChildren();
            children.forEach(collectNodes);
        }
    };
    
    collectNodes(root);
}

function applySentenceHighlights(issues: Issue[], markdown: string) {
    const root = $getRoot();
    
    // Build a precise mapping of markdown positions to editor nodes
    // by walking the editor tree and matching text content with markdown
    
    type PositionInfo = {
        node: TextNode;
        offset: number;
        markdownPos: number;
    };
    
    const positionMap: PositionInfo[] = [];
    let markdownPos = 0;
    
    // Collect all text nodes from the editor in order
    const textNodes: TextNode[] = [];
    const collectTextNodes = (node: LexicalNode) => {
        if ($isTextNode(node) && !$isIssueNode(node)) {
            textNodes.push(node);
        } else if ($isIssueNode(node)) {
            // Include issue nodes too - we need to track their content
            textNodes.push(node as unknown as TextNode);
        } else if ('getChildren' in node && typeof node.getChildren === 'function') {
            const children = node.getChildren();
            children.forEach(collectTextNodes);
        }
    };
    
    collectTextNodes(root);
    
    // Build position mapping by matching text nodes to markdown
    // This handles the complex relationship between editor structure and markdown
    for (const node of textNodes) {
        const text = node.getTextContent();
        if (text.length === 0) continue;
        
        // Find this text in the markdown at or after current position
        const searchStart = markdownPos;
        const foundIndex = markdown.indexOf(text, searchStart);
        
        if (foundIndex !== -1) {
            // Found the text in markdown
            if (!$isIssueNode(node)) {
                positionMap.push({
                    node: node as TextNode,
                    offset: 0,
                    markdownPos: foundIndex
                });
            }
            markdownPos = foundIndex + text.length;
        } else {
            // Text not found at expected position, try searching from beginning
            // (handles cases where editor structure differs from markdown)
            const foundFromStart = markdown.indexOf(text);
            if (foundFromStart !== -1 && !$isIssueNode(node)) {
                positionMap.push({
                    node: node as TextNode,
                    offset: 0,
                    markdownPos: foundFromStart
                });
            }
        }
    }
    
    // Sort position map by markdown position for proper ordering
    positionMap.sort((a, b) => a.markdownPos - b.markdownPos);
    
    // Now apply highlights for each issue
    for (const issue of issues) {
        const startPos = issue.index;
        const endPos = issue.index + issue.length;
        
        // Find all text nodes that overlap with this range
        const overlappingNodes: Array<{ node: TextNode; startInNode: number; endInNode: number }> = [];
        
        for (const posInfo of positionMap) {
            const nodeStart = posInfo.markdownPos;
            const nodeEnd = nodeStart + posInfo.node.getTextContent().length;
            
            // Check if this node overlaps with the issue range
            if (nodeStart < endPos && nodeEnd > startPos) {
                const startInNode = Math.max(0, startPos - nodeStart);
                const endInNode = Math.min(posInfo.node.getTextContent().length, endPos - nodeStart);
                
                overlappingNodes.push({
                    node: posInfo.node,
                    startInNode,
                    endInNode
                });
            }
        }
        
        // Apply highlighting to overlapping nodes
        for (const { node, startInNode, endInNode } of overlappingNodes) {
            if (issue.type === 'complex' || issue.type === 'veryComplex') {
                highlightNodeRange(node, startInNode, endInNode, issue.type);
            }
        }
    }
}

function highlightNodeRange(
    node: TextNode, 
    startOffset: number, 
    endOffset: number, 
    issueType: 'complex' | 'veryComplex'
) {
    const text = node.getTextContent();
    const beforeText = text.slice(0, startOffset);
    const matchText = text.slice(startOffset, endOffset);
    const afterText = text.slice(endOffset);
    
    const nodes: TextNode[] = [];
    
    if (beforeText) {
        nodes.push($createTextNode(beforeText));
    }
    
    if (matchText) {
        const issueNode = $createIssueNode(matchText, issueType);
        issueNode.setFormat(node.getFormat());
        issueNode.setStyle(node.getStyle());
        nodes.push(issueNode);
    }
    
    if (afterText) {
        nodes.push($createTextNode(afterText));
    }
    
    if (nodes.length > 0) {
        const firstNode = nodes[0];
        node.replace(firstNode);
        let currentNode = firstNode;
        for (let i = 1; i < nodes.length; i++) {
            currentNode.insertAfter(nodes[i]);
            currentNode = nodes[i];
        }
    }
}
