
import { useState, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { FORMAT_TEXT_COMMAND, TextFormatType } from "lexical";
import { Bold, Italic, List, Link as LinkIcon, Settings, Share, Palette, FileText, FileCode, FileType, Check } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { exportToMarkdown, exportToHTML, exportToPDF } from "@/lib/export";
import { INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";

interface HeaderProps {
    title?: string;
    setTitle?: (title: string) => void;
}

type Theme = 'light' | 'dark' | 'sepia' | 'grey';

export function Header({ title = "Untitled", setTitle }: HeaderProps) {
    const [editor] = useLexicalComposerContext();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, setTheme] = useState<Theme>('light');

    const applyTheme = (t: Theme) => {
        const root = document.documentElement;
        root.removeAttribute('data-theme');
        root.classList.remove('dark');
        root.setAttribute('data-theme', t);
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem('kitaab-theme') as Theme || 'light';
        setTheme(savedTheme);
        applyTheme(savedTheme);
    }, []);

    const handleThemeChange = (t: Theme) => {
        setTheme(t);
        localStorage.setItem('kitaab-theme', t);
        applyTheme(t);
    };

    const formatText = (format: TextFormatType) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    };

    const insertLink = () => {
        const url = prompt("Enter URL:", "https://");
        if (url) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
        }
    };

    const insertList = () => {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    };

    const handleExport = (type: 'md' | 'html' | 'pdf') => {
        editor.read(() => {
            const markdown = $convertToMarkdownString(TRANSFORMERS);
            if (type === 'md') exportToMarkdown(title, markdown);
            if (type === 'html') exportToHTML(title, markdown);
            if (type === 'pdf') exportToPDF(title, markdown);
        });
    };

    const buttonClass = "p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 outline-none focus-visible:ring-2 focus-visible:ring-primary";

    const themeButtonClass = "px-4 py-1.5 text-xs font-semibold border border-[var(--border-color)] text-[var(--foreground)] bg-transparent hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:text-white rounded transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none flex items-center gap-2";

    return (
        <>
            <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--background)] w-full z-10 transition-colors duration-300">
                <div className="flex items-center gap-6">
                    <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white font-bold text-lg cursor-default shadow-sm">K</div>

                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle?.(e.target.value)}
                            className="text-sm font-medium text-[var(--foreground)] bg-transparent border-none outline-none hover:opacity-70 transition-opacity w-48 placeholder-neutral-400"
                            placeholder="Untitled draft"
                        />

                        <div className="flex items-center gap-1 h-6 pl-4 border-l border-[var(--border-color)]">
                            <button type="button" onClick={() => formatText("bold")} className={buttonClass} aria-label="Bold">
                                <Bold className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => formatText("italic")} className={buttonClass} aria-label="Italic">
                                <Italic className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={insertList} className={buttonClass} aria-label="Unordered List">
                                <List className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={insertLink} className={buttonClass} aria-label="Link">
                                <LinkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <button className={themeButtonClass} aria-label="Change Theme">
                                <Palette className="w-3.5 h-3.5" />
                                {theme.charAt(0).toUpperCase() + theme.slice(1)}
                            </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                            <DropdownMenu.Content
                                className="min-w-[140px] bg-[var(--background)] border border-[var(--border-color)] rounded-md shadow-lg p-1 z-50 text-[var(--foreground)]"
                                sideOffset={5}
                            >
                                {(['light', 'dark', 'sepia', 'grey'] as Theme[]).map((t) => (
                                    <DropdownMenu.Item
                                        key={t}
                                        onSelect={() => handleThemeChange(t)}
                                        className="flex items-center justify-between px-3 py-2 text-sm outline-none cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded capitalize"
                                    >
                                        <span>{t}</span>
                                        {theme === t && <Check className="w-3 h-3" />}
                                    </DropdownMenu.Item>
                                ))}
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className={buttonClass}
                        aria-label="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <button className={themeButtonClass}>
                                <Share className="w-3.5 h-3.5" />
                                Export
                            </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                            <DropdownMenu.Content
                                className="min-w-[160px] bg-[var(--background)] border border-[var(--border-color)] rounded-md p-1 shadow-lg z-50"
                                sideOffset={5}
                            >
                                <DropdownMenu.Item
                                    onClick={() => handleExport('md')}
                                    className="group text-[13px] leading-none text-[var(--foreground)] rounded-[3px] flex items-center h-[35px] px-[5px] relative select-none outline-none data-[highlighted]:bg-primary data-[highlighted]:text-white cursor-pointer"
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Markdown
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                    onClick={() => handleExport('html')}
                                    className="group text-[13px] leading-none text-[var(--foreground)] rounded-[3px] flex items-center h-[35px] px-[5px] relative select-none outline-none data-[highlighted]:bg-primary data-[highlighted]:text-white cursor-pointer"
                                >
                                    <FileCode className="w-4 h-4 mr-2" />
                                    HTML
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                    onClick={() => handleExport('pdf')}
                                    className="group text-[13px] leading-none text-[var(--foreground)] rounded-[3px] flex items-center h-[35px] px-[5px] relative select-none outline-none data-[highlighted]:bg-primary data-[highlighted]:text-white cursor-pointer"
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
