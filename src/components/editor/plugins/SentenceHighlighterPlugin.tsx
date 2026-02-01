"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";
import { $getRoot, $createTextNode, $isTextNode, TextNode, LexicalNode } from "lexical";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { $createIssueNode, IssueNode, $isIssueNode } from "@/components/editor/nodes/IssueNode";
import { AnalysisResult, Issue } from "@/lib/analysis";

const DEBOUNCE_DELAY = 500;

interface SentenceHighlighterPluginProps {
    analysis: AnalysisResult | null;
}

export function SentenceHighlighterPlugin({ analysis }: SentenceHighlighterPluginProps) {
    const [editor] = useLexicalComposerContext();
    const lastAnalysisRef = useRef<AnalysisResult | null>(null);

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

        const timeoutId = setTimeout(() => {
            editor.update(() => {
                // Get the markdown representation to match positions
                const markdown = $convertToMarkdownString(TRANSFORMERS);
                
                // Process sentence-level issues
                const sentenceIssues = analysis.issues.filter(
                    issue => issue.type === 'complex' || issue.type === 'veryComplex'
                );

                if (sentenceIssues.length === 0) {
                    // Remove all existing sentence issue nodes if no issues found
                    removeAllSentenceIssueNodes(editor);
                    return;
                }

                // First, clean up old sentence issue nodes
                removeAllSentenceIssueNodes(editor);

                // Then apply new highlights
                applySentenceHighlights(sentenceIssues, markdown);
            });
        }, DEBOUNCE_DELAY);

        return () => clearTimeout(timeoutId);
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
    
    // Build a mapping of markdown positions to editor nodes
    // This is complex because markdown and editor structure differ
    // We'll use a character-by-character approach
    
    type PositionInfo = {
        node: TextNode;
        offset: number;
        markdownPos: number;
    };
    
    const positionMap: PositionInfo[] = [];
    let currentMarkdownPos = 0;
    
    // Traverse the editor tree and build position mapping
    const buildPositionMap = (node: LexicalNode) => {
        if ($isTextNode(node) && !$isIssueNode(node)) {
            const text = node.getTextContent();
            positionMap.push({
                node,
                offset: 0,
                markdownPos: currentMarkdownPos
            });
            currentMarkdownPos += text.length;
        } else if ($isIssueNode(node)) {
            // Skip issue nodes - their content is already counted in the analysis
            // But we need to account for their length in position tracking
            const text = node.getTextContent();
            currentMarkdownPos += text.length;
        } else if ('getChildren' in node && typeof node.getChildren === 'function') {
            const children = node.getChildren();
            children.forEach(buildPositionMap);
            
            // Account for newlines between block-level elements in markdown
            if (node.getType() === 'paragraph' || node.getType() === 'heading') {
                currentMarkdownPos += 1; // \n
            }
        }
    };
    
    buildPositionMap(root);
    
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
