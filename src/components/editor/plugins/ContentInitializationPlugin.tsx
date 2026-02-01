"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useState } from "react";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { loadDocument } from "@/lib/storage";

const CURRENT_DOC_ID = "default-draft";

export function ContentInitializationPlugin() {
    const [editor] = useLexicalComposerContext();
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (isLoaded) return;

        const loadContent = async () => {
            try {
                const doc = await loadDocument(CURRENT_DOC_ID);
                if (doc && doc.content) {
                    editor.update(() => {
                        $convertFromMarkdownString(doc.content, TRANSFORMERS);
                    });
                }
            } catch (error) {
                console.error("Failed to load content", error);
            } finally {
                setIsLoaded(true);
            }
        };

        loadContent();
    }, [editor, isLoaded]);

    return null;
}
