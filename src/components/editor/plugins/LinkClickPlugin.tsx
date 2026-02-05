"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

/**
 * Opens links in a new tab when clicked (with Cmd/Ctrl held or when not in edit mode).
 * Links always open in new tab on click to match expected behavior.
 */
export default function LinkClickPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const rootElement = editor.getRootElement();
        if (rootElement === null) return;

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const linkElement = target.closest("a");
            if (linkElement === null) return;

            // Only open on Cmd/Ctrl+Click to avoid interfering with editing
            if (!event.metaKey && !event.ctrlKey) return;

            event.preventDefault();
            event.stopPropagation();

            const href = linkElement.getAttribute("href");
            if (href) {
                window.open(href, "_blank", "noopener,noreferrer");
            }
        };

        rootElement.addEventListener("click", handleClick);
        return () => {
            rootElement.removeEventListener("click", handleClick);
        };
    }, [editor]);

    return null;
}
