import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW, SELECTION_CHANGE_COMMAND, createCommand, LexicalCommand, LexicalNode } from "lexical";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { Popover } from "@base-ui/react/popover";
import { normalizeUrl, isValidUrl } from "@/lib/linkUtils";

// Custom command to open the link editor from toolbar
export const OPEN_LINK_EDITOR_COMMAND: LexicalCommand<void> = createCommand();

/** Finds the active link node from the current selection, checking both the node and its parent. */
function getActiveLinkNode(selection: ReturnType<typeof $getSelection>): LexicalNode | null {
    if (!$isRangeSelection(selection)) return null;
    const node = selection.anchor.getNode();
    const parent = node.getParent();
    if ($isLinkNode(parent)) return parent;
    if ($isLinkNode(node)) return node;
    return null;
}

/**
 * Floating link editor that appears when editing links
 * Uses Base UI Popover for elegant positioning
 */
export function FloatingLinkEditorPlugin() {
    const [editor] = useLexicalComposerContext();
    const [isOpen, setIsOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [urlError, setUrlError] = useState('');
    const [linkText, setLinkText] = useState('');
    const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const tempAnchorRef = useRef<HTMLElement | null>(null);

    // Clean up temp anchor element when popover closes
    useEffect(() => {
        if (!isOpen && tempAnchorRef.current) {
            if (document.body.contains(tempAnchorRef.current)) {
                document.body.removeChild(tempAnchorRef.current);
            }
            tempAnchorRef.current = null;
        }
    }, [isOpen]);

    // Track the current link node
    const updateLinkEditor = useCallback(() => {
        const selection = $getSelection();
        const linkNode = getActiveLinkNode(selection);

        if (linkNode && $isLinkNode(linkNode)) {
            setUrl(linkNode.getURL());
            setLinkText(linkNode.getTextContent());
            setUrlError('');

            const domElement = editor.getElementByKey(linkNode.getKey());
            if (domElement) {
                setAnchorElement(domElement as HTMLElement);
                setIsOpen(true);
            }
        }
    }, [editor]);

    // Listen for custom command to open link editor from toolbar
    useEffect(() => {
        return editor.registerCommand(
            OPEN_LINK_EDITOR_COMMAND,
            () => {
                editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const selectedText = selection.getTextContent();
                        setUrl('');
                        setUrlError('');
                        setLinkText(selectedText);

                        // Use setTimeout to ensure DOM is updated
                        setTimeout(() => {
                            const nativeSelection = window.getSelection();
                            if (nativeSelection && nativeSelection.rangeCount > 0) {
                                const range = nativeSelection.getRangeAt(0);
                                let rect = range.getBoundingClientRect();

                                // If selection is collapsed (no text selected), get cursor position differently
                                if (rect.width === 0 && rect.height === 0) {
                                    // Create a temporary span at the cursor position
                                    const tempSpan = document.createElement('span');
                                    tempSpan.textContent = '\u200B'; // Zero-width space
                                    range.insertNode(tempSpan);
                                    rect = tempSpan.getBoundingClientRect();
                                    tempSpan.remove();
                                }

                                // Clean up any previous temp anchor
                                if (tempAnchorRef.current && document.body.contains(tempAnchorRef.current)) {
                                    document.body.removeChild(tempAnchorRef.current);
                                }

                                // Create a temporary anchor element at the selection
                                const tempAnchor = document.createElement('div');
                                tempAnchor.style.position = 'fixed';
                                tempAnchor.style.left = `${rect.left + window.scrollX}px`;
                                tempAnchor.style.top = `${rect.top + window.scrollY}px`;
                                tempAnchor.style.width = `${Math.max(rect.width, 1)}px`;
                                tempAnchor.style.height = `${Math.max(rect.height, 20)}px`;
                                tempAnchor.style.pointerEvents = 'none';
                                document.body.appendChild(tempAnchor);
                                tempAnchorRef.current = tempAnchor;

                                setAnchorElement(tempAnchor);
                                setIsOpen(true);

                                // Focus input after a small delay to ensure popover is rendered
                                setTimeout(() => {
                                    if (inputRef.current) {
                                        inputRef.current.focus();
                                        inputRef.current.select();
                                    }
                                }, 50);
                            }
                        }, 0);
                    }
                });
                return true;
            },
            COMMAND_PRIORITY_LOW
        );
    }, [editor]);

    // Listen for selection changes to detect link clicks
    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
                // Don't auto-open popover on selection change if it's already open
                if (!isOpen) {
                    editor.read(() => {
                        updateLinkEditor();
                    });
                }
                return false;
            },
            COMMAND_PRIORITY_LOW
        );
    }, [editor, updateLinkEditor, isOpen]);

    // Handle save
    const handleSave = () => {
        if (!url.trim()) {
            // If URL is empty, remove the link
            handleRemove();
            return;
        }

        if (!isValidUrl(url)) {
            setUrlError('Please enter a valid URL');
            return;
        }

        setUrlError('');
        const normalizedUrl = normalizeUrl(url);

        editor.update(() => {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, normalizedUrl);
        });
        setIsOpen(false);
    };

    // Handle remove
    const handleRemove = () => {
        editor.update(() => {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        });
        setIsOpen(false);
    };

    // Handle open in new tab
    const handleOpen = () => {
        if (url) {
            const normalizedUrl = normalizeUrl(url);
            window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
            // Return focus to editor
            editor.focus();
        }
    };

    // Prevent clicks inside popover from closing it or affecting editor
    const handlePopoverMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Portal>
                <Popover.Positioner
                    sideOffset={8}
                    side="top"
                    anchor={anchorElement}
                >
                    <Popover.Popup
                        className="w-[360px] p-4 rounded-lg border border-[var(--border-color)] bg-[var(--background)] shadow-lg space-y-3 z-50"
                        onMouseDown={handlePopoverMouseDown}
                    >
                        <Popover.Arrow className="fill-[var(--background)]" />

                        <div className="space-y-2">
                            <label
                                htmlFor="link-url"
                                className="block text-sm font-medium text-[var(--text-color)]"
                            >
                                URL
                            </label>
                            <input
                                ref={inputRef}
                                id="link-url"
                                type="text"
                                value={url}
                                onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
                                onKeyDown={handleKeyDown}
                                placeholder="https://example.com"
                                className={`w-full px-3 py-2 rounded border bg-[var(--background)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-primary ${urlError ? 'border-[#e57373]' : 'border-[var(--border-color)]'}`}
                            />
                            {urlError && (
                                <p className="text-sm text-[#e57373]">{urlError}</p>
                            )}
                        </div>

                        {linkText && (
                            <div className="text-sm text-[var(--text-secondary)]">
                                <span className="font-medium text-[var(--text-color)]">Text:</span> {linkText}
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleRemove}
                                onMouseDown={(e) => e.preventDefault()}
                                className="px-3 py-1.5 rounded text-sm border border-[var(--border-color)] hover:bg-[var(--sidebar-bg)] transition-colors"
                            >
                                Remove
                            </button>
                            <button
                                onClick={handleOpen}
                                onMouseDown={(e) => e.preventDefault()}
                                className="px-3 py-1.5 rounded text-sm border border-[var(--border-color)] hover:bg-[var(--sidebar-bg)] transition-colors"
                            >
                                Open in New Tab
                            </button>
                            <button
                                onClick={handleSave}
                                onMouseDown={(e) => e.preventDefault()}
                                className="ml-auto px-4 py-1.5 rounded text-sm text-white bg-primary hover:opacity-90 transition-opacity"
                            >
                                Save Link
                            </button>
                        </div>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
