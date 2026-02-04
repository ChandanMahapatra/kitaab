"use client";

import { useCallback, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    $getSelection,
    $isRangeSelection,
    $isRootOrShadowRoot,
    $createParagraphNode,
    CAN_REDO_COMMAND,
    CAN_UNDO_COMMAND,
    COMMAND_PRIORITY_CRITICAL,
    FORMAT_TEXT_COMMAND,
    FORMAT_ELEMENT_COMMAND,
    INDENT_CONTENT_COMMAND,
    OUTDENT_CONTENT_COMMAND,
    UNDO_COMMAND,
    REDO_COMMAND,
    SELECTION_CHANGE_COMMAND,
    ElementFormatType,
    $isElementNode,
    $isTextNode,
} from "lexical";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $isListNode, ListNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_CHECK_LIST_COMMAND } from "@lexical/list";
import { $isHeadingNode, $createHeadingNode, $createQuoteNode, HeadingTagType, $isQuoteNode } from "@lexical/rich-text";
import { $isCodeNode, $createCodeNode } from "@lexical/code";
import { $setBlocksType } from "@lexical/selection";
import { $patchStyleText, $getSelectionStyleValueForProperty } from "@lexical/selection";
import { $findMatchingParent, $getNearestNodeOfType } from "@lexical/utils";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
    Undo2,
    Redo2,
    ChevronDown,
    Bold,
    Italic,
    Underline,
    Code,
    Link2,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Type,
    Minus,
    Plus,
    Strikethrough,
    Subscript,
    Superscript,
    RemoveFormatting,
    List,
    ListOrdered,
    ListChecks,
    Heading1,
    Heading2,
    Heading3,
    Quote,
    Code2,
    Pilcrow,
    IndentIncrease,
    IndentDecrease,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSelectedNode } from "@/lib/editorUtils";

// Font families organized by category
const FONT_FAMILIES = [
    { label: "Mono", fonts: ["Space Mono", "Inconsolata", "Roboto Mono", "IBM Plex Mono"] },
    { label: "Sans", fonts: ["Inter", "Roboto", "Fira Sans", "Lato", "Karla", "Manrope"] },
    { label: "Serif", fonts: ["Libre Baskerville", "Merriweather", "Neuton", "Cardo"] },
];

const ALL_FONTS = FONT_FAMILIES.flatMap(g => g.fonts);

// Font size constants
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 72;
const DEFAULT_FONT_SIZE = 15;

// Block type labels and icons
const BLOCK_TYPE_TO_LABEL: Record<string, { label: string; icon: React.ReactNode }> = {
    paragraph: { label: "Normal", icon: <Pilcrow className="w-4 h-4" /> },
    h1: { label: "Heading 1", icon: <Heading1 className="w-4 h-4" /> },
    h2: { label: "Heading 2", icon: <Heading2 className="w-4 h-4" /> },
    h3: { label: "Heading 3", icon: <Heading3 className="w-4 h-4" /> },
    bullet: { label: "Bulleted List", icon: <List className="w-4 h-4" /> },
    number: { label: "Numbered List", icon: <ListOrdered className="w-4 h-4" /> },
    check: { label: "Check List", icon: <ListChecks className="w-4 h-4" /> },
    quote: { label: "Quote", icon: <Quote className="w-4 h-4" /> },
    code: { label: "Code Block", icon: <Code2 className="w-4 h-4" /> },
};

const ELEMENT_FORMAT_OPTIONS: Record<string, { icon: React.ReactNode; label: string }> = {
    left: { icon: <AlignLeft className="w-4 h-4" />, label: "Left Align" },
    center: { icon: <AlignCenter className="w-4 h-4" />, label: "Center Align" },
    right: { icon: <AlignRight className="w-4 h-4" />, label: "Right Align" },
    justify: { icon: <AlignJustify className="w-4 h-4" />, label: "Justify Align" },
};

function calculateNextFontSize(currentSize: number, isIncrement: boolean): number {
    if (isIncrement) {
        if (currentSize < 12) return currentSize + 1;
        if (currentSize < 20) return currentSize + 2;
        if (currentSize < 36) return currentSize + 4;
        if (currentSize <= 60) return currentSize + 12;
        return MAX_FONT_SIZE;
    } else {
        if (currentSize > 48) return currentSize - 12;
        if (currentSize > 24) return currentSize - 4;
        if (currentSize > 14) return currentSize - 2;
        if (currentSize > 9) return currentSize - 1;
        return MIN_FONT_SIZE;
    }
}

