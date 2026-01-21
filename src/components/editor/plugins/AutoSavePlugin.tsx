"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useCallback } from "react";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { $convertToMarkdownString } from "@lexical/markdown";
import { TRANSFORMERS } from "@lexical/markdown";
import { saveDocument } from "@/lib/storage";

const DEBOUNCE_DELAY = 1000;
const CURRENT_DOC_ID = "default-draft"; // Single document mode for now

export function AutoSavePlugin() {
    const [editor] = useLexicalComposerContext();

    const saveContent = useCallback(async (editorState: any) => {
        editorState.read(() => {
            const markdown = $convertToMarkdownString(TRANSFORMERS);
            const now = new Date();

            saveDocument({
                id: CURRENT_DOC_ID,
                title: "Untitled Draft",
                content: markdown,
                plainText: markdown, // For now, simple approximation
                createdAt: now, // This should conceptually be preserved
                updatedAt: now,
            }).catch(err => console.error("Auto-save failed", err));
        });
    }, []);

    // Debouncing is handled by generic OnChange usually, but let's use a simpler approach
    // Lexical's OnChangePlugin runs on every change. We need to debounce the SAVE.

    return (
        <OnChangePlugin
            onChange={(editorState) => {
                // Minimal debounce
                const timeoutId = setTimeout(() => {
                    saveContent(editorState);
                }, DEBOUNCE_DELAY);
                return () => clearTimeout(timeoutId);
            }}
            ignoreSelectionChange
        />
    );
}

// Better Debounce Implementation
export function DebouncedAutoSavePlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        return editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
            // Don't update if no content changed
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;

            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                editorState.read(() => {
                    const markdown = $convertToMarkdownString(TRANSFORMERS);
                    const now = new Date();
                    saveDocument({
                        id: CURRENT_DOC_ID,
                        title: "Untitled Draft",
                        content: markdown,
                        plainText: markdown,
                        createdAt: now,
                        updatedAt: now,
                    }).then(() => {
                        console.log("Auto-saved to IndexedDB");
                    }).catch(err => console.error("Auto-save failed", err));
                });
            }, DEBOUNCE_DELAY);
        });
    }, [editor]);

    return null;
}
