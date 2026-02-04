import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { Dispatch, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    $getSelection,
    $isRangeSelection,
    $isNodeSelection,
    $isLineBreakNode,
    BaseSelection,
    CLICK_COMMAND,
    COMMAND_PRIORITY_CRITICAL,
    COMMAND_PRIORITY_HIGH,
    COMMAND_PRIORITY_LOW,
    KEY_ESCAPE_COMMAND,
    LexicalEditor,
    RangeSelection,
    SELECTION_CHANGE_COMMAND,
    ElementNode,
    TextNode,
} from "lexical";
import {
    $isLinkNode,
    $isAutoLinkNode,
    $createLinkNode,
    TOGGLE_LINK_COMMAND,
} from "@lexical/link";
import { $isAtNodeEnd } from "@lexical/selection";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import { normalizeUrl, isValidUrl } from "@/lib/linkUtils";
import { Pencil, Trash2, X, Check } from "lucide-react";

// ── Utilities ──────────────────────────────────────────────────────────────────

function getSelectedNode(selection: RangeSelection): TextNode | ElementNode {
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();
    if (anchorNode === focusNode) return anchorNode;
    const isBackward = selection.isBackward();
    return isBackward
        ? $isAtNodeEnd(focus) ? anchorNode : focusNode
        : $isAtNodeEnd(anchor) ? anchorNode : focusNode;
}

const VERTICAL_GAP = 10;
const HORIZONTAL_OFFSET = 5;

function setFloatingElemPositionForLinkEditor(
    targetRect: DOMRect | null,
    floatingElem: HTMLElement,
    anchorElem: HTMLElement,
    verticalGap: number = VERTICAL_GAP,
    horizontalOffset: number = HORIZONTAL_OFFSET,
): void {
    const scrollerElem = anchorElem.parentElement;

    if (targetRect === null || !scrollerElem) {
        floatingElem.style.opacity = "0";
        floatingElem.style.transform = "translate(-10000px, -10000px)";
        return;
    }

    const floatingElemRect = floatingElem.getBoundingClientRect();
    const anchorElementRect = anchorElem.getBoundingClientRect();
    const editorScrollerRect = scrollerElem.getBoundingClientRect();

    let top = targetRect.top - verticalGap;
    let left = targetRect.left - horizontalOffset;

    if (top < editorScrollerRect.top) {
        top += floatingElemRect.height + targetRect.height + verticalGap * 2;
    }

    if (left + floatingElemRect.width > editorScrollerRect.right) {
        left = editorScrollerRect.right - floatingElemRect.width - horizontalOffset;
    }

    top -= anchorElementRect.top;
    left -= anchorElementRect.left;

    floatingElem.style.opacity = "1";
    floatingElem.style.transform = `translate(${left}px, ${top}px)`;
}

function preventDefault(event: React.MouseEvent | React.KeyboardEvent): void {
    event.preventDefault();
}