// Divider between toolbar sections
function Divider() {
    return <div className="w-px h-6 bg-[var(--border-color)] mx-1 shrink-0" />;
}

interface ToolbarPluginProps {
    setIsLinkEditMode: (isLinkEditMode: boolean) => void;
}

export default function ToolbarPlugin({ setIsLinkEditMode }: ToolbarPluginProps) {
    const [editor] = useLexicalComposerContext();

    // Toolbar state
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [blockType, setBlockType] = useState("paragraph");
    const [fontFamily, setFontFamily] = useState("");
    const [fontSize, setFontSize] = useState("15");
    const [fontSizeInput, setFontSizeInput] = useState("15");
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isCode, setIsCode] = useState(false);
    const [isLink, setIsLink] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isSubscript, setIsSubscript] = useState(false);
    const [isSuperscript, setIsSuperscript] = useState(false);
    const [elementFormat, setElementFormat] = useState<ElementFormatType>("left");
    const [isEditable, setIsEditable] = useState(() => editor.isEditable());

    const $updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            // Block type
            const anchorNode = selection.anchor.getNode();
            let element =
                anchorNode.getKey() === "root"
                    ? anchorNode
                    : $findMatchingParent(anchorNode, (e) => {
                        const parent = e.getParent();
                        return parent !== null && $isRootOrShadowRoot(parent);
                    });
            if (element === null) {
                element = anchorNode.getTopLevelElementOrThrow();
            }

            if ($isListNode(element)) {
                const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
                const type = parentList ? parentList.getListType() : element.getListType();
                setBlockType(type);
            } else if ($isHeadingNode(element)) {
                const tag = element.getTag();
                setBlockType(tag);
            } else if ($isCodeNode(element)) {
                setBlockType("code");
            } else if ($isQuoteNode(element)) {
                setBlockType("quote");
            } else {
                setBlockType("paragraph");
            }

            // Text formats
            setIsBold(selection.hasFormat("bold"));
            setIsItalic(selection.hasFormat("italic"));
            setIsUnderline(selection.hasFormat("underline"));
            setIsStrikethrough(selection.hasFormat("strikethrough"));
            setIsCode(selection.hasFormat("code"));
            setIsSubscript(selection.hasFormat("subscript"));
            setIsSuperscript(selection.hasFormat("superscript"));

            // Link
            const node = getSelectedNode(selection);
            const parent = node?.getParent();
            setIsLink($isLinkNode(parent) || $isLinkNode(node));

            // Font family
            const family = $getSelectionStyleValueForProperty(selection, "font-family", "");
            setFontFamily(family);

            // Font size
            const size = $getSelectionStyleValueForProperty(selection, "font-size", `${DEFAULT_FONT_SIZE}px`);
            const sizeNum = size.replace("px", "");
            setFontSize(sizeNum);
            setFontSizeInput(sizeNum);

            // Element format
            if (node) {
                const elementNode = $findMatchingParent(
                    node,
                    (parentNode) => $isElementNode(parentNode) && !parentNode.isInline()
                );
                if ($isElementNode(elementNode)) {
                    setElementFormat(elementNode.getFormatType());
                } else if ($isElementNode(node) && !node.isInline()) {
                    setElementFormat(node.getFormatType());
                } else {
                    setElementFormat("left");
                }
            }
        }
    }, []);

    useEffect(() => {
        return editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
                $updateToolbar();
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
    }, [editor, $updateToolbar]);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                $updateToolbar();
            });
        });
    }, [editor, $updateToolbar]);

    useEffect(() => {
        return editor.registerCommand(
            CAN_UNDO_COMMAND,
            (payload) => {
                setCanUndo(payload);
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
    }, [editor]);

    useEffect(() => {
        return editor.registerCommand(
            CAN_REDO_COMMAND,
            (payload) => {
                setCanRedo(payload);
                return false;
            },
            COMMAND_PRIORITY_CRITICAL
        );
    }, [editor]);

    useEffect(() => {
        return editor.registerEditableListener((editable) => {
            setIsEditable(editable);
        });
    }, [editor]);

    // Block format handlers
    const formatParagraph = () => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createParagraphNode());
            }
        });
    };

    const formatHeading = (headingSize: HeadingTagType) => {
        if (blockType !== headingSize) {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createHeadingNode(headingSize));
                }
            });
        }
    };

    const formatBulletList = () => {
        if (blockType !== "bullet") {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        } else {
            formatParagraph();
        }
    };

    const formatNumberedList = () => {
        if (blockType !== "number") {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        } else {
            formatParagraph();
        }
    };

    const formatCheckList = () => {
        if (blockType !== "check") {
            editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
        } else {
            formatParagraph();
        }
    };

    const formatQuote = () => {
        if (blockType !== "quote") {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createQuoteNode());
                }
            });
        }
    };

    const formatCode = () => {
        if (blockType !== "code") {
            editor.update(() => {
                let selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    if (selection.isCollapsed()) {
                        $setBlocksType(selection, () => $createCodeNode());
                    } else {
                        const textContent = selection.getTextContent();
                        const codeNode = $createCodeNode();
                        selection.insertNodes([codeNode]);
                        selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            selection.insertRawText(textContent);
                        }
                    }
                }
            });
        }
    };

    // Font family handler
    const onFontFamilySelect = (family: string) => {
        editor.update(() => {
            const selection = $getSelection();
            if (selection !== null) {
                $patchStyleText(selection, { "font-family": family });
            }
        });
    };

    // Font size handlers
    const updateFontSizeInEditor = (newSize: number) => {
        const clamped = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, newSize));
        editor.update(() => {
            const selection = $getSelection();
            if (selection !== null) {
                $patchStyleText(selection, { "font-size": `${clamped}px` });
            }
        });
        setFontSizeInput(String(clamped));
    };

    const handleFontSizeIncrement = () => {
        const current = Number(fontSizeInput) || DEFAULT_FONT_SIZE;
        const next = calculateNextFontSize(current, true);
        updateFontSizeInEditor(next);
    };

    const handleFontSizeDecrement = () => {
        const current = Number(fontSizeInput) || DEFAULT_FONT_SIZE;
        const next = calculateNextFontSize(current, false);
        updateFontSizeInEditor(next);
    };

    const handleFontSizeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const val = Number(fontSizeInput);
            if (!isNaN(val) && val > 0) {
                updateFontSizeInEditor(val);
            }
            (e.target as HTMLInputElement).blur();
        }
    };

    const handleFontSizeBlur = () => {
        const val = Number(fontSizeInput);
        if (!isNaN(val) && val > 0) {
            updateFontSizeInEditor(val);
        } else {
            setFontSizeInput(fontSize);
        }
    };

    // Link handler
    const insertLink = useCallback(() => {
        if (!isLink) {
            setIsLinkEditMode(true);
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
        } else {
            setIsLinkEditMode(false);
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        }
    }, [editor, isLink, setIsLinkEditMode]);

    // Clear formatting
    const clearFormatting = useCallback(() => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                const anchor = selection.anchor;
                const focus = selection.focus;
                const nodes = selection.getNodes();

                if (anchor.key === focus.key && anchor.offset === focus.offset) {
                    return;
                }

                nodes.forEach((node) => {
                    if ($isTextNode(node)) {
                        let textNode = node;
                        if (textNode.__style !== "") {
                            textNode = textNode.setStyle("");
                        }
                        if (textNode.__format !== 0) {
                            textNode = textNode.setFormat(0);
                        }
                        if (textNode !== node) {
                            node.replace(textNode);
                        }
                    }
                });
            }
        });
    }, [editor]);

    const btnClass =
        "p-1.5 rounded hover:bg-[var(--sidebar-bg)] transition-colors text-[var(--foreground)] opacity-60 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0";
    const btnActiveClass = "!opacity-100 bg-[var(--sidebar-bg)]";

    const dropdownContentClass =
        "min-w-[160px] bg-[var(--background)] border border-[var(--border-color)] rounded-md p-1 shadow-lg z-50 text-[var(--foreground)] max-h-80 overflow-y-auto";
    const dropdownItemClass =
        "text-[13px] leading-none text-[var(--foreground)] rounded-[3px] flex items-center h-[32px] px-2 gap-2 relative select-none outline-none data-[highlighted]:bg-[var(--color-primary)] data-[highlighted]:text-white cursor-pointer";

    const blockInfo = BLOCK_TYPE_TO_LABEL[blockType] || BLOCK_TYPE_TO_LABEL.paragraph;
    const alignInfo = ELEMENT_FORMAT_OPTIONS[elementFormat] || ELEMENT_FORMAT_OPTIONS.left;
    const displayFontFamily = fontFamily ? fontFamily.replace(/"/g, "").split(",")[0].trim() : "";

    return (
        <div className="flex items-center gap-0.5 px-3 h-10 border-b border-[var(--border-color)] bg-[var(--background)] w-full z-10 transition-colors duration-300 overflow-x-auto flex-nowrap scrollbar-thin">
            {/* Undo / Redo */}
            <button
                type="button"
                disabled={!canUndo || !isEditable}
                onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
                className={btnClass}
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
            >
                <Undo2 className="w-4 h-4" />
            </button>
            <button
                type="button"
                disabled={!canRedo || !isEditable}
                onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
                className={btnClass}
                aria-label="Redo"
                title="Redo (Ctrl+Y)"
            >
                <Redo2 className="w-4 h-4" />
            </button>

            <Divider />

            {/* Block format dropdown */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        type="button"
                        disabled={!isEditable}
                        className={cn(btnClass, "flex items-center gap-1 px-2 min-w-[130px]")}
                        aria-label="Block format"
                    >
                        {blockInfo.icon}
                        <span className="text-[13px] truncate">{blockInfo.label}</span>
                        <ChevronDown className="w-3 h-3 ml-auto shrink-0" />
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={dropdownContentClass} sideOffset={5}>
                        <DropdownMenu.Item className={dropdownItemClass} onSelect={formatParagraph}>
                            <Pilcrow className="w-4 h-4" /> Normal
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={dropdownItemClass} onSelect={() => formatHeading("h1")}>
                            <Heading1 className="w-4 h-4" /> Heading 1
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={dropdownItemClass} onSelect={() => formatHeading("h2")}>
                            <Heading2 className="w-4 h-4" /> Heading 2
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={dropdownItemClass} onSelect={() => formatHeading("h3")}>
                            <Heading3 className="w-4 h-4" /> Heading 3
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-px bg-[var(--border-color)] my-1" />
                        <DropdownMenu.Item className={dropdownItemClass} onSelect={formatBulletList}>
                            <List className="w-4 h-4" /> Bulleted List
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={dropdownItemClass} onSelect={formatNumberedList}>
                            <ListOrdered className="w-4 h-4" /> Numbered List
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={dropdownItemClass} onSelect={formatCheckList}>
                            <ListChecks className="w-4 h-4" /> Check List
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-px bg-[var(--border-color)] my-1" />
                        <DropdownMenu.Item className={dropdownItemClass} onSelect={formatQuote}>
                            <Quote className="w-4 h-4" /> Quote
                        </DropdownMenu.Item>
                        <DropdownMenu.Item className={dropdownItemClass} onSelect={formatCode}>
                            <Code2 className="w-4 h-4" /> Code Block
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <Divider />

            {/* Font family */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        type="button"
                        disabled={!isEditable}
                        className={cn(btnClass, "flex items-center gap-1 px-2")}
                        aria-label="Font family"
                    >
                        <Type className="w-4 h-4 shrink-0" />
                        <span className="text-[13px] truncate max-w-[80px]">{displayFontFamily || "Font"}</span>
                        <ChevronDown className="w-3 h-3 shrink-0" />
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={cn(dropdownContentClass, "min-w-[180px]")} sideOffset={5}>
                        {FONT_FAMILIES.map((group) => (
                            <DropdownMenu.Group key={group.label}>
                                <DropdownMenu.Label className="text-[10px] uppercase tracking-wider font-semibold opacity-40 px-2 py-1.5">
                                    {group.label}
                                </DropdownMenu.Label>
                                {group.fonts.map((font) => (
                                    <DropdownMenu.Item
                                        key={font}
                                        className={dropdownItemClass}
                                        onSelect={() => onFontFamilySelect(font)}
                                    >
                                        <span style={{ fontFamily: font }}>{font}</span>
                                    </DropdownMenu.Item>
                                ))}
                            </DropdownMenu.Group>
                        ))}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <Divider />

            {/* Font size */}
            <button
                type="button"
                disabled={!isEditable || Number(fontSizeInput) <= MIN_FONT_SIZE}
                onClick={handleFontSizeDecrement}
                className={cn(btnClass, "px-1")}
                aria-label="Decrease font size"
                title="Decrease font size"
            >
                <Minus className="w-3.5 h-3.5" />
            </button>
            <input
                type="text"
                inputMode="numeric"
                value={fontSizeInput}
                disabled={!isEditable}
                onChange={(e) => setFontSizeInput(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={handleFontSizeKeyDown}
                onBlur={handleFontSizeBlur}
                className="w-8 h-7 text-center text-[13px] bg-transparent border border-[var(--border-color)] rounded text-[var(--foreground)] outline-none focus:border-[var(--color-primary)] shrink-0"
                title="Font size"
            />
            <button
                type="button"
                disabled={!isEditable || Number(fontSizeInput) >= MAX_FONT_SIZE}
                onClick={handleFontSizeIncrement}
                className={cn(btnClass, "px-1")}
                aria-label="Increase font size"
                title="Increase font size"
            >
                <Plus className="w-3.5 h-3.5" />
            </button>

            <Divider />

            {/* Text formatting: Bold, Italic, Underline */}
            <button
                type="button"
                disabled={!isEditable}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
                className={cn(btnClass, isBold && btnActiveClass)}
                aria-label="Bold"
                title="Bold (Ctrl+B)"
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                type="button"
                disabled={!isEditable}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
                className={cn(btnClass, isItalic && btnActiveClass)}
                aria-label="Italic"
                title="Italic (Ctrl+I)"
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                type="button"
                disabled={!isEditable}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
                className={cn(btnClass, isUnderline && btnActiveClass)}
                aria-label="Underline"
                title="Underline (Ctrl+U)"
            >
                <Underline className="w-4 h-4" />
            </button>

            <Divider />

            {/* Code */}
            <button
                type="button"
                disabled={!isEditable}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
                className={cn(btnClass, isCode && btnActiveClass)}
                aria-label="Inline code"
                title="Code"
            >
                <Code className="w-4 h-4" />
            </button>

            {/* Link */}
            <button
                type="button"
                disabled={!isEditable}
                onClick={insertLink}
                className={cn(btnClass, isLink && btnActiveClass)}
                aria-label="Insert link"
                title="Insert link (Ctrl+K)"
            >
                <Link2 className="w-4 h-4" />
            </button>

            <Divider />

            {/* Alignment dropdown */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        type="button"
                        disabled={!isEditable}
                        className={cn(btnClass, "flex items-center gap-0.5 px-1.5")}
                        aria-label="Text alignment"
                    >
                        {alignInfo.icon}
                        <ChevronDown className="w-3 h-3 shrink-0" />
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={dropdownContentClass} sideOffset={5}>
                        {(Object.entries(ELEMENT_FORMAT_OPTIONS) as [ElementFormatType, { icon: React.ReactNode; label: string }][]).map(
                            ([format, info]) => (
                                <DropdownMenu.Item
                                    key={format}
                                    className={dropdownItemClass}
                                    onSelect={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format)}
                                >
                                    {info.icon}
                                    {info.label}
                                </DropdownMenu.Item>
                            )
                        )}
                        <DropdownMenu.Separator className="h-px bg-[var(--border-color)] my-1" />
                        <DropdownMenu.Item
                            className={dropdownItemClass}
                            onSelect={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}
                        >
                            <IndentIncrease className="w-4 h-4" />
                            Indent
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                            className={dropdownItemClass}
                            onSelect={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}
                        >
                            <IndentDecrease className="w-4 h-4" />
                            Outdent
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <Divider />

            {/* More formatting (Aa dropdown) */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        type="button"
                        disabled={!isEditable}
                        className={cn(btnClass, "flex items-center gap-0.5 px-1.5")}
                        aria-label="More formatting"
                    >
                        <span className="text-[13px] font-semibold">Aa</span>
                        <ChevronDown className="w-3 h-3 shrink-0" />
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={dropdownContentClass} sideOffset={5}>
                        <DropdownMenu.Item
                            className={cn(dropdownItemClass, isStrikethrough && "bg-[var(--sidebar-bg)]")}
                            onSelect={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
                        >
                            <Strikethrough className="w-4 h-4" />
                            Strikethrough
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                            className={cn(dropdownItemClass, isSubscript && "bg-[var(--sidebar-bg)]")}
                            onSelect={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript")}
                        >
                            <Subscript className="w-4 h-4" />
                            Subscript
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                            className={cn(dropdownItemClass, isSuperscript && "bg-[var(--sidebar-bg)]")}
                            onSelect={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript")}
                        >
                            <Superscript className="w-4 h-4" />
                            Superscript
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-px bg-[var(--border-color)] my-1" />
                        <DropdownMenu.Item className={dropdownItemClass} onSelect={clearFormatting}>
                            <RemoveFormatting className="w-4 h-4" />
                            Clear Formatting
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </div>
    );
}
