"use client";

import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

interface IssueVisibilityPluginProps {
    hoveredIssueType: string | null;
    enabled: boolean;
}

export function IssueVisibilityPlugin({ hoveredIssueType, enabled }: IssueVisibilityPluginProps) {
    const [editor] = useLexicalComposerContext();
    const previousTypeRef = useRef<string | null>(null);

    useEffect(() => {
        const updateVisibility = () => {
            if (!enabled) {
                if (previousTypeRef.current !== null) {
                    editor.update(() => {
                        editor.getEditorState().read(() => {
                            const root = editor.getRootElement();
                            if (root) {
                                const issueNodes = root.querySelectorAll('[class*="issue-highlight-"]');
                                issueNodes.forEach((node) => {
                                    node.classList.remove('issue-visible');
                                });
                            }
                        });
                    });
                    previousTypeRef.current = null;
                }
                return;
            }

            editor.update(() => {
                editor.getEditorState().read(() => {
                    const root = editor.getRootElement();
                    if (!root) return;

                    const issueNodes = root.querySelectorAll('[class*="issue-highlight-"]');

                    issueNodes.forEach((node) => {
                        const element = node as HTMLElement;

                        if (hoveredIssueType === null) {
                            element.classList.remove('issue-visible');
                            return;
                        }

                        if (hoveredIssueType === '__all__') {
                            element.classList.add('issue-visible');
                            return;
                        }

                        const typeClass = `issue-highlight-${hoveredIssueType === 'adverb' ? 'blue' :
                            hoveredIssueType === 'passive' ? 'emerald' :
                                hoveredIssueType === 'veryComplex' ? 'red' :
                                    hoveredIssueType === 'complex' ? 'amber' :
                                        hoveredIssueType === 'hardWord' ? 'purple' :
                                            hoveredIssueType === 'qualifier' ? 'primary' : 'amber'}`;

                        if (element.classList.contains(typeClass)) {
                            element.classList.add('issue-visible');
                        } else {
                            element.classList.remove('issue-visible');
                        }
                    });
                });
            });

            previousTypeRef.current = hoveredIssueType;
        };

        const timeoutId = setTimeout(updateVisibility, 50);

        return () => clearTimeout(timeoutId);
    }, [hoveredIssueType, enabled, editor]);

    return null;
}
