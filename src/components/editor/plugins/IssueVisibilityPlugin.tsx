"use client";

import { useEffect, useRef, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

interface IssueVisibilityPluginProps {
    hoveredIssueType: string | null;
    enabled: boolean;
}

// Helper to get the issue type from the highlight class
const getIssueTypeFromClass = (className: string): string | null => {
    if (className.includes('issue-highlight-blue')) return 'adverb';
    if (className.includes('issue-highlight-emerald')) return 'passive';
    if (className.includes('issue-highlight-red')) return 'veryComplex';
    if (className.includes('issue-highlight-amber')) return 'complex';
    if (className.includes('issue-highlight-purple')) return 'hardWord';
    if (className.includes('issue-highlight-primary')) return 'qualifier';
    return null;
};

// Helper to check which issue types are currently active (toggled on)
const getActiveIssueTypes = (): Set<string> => {
    const html = document.documentElement;
    const activeTypes = new Set<string>();
    
    const issueTypes = ['adverb', 'passive', 'complex', 'veryComplex', 'hardWord', 'qualifier'];
    issueTypes.forEach(type => {
        if (html.getAttribute(`data-highlight-active-${type}`) === 'on') {
            activeTypes.add(type);
        }
    });
    
    return activeTypes;
};

export function IssueVisibilityPlugin({ hoveredIssueType, enabled }: IssueVisibilityPluginProps) {
    const [editor] = useLexicalComposerContext();
    const previousTypeRef = useRef<string | null>(null);
    
    // Use a ref to track the current state without causing re-renders
    const stateRef = useRef({ hoveredIssueType, enabled });
    stateRef.current = { hoveredIssueType, enabled };

    // Memoize the update function to avoid recreating it
    const updateVisibility = useCallback(() => {
        const { hoveredIssueType, enabled } = stateRef.current;
        
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
                
                // Get which issue types are currently toggled on
                const activeTypes = getActiveIssueTypes();

                issueNodes.forEach((node) => {
                    const element = node as HTMLElement;
                    const issueType = getIssueTypeFromClass(element.className);

                    if (hoveredIssueType === null) {
                        element.classList.remove('issue-visible');
                        return;
                    }

                    if (hoveredIssueType === '__all__') {
                        // In "Highlight On" mode, only show issues for types that are toggled on
                        if (issueType && activeTypes.has(issueType)) {
                            element.classList.add('issue-visible');
                        } else {
                            element.classList.remove('issue-visible');
                        }
                        return;
                    }

                    // Hover mode: only show the specific hovered type
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
    }, [editor]);

    // Effect to handle hoveredIssueType changes
    useEffect(() => {
        const timeoutId = setTimeout(updateVisibility, 50);
        return () => clearTimeout(timeoutId);
    }, [hoveredIssueType, enabled, updateVisibility]);

    // Effect to watch for changes to data-highlight-active-* attributes
    useEffect(() => {
        const html = document.documentElement;
        
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName?.startsWith('data-highlight-active-')) {
                    shouldUpdate = true;
                    break;
                }
            }
            
            if (shouldUpdate && stateRef.current.hoveredIssueType === '__all__') {
                // Re-run visibility update when active types change
                updateVisibility();
            }
        });
        
        observer.observe(html, {
            attributes: true,
            attributeFilter: [
                'data-highlight-active-adverb',
                'data-highlight-active-passive',
                'data-highlight-active-complex',
                'data-highlight-active-veryComplex',
                'data-highlight-active-hardWord',
                'data-highlight-active-qualifier'
            ]
        });
        
        return () => observer.disconnect();
    }, [updateVisibility]);

    return null;
}