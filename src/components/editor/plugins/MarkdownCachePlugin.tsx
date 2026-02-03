"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { updateCachedMarkdown } from "@/lib/markdownCache";

export function MarkdownCachePlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
            editorState.read(() => {
                const markdown = $convertToMarkdownString(TRANSFORMERS);
                updateCachedMarkdown(markdown);
            });
        });
    }, [editor]);

    return null;
}
