"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    $getSelection,
    $isRangeSelection,
    COMMAND_PRIORITY_HIGH,
    COMMAND_PRIORITY_LOW,
    KEY_ESCAPE_COMMAND,
    SELECTION_CHANGE_COMMAND,
    LexicalEditor,
} from "lexical";
import {
    $isLinkNode,
    $isAutoLinkNode,
    TOGGLE_LINK_COMMAND,
    LinkNode,
} from "@lexical/link";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import { Pencil, Trash2, ExternalLink, Check, X } from "lucide-react";
import { sanitizeUrl } from "@/lib/linkUtils";
import { getSelectedNode } from "@/lib/editorUtils";

function setFloatingElemPositionForLinkEditor(
    targetRect: DOMRect | null,
    floatingElem: HTMLElement,
    anchorElem: HTMLElement
): void {
    if (targetRect === null) {
        floatingElem.style.opacity = "0";
        floatingElem.style.transform = "translate(-10000px, -10000px)";
        return;
    }

    const anchorRect = anchorElem.getBoundingClientRect();
    const floatingRect = floatingElem.getBoundingClientRect();

    let top = targetRect.bottom - anchorRect.top + 8;
    let left = targetRect.left - anchorRect.left;

    // Keep within viewport
    if (left + floatingRect.width > anchorRect.width) {
        left = anchorRect.width - floatingRect.width - 8;
    }
    if (left < 0) {
        left = 8;
    }

    floatingElem.style.opacity = "1";
    floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}

