"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { TextNode } from "lexical";
import { $createIssueNode, IssueNode, $isIssueNode } from "@/components/editor/nodes/IssueNode";
import { isComplexWord, WORD_REGEX } from "@/lib/analysis";

const ADVERB_REGEX = /\b\w+ly\b/gi;
const PASSIVE_REGEX = /\b(is|are|was|were|be|been|being)\s+(\w+ed|\w+en)\b/gi;
const QUALIFIER_REGEX = /\b(I think|we think|I believe|we believe|maybe|perhaps|possibly|probably|I guess|we guess|kind of|sort of|a bit|a little|really|extremely|incredibly)\b/gi;

function findMatchIndex(text: string, regex: RegExp): { start: number, end: number, match: string } | null {
    regex.lastIndex = 0;
    const match = regex.exec(text);
    if (match) {
        return { start: match.index, end: match.index + match[0].length, match: match[0] };
    }
    return null;
}

/**
 * Find the first complex word (4+ syllables) in the text.
 *
 * Performance optimization: Skip words shorter than 7 characters before syllable counting,
 * as words with 4+ syllables are almost always 7+ characters long. This reduces expensive
 * syllable counting calls on short words.
 */
function findHardWordMatch(text: string): { start: number, end: number, match: string } | null {
    WORD_REGEX.lastIndex = 0;
    let wordMatch;
    while ((wordMatch = WORD_REGEX.exec(text)) !== null) {
        const word = wordMatch[0];
        // Skip short words - 4+ syllable words are typically 7+ chars
        if (word.length >= 7 && isComplexWord(word)) {
            return { start: wordMatch.index, end: wordMatch.index + word.length, match: word };
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

        /**
         * Register a node transform that highlights writing issues in the editor.
         *
         * IMPORTANT: This transform processes ONE match per text node, then relies on
         * Lexical's automatic transform re-firing for split text nodes. When we split
         * a text node (e.g., "word quickly here" → ["word ", "quickly", " here"]),
         * Lexical automatically calls this transform again for the newly created text
         * nodes, allowing us to process subsequent matches iteratively.
         *
         * This approach is more efficient than the previous while-loop implementation
         * because it lets Lexical manage the iteration and ensures proper node cleanup.
         */
        return editor.registerNodeTransform(TextNode, (textNode) => {
            if ($isIssueNode(textNode)) return;

            const text = textNode.getTextContent();

            const matches: Array<{ start: number; end: number; match: string; type: string }> = [];

            const adverbMatch = findMatchIndex(text, ADVERB_REGEX);
            if (adverbMatch) matches.push({ ...adverbMatch, type: 'adverb' });

            const passiveMatch = findMatchIndex(text, PASSIVE_REGEX);
            if (passiveMatch) matches.push({ ...passiveMatch, type: 'passive' });

            const qualifierMatch = findMatchIndex(text, QUALIFIER_REGEX);
            if (qualifierMatch) matches.push({ ...qualifierMatch, type: 'qualifier' });

            const hardWordMatch = findHardWordMatch(text);
            if (hardWordMatch) matches.push({ ...hardWordMatch, type: 'hardWord' });

            if (matches.length === 0) return;

            // Pick earliest match; on tie, prefer shorter (word-level over phrase-level)
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
                if (exceptions.includes(word)) return;
            }

            let targetNode: TextNode;

            if (start === 0) {
                const split = textNode.splitText(end);
                targetNode = split[0];
            } else {
                const split = textNode.splitText(start, end);
                targetNode = split[1];
            }

            const issueNode = $createIssueNode(matchText, type);
            issueNode.setFormat(targetNode.getFormat());
            targetNode.replace(issueNode);

            // After splitting and replacing, Lexical will automatically re-fire this
            // transform for the remaining text nodes (split[2] if start > 0, or split[1]
            // if start === 0), allowing us to process the next match in those nodes.
        });

    }, [editor]);

    return null;
}
