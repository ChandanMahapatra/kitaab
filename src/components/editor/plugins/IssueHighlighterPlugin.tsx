"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { TextNode } from "lexical";
import { $createIssueNode, IssueNode, $isIssueNode } from "@/components/editor/nodes/IssueNode";
import { isComplexWord } from "@/lib/analysis";

const ADVERB_REGEX = /\b\w+ly\b/gi;
const PASSIVE_REGEX = /\b(is|are|was|were|be|been|being)\s+(\w+ed|\w+en)\b/gi;
const QUALIFIER_REGEX = /\b(I think|we think|I believe|we believe|maybe|perhaps|possibly|probably|I guess|we guess|kind of|sort of|a bit|a little|really|extremely|incredibly)\b/gi;
const WORD_REGEX = /\b\w+\b/g;
const SENTENCE_REGEX = /[^.!?]+[.!?]+(\s+|$)/g;

function findMatchIndex(text: string, regex: RegExp): { start: number, end: number, match: string } | null {
    regex.lastIndex = 0;
    const match = regex.exec(text);
    if (match) {
        return { start: match.index, end: match.index + match[0].length, match: match[0] };
    }
    return null;
}

function findHardWordMatch(text: string): { start: number, end: number, match: string } | null {
    WORD_REGEX.lastIndex = 0;
    let wordMatch;
    while ((wordMatch = WORD_REGEX.exec(text)) !== null) {
        const word = wordMatch[0];
        if (isComplexWord(word)) {
            return { start: wordMatch.index, end: wordMatch.index + word.length, match: word };
        }
    }
    return null;
}

function findComplexSentenceMatch(text: string): { start: number, end: number, match: string, type: 'complex' | 'veryComplex' } | null {
    SENTENCE_REGEX.lastIndex = 0;
    let sentenceMatch;
    while ((sentenceMatch = SENTENCE_REGEX.exec(text)) !== null) {
        const sentenceText = sentenceMatch[0];
        const words = sentenceText.match(WORD_REGEX) || [];
        if (words.length > 35) {
            return { start: sentenceMatch.index, end: sentenceMatch.index + sentenceText.length, match: sentenceText, type: 'veryComplex' };
        }
        if (words.length > 25) {
            return { start: sentenceMatch.index, end: sentenceMatch.index + sentenceText.length, match: sentenceText, type: 'complex' };
        }
    }
    return null;
}

export function IssueHighlighterPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([IssueNode])) {
            throw new Error("IssueHighlighterPlugin: IssueNode not registered on editor");
        }

        return editor.registerNodeTransform(TextNode, (textNode) => {
            if ($isIssueNode(textNode)) return;

            let currentNode: TextNode | null = textNode;

            while (currentNode) {
                if ($isIssueNode(currentNode)) break;

                const text = currentNode.getTextContent();

                const matches: Array<{ start: number; end: number; match: string; type: string }> = [];

                const adverbMatch = findMatchIndex(text, ADVERB_REGEX);
                if (adverbMatch) matches.push({ ...adverbMatch, type: 'adverb' });

                const passiveMatch = findMatchIndex(text, PASSIVE_REGEX);
                if (passiveMatch) matches.push({ ...passiveMatch, type: 'passive' });

                const qualifierMatch = findMatchIndex(text, QUALIFIER_REGEX);
                if (qualifierMatch) matches.push({ ...qualifierMatch, type: 'qualifier' });

                const hardWordMatch = findHardWordMatch(text);
                if (hardWordMatch) matches.push({ ...hardWordMatch, type: 'hardWord' });

                const complexMatch = findComplexSentenceMatch(text);
                if (complexMatch) matches.push({ start: complexMatch.start, end: complexMatch.end, match: complexMatch.match, type: complexMatch.type });

                if (matches.length === 0) break;

                const bestMatch = matches.reduce((best, current) => {
                    if (current.start < best.start) return current;
                    if (current.start === best.start) {
                        const bestLen = best.end - best.start;
                        const currentLen = current.end - current.start;
                        return currentLen < bestLen ? current : best;
                    }
                    return best;
                });

                const { start, end, match: matchText, type } = bestMatch;

                if (type === 'adverb') {
                    const word = matchText.toLowerCase();
                    const exceptions = ['family', 'only', 'july', 'reply', 'supply', 'apply', 'belly', 'jelly', 'rally', 'ally'];
                    if (exceptions.includes(word)) {
                        const split = start === 0
                            ? currentNode.splitText(end)
                            : currentNode.splitText(start, end);
                        currentNode = split[split.length - 1] ?? null;
                        continue;
                    }
                }

                let targetNode: TextNode;
                let afterNode: TextNode | undefined;

                if (start === 0) {
                    const split = currentNode.splitText(end);
                    targetNode = split[0];
                    afterNode = split[1];
                } else {
                    const split = currentNode.splitText(start, end);
                    targetNode = split[1];
                    afterNode = split[2];
                }

                const issueNode = $createIssueNode(matchText, type);
                issueNode.setFormat(targetNode.getFormat());
                targetNode.replace(issueNode);

                currentNode = afterNode ?? null;
            }
        });

    }, [editor]);

    return null;
}