function FloatingLinkEditor({
    editor,
    isLink,
    setIsLink,
    anchorElem,
    isLinkEditMode,
    setIsLinkEditMode,
}: {
    editor: LexicalEditor;
    isLink: boolean;
    setIsLink: (isLink: boolean) => void;
    anchorElem: HTMLElement;
    isLinkEditMode: boolean;
    setIsLinkEditMode: (isLinkEditMode: boolean) => void;
}) {
    const editorRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [linkUrl, setLinkUrl] = useState("");
    const [editedLinkUrl, setEditedLinkUrl] = useState("https://");
    const [lastSelection, setLastSelection] = useState<ReturnType<typeof $getSelection> | null>(null);
    const isLinkEditModeRef = useRef(isLinkEditMode);

    useEffect(() => {
        isLinkEditModeRef.current = isLinkEditMode;
    }, [isLinkEditMode, isLink]);

    const $updateLinkEditor = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            const node = getSelectedNode(selection);
            if (!node) return;
            const linkParent = $findMatchingParent(node, $isLinkNode);

            if (linkParent) {
                setLinkUrl(linkParent.getURL());
            } else if ($isLinkNode(node)) {
                setLinkUrl(node.getURL());
            } else {
                setLinkUrl("");
            }

            if (isLinkEditModeRef.current) {
                setEditedLinkUrl(linkParent?.getURL() || "https://");
            }
        }

        const editorElem = editorRef.current;
        const nativeSelection = window.getSelection();
        const activeElement = document.activeElement;

        if (editorElem === null) return;

        const rootElement = editor.getRootElement();

        if (
            selection !== null &&
            nativeSelection !== null &&
            rootElement !== null &&
            rootElement.contains(nativeSelection.anchorNode) &&
            editor.isEditable()
        ) {
            const domRange = nativeSelection.getRangeAt(0);
            let rect: DOMRect;

            if (nativeSelection.anchorNode === rootElement) {
                let inner = rootElement;
                while (inner.firstElementChild != null) {
                    inner = inner.firstElementChild as HTMLElement;
                }
                rect = inner.getBoundingClientRect();
            } else {
                rect = domRange.getBoundingClientRect();
            }

            setFloatingElemPositionForLinkEditor(rect, editorElem, anchorElem);
            setLastSelection(selection);
        } else if (!activeElement || !(activeElement instanceof HTMLElement && activeElement.classList.contains("link-input"))) {
            if (rootElement !== null) {
                setFloatingElemPositionForLinkEditor(null, editorElem, anchorElem);
            }
            setLastSelection(null);
            setIsLinkEditMode(false);
            setLinkUrl("");
        }
    }, [anchorElem, editor, setIsLinkEditMode]);

    useEffect(() => {
        const scrollerElem = anchorElem.parentElement;

        const update = () => {
            editor.getEditorState().read(() => {
                $updateLinkEditor();
            });
        };

        window.addEventListener("resize", update);
        if (scrollerElem) {
            scrollerElem.addEventListener("scroll", update);
        }

        return () => {
            window.removeEventListener("resize", update);
            if (scrollerElem) {
                scrollerElem.removeEventListener("scroll", update);
            }
        };
    }, [anchorElem.parentElement, editor, $updateLinkEditor]);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    $updateLinkEditor();
                });
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    $updateLinkEditor();
                    return false;
                },
                COMMAND_PRIORITY_LOW
            ),
            editor.registerCommand(
                KEY_ESCAPE_COMMAND,
                () => {
                    if (isLink) {
                        setIsLink(false);
                        setIsLinkEditMode(false);
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            )
        );
    }, [editor, $updateLinkEditor, isLink, setIsLink, setIsLinkEditMode]);

    useEffect(() => {
        if (!isLinkEditMode) return;
        const handle = requestAnimationFrame(() => {
            const input = inputRef.current;
            if (!input) return;
            input.focus({ preventScroll: true });
            input.select();
        });
        return () => cancelAnimationFrame(handle);
    }, [isLinkEditMode]);

    const monitorInputInteraction = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            handleLinkSubmission();
        } else if (event.key === "Escape") {
            event.preventDefault();
            setIsLinkEditMode(false);
        }
    };

    const handleLinkSubmission = () => {
        if (lastSelection !== null) {
            const trimmedUrl = editedLinkUrl.trim();
            if (trimmedUrl !== "" && trimmedUrl !== "https://") {
                editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const node = getSelectedNode(selection);
                        if (!node) return;
                        const linkParent = $findMatchingParent(node, $isLinkNode);
                        // Convert AutoLinkNode to regular LinkNode if needed
                        if ($isAutoLinkNode(linkParent)) {
                            // Remove the AutoLinkNode and replace with a regular LinkNode
                            const children = linkParent.getChildren();
                            const newLinkNode = new LinkNode(sanitizeUrl(trimmedUrl));
                            children.forEach(child => newLinkNode.append(child));
                            linkParent.replace(newLinkNode);
                        } else {
                            editor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl(trimmedUrl));
                        }
                    }
                });
            }
            setEditedLinkUrl("https://");
            setIsLinkEditMode(false);
        }
    };

    const handleLinkRemove = () => {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        setIsLinkEditMode(false);
    };

    return (
        <div
            ref={editorRef}
            className={`link-editor absolute top-0 left-0 z-50 max-w-[400px] w-full opacity-0 transition-opacity ${isLink ? "bg-[var(--background)] border border-[var(--border-color)] rounded-lg shadow-lg" : ""}`}
            onPointerDown={(event) => event.stopPropagation()}
        >
            {!isLink ? null : isLinkEditMode ? (
                <div className="flex items-center gap-1 p-2">
                    <input
                        ref={inputRef}
                        className="link-input flex-1 min-w-0 text-sm px-2 py-1.5 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded text-[var(--foreground)] outline-none focus:border-[var(--color-primary)]"
                        value={editedLinkUrl}
                        onChange={(event) => setEditedLinkUrl(event.target.value)}
                        onKeyDown={monitorInputInteraction}
                        onPointerDown={(event) => event.stopPropagation()}
                        placeholder="https://"
                    />
                    <button
                        type="button"
                        className="p-1.5 rounded hover:bg-[var(--sidebar-bg)] text-[var(--foreground)] opacity-60 hover:opacity-100 transition-colors"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleLinkSubmission}
                        title="Confirm"
                        aria-label="Confirm link"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        className="p-1.5 rounded hover:bg-[var(--sidebar-bg)] text-[var(--foreground)] opacity-60 hover:opacity-100 transition-colors"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setIsLinkEditMode(false)}
                        title="Cancel"
                        aria-label="Cancel edit"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-1 p-2">
                    <a
                        href={sanitizeUrl(linkUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-0 text-sm text-[var(--color-primary)] truncate hover:underline px-2 py-1"
                    >
                        {linkUrl}
                    </a>
                    <button
                        type="button"
                        className="p-1.5 rounded hover:bg-[var(--sidebar-bg)] text-[var(--foreground)] opacity-60 hover:opacity-100 transition-colors"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                            setEditedLinkUrl(linkUrl);
                            setIsLinkEditMode(true);
                        }}
                        title="Edit link"
                        aria-label="Edit link"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <a
                        href={sanitizeUrl(linkUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-[var(--sidebar-bg)] text-[var(--foreground)] opacity-60 hover:opacity-100 transition-colors"
                        title="Open link"
                        aria-label="Open link in new tab"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                        type="button"
                        className="p-1.5 rounded hover:bg-[var(--sidebar-bg)] text-red-500 opacity-60 hover:opacity-100 transition-colors"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={handleLinkRemove}
                        title="Remove link"
                        aria-label="Remove link"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function FloatingLinkEditorPlugin({
    anchorElem,
    isLinkEditMode,
    setIsLinkEditMode,
}: {
    anchorElem?: HTMLElement;
    isLinkEditMode: boolean;
    setIsLinkEditMode: (isLinkEditMode: boolean) => void;
}) {
    const [editor] = useLexicalComposerContext();
    const [isLink, setIsLink] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const node = getSelectedNode(selection);
                        if (!node) return;
                        const linkParent = $findMatchingParent(node, $isLinkNode);
                        setIsLink(linkParent != null || $isLinkNode(node));
                    }
                });
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                () => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const node = getSelectedNode(selection);
                        if (!node) return false;
                        const linkParent = $findMatchingParent(node, $isLinkNode);
                        setIsLink(linkParent != null || $isLinkNode(node));
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    if (!mounted) return null;

    const resolvedAnchor = anchorElem || document.body;

    return createPortal(
        <FloatingLinkEditor
            editor={editor}
            isLink={isLink}
            setIsLink={setIsLink}
            anchorElem={resolvedAnchor}
            isLinkEditMode={isLinkEditMode}
            setIsLinkEditMode={setIsLinkEditMode}
        />,
        resolvedAnchor
    );
}
