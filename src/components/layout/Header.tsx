"use client";

import { useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { FORMAT_TEXT_COMMAND, TextFormatType } from "lexical";
import { Bold, Italic, List, Link as LinkIcon, Settings, Share, AlignJustify, ListOrdered, Eye, Edit3, FileText, FileCode, FileType } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { exportToMarkdown, exportToHTML, exportToPDF } from "@/lib/export";

interface HeaderProps {
    isPreview?: boolean;
    onTogglePreview?: () => void;
}

export function Header({ isPreview, onTogglePreview }: HeaderProps) {
    const [editor] = useLexicalComposerContext();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const formatText = (format: TextFormatType) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    };

    const handleExport = (type: 'md' | 'html' | 'pdf') => {
        editor.read(() => {
            const markdown = $convertToMarkdownString(TRANSFORMERS);
            const title = "Untitled Draft"; // Could be dynamic later

            if (type === 'md') exportToMarkdown(title, markdown);
            if (type === 'html') exportToHTML(title, markdown);
            if (type === 'pdf') exportToPDF(title, markdown);
        });
    };

    const buttonClass = "p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200";

    return (
        <>
            <header className="h-14 flex items-center justify-between px-6 border-b border-neutral-200 dark:border-neutral-800 bg-background-light dark:bg-background-dark w-full z-10">
                <div className="flex items-center gap-6">
                    <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white font-bold text-lg cursor-default">K</div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Untitled draft</span>

                        {!isPreview && (
                            <div className="flex items-center gap-1 h-6 pl-4 border-l border-neutral-200 dark:border-neutral-800">
                                <button onClick={() => formatText("bold")} className={buttonClass} aria-label="Bold">
                                    <Bold className="w-4 h-4" />
                                </button>
                                <button onClick={() => formatText("italic")} className={buttonClass} aria-label="Italic">
                                    <Italic className="w-4 h-4" />
                                </button>
                                <button className={buttonClass} aria-label="Unordered List">
                                    <List className="w-4 h-4" />
                                </button>
                                <button className={buttonClass} aria-label="Link">
                                    <LinkIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {onTogglePreview && (
                        <button
                            onClick={onTogglePreview}
                            className={buttonClass}
                            aria-label={isPreview ? "Edit Mode" : "Preview Mode"}
                            title={isPreview ? "Edit Mode" : "Preview Mode"}
                        >
                            {isPreview ? <Edit3 className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    )}
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-1.5 text-neutral-400 hover:text-primary transition-colors"
                        aria-label="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <button className="px-4 py-1.5 text-xs font-semibold rounded bg-primary text-white hover:opacity-90 transition-opacity flex items-center gap-2 outline-none">
                                <Share className="w-3.5 h-3.5" />
                                Export
                            </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                            <DropdownMenu.Content
                                className="min-w-[160px] bg-white dark:bg-neutral-900 rounded-md p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform] data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade z-50 border border-neutral-200 dark:border-neutral-800"
                                sideOffset={5}
                            >
                                <DropdownMenu.Item
                                    onClick={() => handleExport('md')}
                                    className="group text-[13px] leading-none text-neutral-700 dark:text-neutral-200 rounded-[3px] flex items-center h-[35px] px-[5px] relative select-none outline-none data-[highlighted]:bg-primary data-[highlighted]:text-white cursor-pointer"
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Markdown
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                    onClick={() => handleExport('html')}
                                    className="group text-[13px] leading-none text-neutral-700 dark:text-neutral-200 rounded-[3px] flex items-center h-[35px] px-[5px] relative select-none outline-none data-[highlighted]:bg-primary data-[highlighted]:text-white cursor-pointer"
                                >
                                    <FileCode className="w-4 h-4 mr-2" />
                                    HTML
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                    onClick={() => handleExport('pdf')}
                                    className="group text-[13px] leading-none text-neutral-700 dark:text-neutral-200 rounded-[3px] flex items-center h-[35px] px-[5px] relative select-none outline-none data-[highlighted]:bg-primary data-[highlighted]:text-white cursor-pointer"
                                >
                                    <FileType className="w-4 h-4 mr-2" />
                                    PDF
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                </div>
            </header>

            <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
        </>
    );
}
