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
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    const selectedText = selection.getTextContent();
                    setUrl('');
                    setUrlError('');
                    setLinkText(selectedText);

                    // Get the selection's DOM range for positioning
                    const nativeSelection = window.getSelection();
                    if (nativeSelection && nativeSelection.rangeCount > 0) {
                        const range = nativeSelection.getRangeAt(0);
                        const rect = range.getBoundingClientRect();

                        // Clean up any previous temp anchor
                        if (tempAnchorRef.current && document.body.contains(tempAnchorRef.current)) {
                            document.body.removeChild(tempAnchorRef.current);
                        }

                        // Create a temporary anchor element at the selection
                        const tempAnchor = document.createElement('span');
                        tempAnchor.style.position = 'absolute';
                        tempAnchor.style.left = `${rect.left}px`;
                        tempAnchor.style.top = `${rect.top}px`;
                        document.body.appendChild(tempAnchor);
                        tempAnchorRef.current = tempAnchor;

                        setAnchorElement(tempAnchor);
                        setIsOpen(true);
                    }
                }
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
                editor.read(() => {
                    updateLinkEditor();
                });
                return false;
            },
            COMMAND_PRIORITY_LOW
        );
    }, [editor, updateLinkEditor]);

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

        editor.dispatchCommand(TOGGLE_LINK_COMMAND, normalizedUrl);
        setIsOpen(false);
    };

    // Handle remove
    const handleRemove = () => {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
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
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
        }
    };

    // Auto-focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isOpen]);

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
                                className="px-3 py-1.5 rounded text-sm border border-[var(--border-color)] hover:bg-[var(--sidebar-bg)] transition-colors"
                            >
                                Remove
                            </button>
                            <button
                                onClick={handleOpen}
                                className="px-3 py-1.5 rounded text-sm border border-[var(--border-color)] hover:bg-[var(--sidebar-bg)] transition-colors"
                            >
                                Open in New Tab
                            </button>
                            <button
                                onClick={handleSave}
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
