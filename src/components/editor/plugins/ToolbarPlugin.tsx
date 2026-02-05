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
    UNDO_COMMAND,
    REDO_COMMAND,
    SELECTION_CHANGE_COMMAND,
} from "lexical";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $isListNode, ListNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_CHECK_LIST_COMMAND } from "@lexical/list";
import { $isHeadingNode, $createHeadingNode, $createQuoteNode, HeadingTagType, $isQuoteNode } from "@lexical/rich-text";
import { $isCodeNode, $createCodeNode } from "@lexical/code";
import { $setBlocksType } from "@lexical/selection";
import { $patchStyleText, $getSelectionStyleValueForProperty } from "@lexical/selection";
import { $findMatchingParent, $getNearestNodeOfType } from "@lexical/utils";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
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
    Type,
    Strikethrough,
    Minus,
    List,
    ListOrdered,
    ListChecks,
    Heading1,
    Heading2,
    Heading3,
    Quote,
    Code2,
    Pilcrow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSelectedNode } from "@/lib/editorUtils";

// Font families organized by category
const FONT_FAMILIES = [
    { label: "Mono", fonts: ["Space Mono", "Inconsolata", "Roboto Mono", "IBM Plex Mono"] },
    { label: "Sans", fonts: ["Inter", "Roboto", "Fira Sans", "Lato", "Karla", "Manrope"] },
    { label: "Serif", fonts: ["Libre Baskerville", "Merriweather", "Neuton", "Cardo"] },
];

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
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isCode, setIsCode] = useState(false);
    const [isLink, setIsLink] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
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

            // Link
            const node = getSelectedNode(selection);
            const parent = node?.getParent();
            setIsLink($isLinkNode(parent) || $isLinkNode(node));

            // Font family
            const family = $getSelectionStyleValueForProperty(selection, "font-family", "");
            setFontFamily(family);
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

    const btnClass =
        "p-1.5 rounded hover:bg-[var(--sidebar-bg)] transition-colors text-[var(--foreground)] opacity-60 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0";
    const btnActiveClass = "!opacity-100 bg-[var(--sidebar-bg)]";

    const dropdownContentClass =
        "min-w-[160px] bg-[var(--background)] border border-[var(--border-color)] rounded-md p-1 shadow-lg z-50 text-[var(--foreground)] max-h-80 overflow-y-auto";
    const dropdownItemClass =
        "text-[13px] leading-none text-[var(--foreground)] rounded-[3px] flex items-center h-[32px] px-2 gap-2 relative select-none outline-none data-[highlighted]:bg-[var(--color-primary)] data-[highlighted]:text-white cursor-pointer";

    const blockInfo = BLOCK_TYPE_TO_LABEL[blockType] || BLOCK_TYPE_TO_LABEL.paragraph;
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

            {/* Text formatting: Bold, Italic, Underline, Strikethrough */}
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
            <button
                type="button"
                disabled={!isEditable}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
                className={cn(btnClass, isStrikethrough && btnActiveClass)}
                aria-label="Strikethrough"
                title="Strikethrough"
            >
                <Strikethrough className="w-4 h-4" />
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

            {/* Horizontal Rule */}
            <button
                type="button"
                disabled={!isEditable}
                onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}
                className={btnClass}
                aria-label="Insert horizontal rule"
                title="Horizontal rule (---)"
            >
                <Minus className="w-4 h-4" />
            </button>
        </div>
    );
}
