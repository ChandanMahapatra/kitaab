import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { $isLinkNode } from "@lexical/link";
import { $getNearestNodeFromDOMNode } from "lexical";

/**
 * Plugin that handles Cmd/Ctrl+Click on links to open them in a new tab
 * Preserves normal editing behavior for regular clicks
 */
export function LinkClickPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            // Only handle Cmd/Ctrl+Click
            const isCmdOrCtrl = event.metaKey || event.ctrlKey;
            if (!isCmdOrCtrl) return;

            const target = event.target as HTMLElement;
            const linkElement = target.closest('a.editor-link');
            if (!linkElement) return;

            event.preventDefault();
            event.stopPropagation();

            editor.read(() => {
                const node = $getNearestNodeFromDOMNode(linkElement);
                if ($isLinkNode(node)) {
                    const url = node.getURL();
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            });
        };

        const rootElement = editor.getRootElement();
        if (rootElement) {
            rootElement.addEventListener('click', handleClick);
            return () => rootElement.removeEventListener('click', handleClick);
        }
    }, [editor]);

    return null;
}
