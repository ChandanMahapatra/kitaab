"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { TextNode } from "lexical";
import { $createIssueNode, IssueNode, $isIssueNode } from "@/components/editor/nodes/IssueNode";

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

export function IssueHighlighterPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!editor.hasNodes([IssueNode])) {
            throw new Error("IssueHighlighterPlugin: IssueNode not registered on editor");
        }

        return editor.registerNodeTransform(TextNode, (textNode) => {
            if ($isIssueNode(textNode)) return;

            const text = textNode.getTextContent();

            let match = findMatchIndex(text, ADVERB_REGEX);
            let type = 'adverb';

            if (!match) {
                match = findMatchIndex(text, PASSIVE_REGEX);
                type = 'passive';
            }

            if (!match) {
                match = findMatchIndex(text, QUALIFIER_REGEX);
                type = 'qualifier';
            }

            if (match) {
                const { start, end, match: matchText } = match;

                if (type === 'adverb') {
                    const word = matchText.toLowerCase();
                    const exceptions = ['family', 'only', 'july', 'reply', 'supply', 'apply', 'belly', 'jelly', 'rally', 'ally'];
                    if (exceptions.includes(word)) return;
                }

                let targetNode;
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
            }
        });

    }, [editor]);

    return null;
}
