"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    KEY_DOWN_COMMAND,
    COMMAND_PRIORITY_NORMAL,
    FORMAT_TEXT_COMMAND,
    $getSelection,
    $isRangeSelection,
    $createParagraphNode,
    $createTextNode,
} from "lexical";
import { $isLinkNode, $createLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
    INSERT_UNORDERED_LIST_COMMAND,
    INSERT_ORDERED_LIST_COMMAND,
} from "@lexical/list";
import { $createHeadingNode, $createQuoteNode, HeadingTagType } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { sanitizeUrl } from "@/lib/linkUtils";

const IS_APPLE = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

// OS and browser shortcuts that should never be intercepted
const PROTECTED_OS_SHORTCUTS = new Set([
    'c', 'x', 'v',        // Clipboard: copy, cut, paste
    'z', 'y',             // Undo/Redo (Y for Windows Ctrl+Y)
    'a',                  // Select all
    'b', 'i', 'u',        // Text formatting (handled by Lexical's RichTextPlugin)
    'f', 'r', 'w', 't', 'n', 's', 'p',  // Browser shortcuts (find, refresh, close, new tab, new window, save, print)
]);

interface KeyboardShortcutsPluginProps {
    setIsLinkEditMode: (isLinkEditMode: boolean) => void;
}

export default function KeyboardShortcutsPlugin({ setIsLinkEditMode }: KeyboardShortcutsPluginProps) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): boolean => {
            const { key, shiftKey, altKey } = event;
            const modKey = IS_APPLE ? event.metaKey : event.ctrlKey;

            if (!modKey) return false;

            // PROTECTION: Never intercept OS/browser shortcuts
            // Allow paste, copy, cut, undo, redo, select all, and text formatting to work normally
            const keyLower = key.toLowerCase();

            // Protect simple modifier+key shortcuts (no shift, no alt)
            if (!shiftKey && !altKey && PROTECTED_OS_SHORTCUTS.has(keyLower)) {
                return false; // Pass through to browser/Lexical
            }

            // Also protect Cmd+Shift+Z (redo on Mac)
            if (shiftKey && !altKey && keyLower === 'z') {
                return false; // Pass through for redo
            }

            // Text formatting shortcuts (Cmd/Ctrl + key, no shift, no alt)
            if (!shiftKey && !altKey) {
                switch (keyLower) {
                    case 'e':
                        // Cmd/Ctrl+E: Inline code
                        event.preventDefault();
                        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
                        return true;
                    case 'k':
                        // Cmd/Ctrl+K: Insert link
                        event.preventDefault();
                        insertLink();
                        return true;
                }
            }

            // Shift shortcuts (Cmd/Ctrl+Shift+key)
            if (shiftKey && !altKey) {
                switch (keyLower) {
                    case 's':
                        // Cmd/Ctrl+Shift+S: Strikethrough
                        event.preventDefault();
                        editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
                        return true;
                    case '8':
                    case '*':
                        // Cmd/Ctrl+Shift+8: Bullet list
                        event.preventDefault();
                        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
                        return true;
                    case '7':
                    case '&':
                        // Cmd/Ctrl+Shift+7: Numbered list
                        event.preventDefault();
                        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
                        return true;
                    case '.':
                    case '>':
                        // Cmd/Ctrl+Shift+.: Quote
                        event.preventDefault();
                        formatQuote();
                        return true;
                }
            }

            // Alt shortcuts (Cmd/Ctrl+Alt+key) for headings
            if (altKey && !shiftKey) {
                switch (key) {
                    case '1':
                        event.preventDefault();
                        formatHeading('h1');
                        return true;
                    case '2':
                        event.preventDefault();
                        formatHeading('h2');
                        return true;
                    case '3':
                        event.preventDefault();
                        formatHeading('h3');
                        return true;
                    case '0':
                        event.preventDefault();
                        formatParagraph();
                        return true;
                }
            }

            return false;
        };

        const insertLink = () => {
            const selection = editor.getEditorState().read(() => $getSelection());
            const isCollapsed = $isRangeSelection(selection) && selection.isCollapsed();

            if (isCollapsed) {
                // For collapsed selection, insert placeholder text first
                editor.update(() => {
                    const selection = $getSelection();
                    if (!$isRangeSelection(selection)) return;

                    const node = selection.anchor.getNode();
                    const parent = node.getParent();

                    // Check if already in a link
                    if ($isLinkNode(parent) || $isLinkNode(node)) {
                        // If already in a link, just open the editor
                        setIsLinkEditMode(true);
                        return;
                    }

                    const linkNode = $createLinkNode(sanitizeUrl("https://"));
                    const textNode = $createTextNode("link");
                    linkNode.append(textNode);
                    selection.insertNodes([linkNode]);
                    textNode.select(0, 4); // Select "link" text
                });
            } else {
                // For text selection, just toggle the link
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl("https://"));
            }

            // Wait for next frame to ensure editor has updated
            requestAnimationFrame(() => {
                setIsLinkEditMode(true);
            });
        };

        const formatHeading = (headingSize: HeadingTagType) => {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createHeadingNode(headingSize));
                }
            });
        };

        const formatParagraph = () => {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createParagraphNode());
                }
            });
        };

        const formatQuote = () => {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createQuoteNode());
                }
            });
        };

        return editor.registerCommand(
            KEY_DOWN_COMMAND,
            handleKeyDown,
            COMMAND_PRIORITY_NORMAL
        );
    }, [editor, setIsLinkEditMode]);

    return null;
}