// ── FloatingLinkEditor (internal) ──────────────────────────────────────────────

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
    setIsLink: Dispatch<boolean>;
    anchorElem: HTMLElement;
    isLinkEditMode: boolean;
    setIsLinkEditMode: Dispatch<boolean>;
}) {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [linkUrl, setLinkUrl] = useState("");
    const [editedLinkUrl, setEditedLinkUrl] = useState("https://");
    const [lastSelection, setLastSelection] = useState<BaseSelection | null>(null);

    const $updateLinkEditor = useCallback(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
            const node = getSelectedNode(selection);
            const linkParent = $findMatchingParent(node, $isLinkNode);

            if (linkParent) {
                setLinkUrl(linkParent.getURL());
            } else if ($isLinkNode(node)) {
                setLinkUrl(node.getURL());
            } else {
                setLinkUrl("");
            }
            if (isLinkEditMode) {
                setEditedLinkUrl(linkUrl);
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
            const domRect = nativeSelection.focusNode?.parentElement?.getBoundingClientRect();
            if (domRect) {
                domRect.y += 40;
                setFloatingElemPositionForLinkEditor(domRect, editorElem, anchorElem);
            }
            setLastSelection(selection);
        } else if (!activeElement || activeElement.className !== "link-input") {
            if (rootElement !== null) {
                setFloatingElemPositionForLinkEditor(null, editorElem, anchorElem);
            }
            setLastSelection(null);
            setIsLinkEditMode(false);
            setLinkUrl("");
        }

        return true;
    }, [anchorElem, editor, setIsLinkEditMode, isLinkEditMode, linkUrl]);

    // Reposition on scroll & resize
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

    // Core listeners
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
                    return true;
                },
                COMMAND_PRIORITY_LOW,
            ),
            editor.registerCommand(
                KEY_ESCAPE_COMMAND,
                () => {
                    if (isLink) {
                        setIsLink(false);
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH,
            ),
        );
    }, [editor, $updateLinkEditor, setIsLink, isLink]);

    // Initial read
    useEffect(() => {
        editor.getEditorState().read(() => {
            $updateLinkEditor();
        });
    }, [editor, $updateLinkEditor]);

    // Focus input when entering edit mode
    useEffect(() => {
        if (isLinkEditMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isLinkEditMode, isLink]);

    // Close on blur outside
    useEffect(() => {
        const editorElement = editorRef.current;
        if (editorElement === null) return;

        const handleBlur = (event: FocusEvent) => {
            if (!editorElement.contains(event.relatedTarget as Element) && isLink) {
                setIsLink(false);
                setIsLinkEditMode(false);
            }
        };
        editorElement.addEventListener("focusout", handleBlur);
        return () => {
            editorElement.removeEventListener("focusout", handleBlur);
        };
    }, [editorRef, setIsLink, setIsLinkEditMode, isLink]);

    const monitorInputInteraction = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            handleLinkSubmission(event);
        } else if (event.key === "Escape") {
            event.preventDefault();
            setIsLinkEditMode(false);
        }
    };

    const handleLinkSubmission = (
        event: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>,
    ) => {
        event.preventDefault();
        if (lastSelection !== null) {
            if (linkUrl !== "") {
                const normalized = normalizeUrl(editedLinkUrl);
                if (isValidUrl(editedLinkUrl)) {
                    editor.update(() => {
                        editor.dispatchCommand(TOGGLE_LINK_COMMAND, normalized);
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            const parent = getSelectedNode(selection).getParent();
                            if ($isAutoLinkNode(parent)) {
                                const linkNode = $createLinkNode(parent.getURL(), {
                                    rel: parent.__rel,
                                    target: parent.__target,
                                    title: parent.__title,
                                });
                                parent.replace(linkNode, true);
                            }
                        }
                    });
                }
            }
            setEditedLinkUrl("https://");
            setIsLinkEditMode(false);
        }
    };

    const buttonClass =
        "p-1.5 rounded hover:bg-[var(--sidebar-bg)] transition-colors text-[var(--foreground)] opacity-60 hover:opacity-100";

    return (
        <div
            ref={editorRef}
            className="absolute top-0 left-0 z-10 w-full max-w-[400px] opacity-0 will-change-transform"
        >
            {!isLink ? null : isLinkEditMode ? (
                <div className="flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--background)] shadow-lg px-3 py-2">
                    <input
                        ref={inputRef}
                        className="link-input flex-1 min-w-0 px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] text-sm outline-none focus:ring-1 focus:ring-primary"
                        value={editedLinkUrl}
                        onChange={(event) => setEditedLinkUrl(event.target.value)}
                        onKeyDown={monitorInputInteraction}
                        placeholder="https://example.com"
                    />
                    <div className="flex items-center gap-0.5 ml-1">
                        <button
                            type="button"
                            className={buttonClass}
                            tabIndex={0}
                            onMouseDown={preventDefault}
                            onClick={() => setIsLinkEditMode(false)}
                            aria-label="Cancel"
                            title="Cancel"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            className={buttonClass}
                            tabIndex={0}
                            onMouseDown={preventDefault}
                            onClick={handleLinkSubmission}
                            aria-label="Confirm"
                            title="Confirm"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--background)] shadow-lg px-3 py-2">
                    <a
                        href={normalizeUrl(linkUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-0 truncate text-sm text-primary hover:underline"
                    >
                        {linkUrl}
                    </a>
                    <div className="flex items-center gap-0.5 ml-1">
                        <button
                            type="button"
                            className={buttonClass}
                            tabIndex={0}
                            onMouseDown={preventDefault}
                            onClick={() => {
                                setEditedLinkUrl(linkUrl);
                                setIsLinkEditMode(true);
                            }}
                            aria-label="Edit link"
                            title="Edit link"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            className={buttonClass}
                            tabIndex={0}
                            onMouseDown={preventDefault}
                            onClick={() => {
                                editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
                            }}
                            aria-label="Remove link"
                            title="Remove link"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── FloatingLinkEditorPlugin (exported) ────────────────────────────────────────

export function FloatingLinkEditorPlugin({
    anchorElem,
    isLinkEditMode,
    setIsLinkEditMode,
}: {
    anchorElem: HTMLElement;
    isLinkEditMode: boolean;
    setIsLinkEditMode: Dispatch<boolean>;
}): React.ReactPortal | null {
    const [editor] = useLexicalComposerContext();
    const [activeEditor, setActiveEditor] = useState(editor);
    const [isLink, setIsLink] = useState(false);

    useEffect(() => {
        function $updateToolbar() {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                const focusNode = getSelectedNode(selection);
                const focusLinkNode = $findMatchingParent(focusNode, $isLinkNode);
                const focusAutoLinkNode = $findMatchingParent(focusNode, $isAutoLinkNode);

                if (!(focusLinkNode || focusAutoLinkNode)) {
                    setIsLink(false);
                    return;
                }

                const badNode = selection
                    .getNodes()
                    .filter((node) => !$isLineBreakNode(node))
                    .find((node) => {
                        const linkNode = $findMatchingParent(node, $isLinkNode);
                        const autoLinkNode = $findMatchingParent(node, $isAutoLinkNode);
                        return (
                            (focusLinkNode && !focusLinkNode.is(linkNode)) ||
                            (linkNode && !linkNode.is(focusLinkNode)) ||
                            (focusAutoLinkNode && !focusAutoLinkNode.is(autoLinkNode)) ||
                            (autoLinkNode && !autoLinkNode.is(focusAutoLinkNode))
                        );
                    });

                if (!badNode) {
                    setIsLink(true);
                } else {
                    setIsLink(false);
                }
            }
        }

        return mergeRegister(
            editor.registerUpdateListener(({ editorState }) => {
                editorState.read(() => {
                    $updateToolbar();
                });
            }),
            editor.registerCommand(
                SELECTION_CHANGE_COMMAND,
                (_payload, newEditor) => {
                    $updateToolbar();
                    setActiveEditor(newEditor);
                    return false;
                },
                COMMAND_PRIORITY_CRITICAL,
            ),
            editor.registerCommand(
                CLICK_COMMAND,
                (payload) => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        const node = getSelectedNode(selection);
                        const linkNode = $findMatchingParent(node, $isLinkNode);
                        if ($isLinkNode(linkNode) && (payload.metaKey || payload.ctrlKey)) {
                            window.open(linkNode.getURL(), "_blank", "noopener,noreferrer");
                            return true;
                        }
                    }
                    return false;
                },
                COMMAND_PRIORITY_LOW,
            ),
        );
    }, [editor]);

    return createPortal(
        <FloatingLinkEditor
            editor={activeEditor}
            isLink={isLink}
            setIsLink={setIsLink}
            anchorElem={anchorElem}
            isLinkEditMode={isLinkEditMode}
            setIsLinkEditMode={setIsLinkEditMode}
        />,
        anchorElem,
    );
}
