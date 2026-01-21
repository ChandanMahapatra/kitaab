
import { useState, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { FORMAT_TEXT_COMMAND, TextFormatType } from "lexical";
import { Bold, Italic, List, Link as LinkIcon, Settings, Share, AlignJustify, ListOrdered, Palette, FileText, FileCode, FileType, Check } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { exportToMarkdown, exportToHTML, exportToPDF } from "@/lib/export";

interface HeaderProps {
    title?: string;
    setTitle?: (title: string) => void;
}

type Theme = 'default' | 'sepia' | 'grey';

export function Header({ title = "Untitled", setTitle }: HeaderProps) {
    const [editor] = useLexicalComposerContext();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, setTheme] = useState<Theme>('default');
    const [isDark, setIsDark] = useState(false); // Only valid for 'default' and 'grey'

    useEffect(() => {
        // Load persist
        const savedTheme = localStorage.getItem('kitaab-theme') as Theme || 'default';
        const savedDark = localStorage.getItem('kitaab-dark') === 'true';

        setTheme(savedTheme);
        setIsDark(savedDark);

        // Apply
        applyTheme(savedTheme, savedDark);
    }, []);

    const applyTheme = (t: Theme, d: boolean) => {
        const root = document.documentElement;

        // Reset
        root.removeAttribute('data-theme');
        root.classList.remove('dark');

        if (t === 'default') {
            if (d) root.classList.add('dark');
        } else {
            root.setAttribute('data-theme', t);
            // Grey can be dark too
            if (t === 'grey' && d) root.classList.add('dark');
        }
    };

    const handleThemeChange = (t: Theme) => {
        setTheme(t);
        localStorage.setItem('kitaab-theme', t);
        applyTheme(t, isDark);
    };

    const toggleDark = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        localStorage.setItem('kitaab-dark', String(newDark));
        applyTheme(theme, newDark);
    };

    const formatText = (format: TextFormatType) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
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
                            <button type="button" className={buttonClass} aria-label="Unordered List">
                                <List className="w-4 h-4" />
                            </button>
                            <button type="button" className={buttonClass} aria-label="Link">
                                <LinkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Theme Dropdown */}
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <button className={buttonClass} aria-label="Change Theme">
                                <Palette className="w-5 h-5" />
                            </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                            <DropdownMenu.Content
                                className="min-w-[150px] bg-[var(--background)] border border-[var(--border-color)] rounded-md shadow-lg p-1 z-50 text-[var(--foreground)]"
                                sideOffset={5}
                            >
                                <div className="px-2 py-1.5 text-xs font-semibold opacity-50 uppercase tracking-wider">Mode</div>
                                <DropdownMenu.Item
                                    onSelect={(e) => { e.preventDefault(); toggleDark(); }}
                                    className="flex items-center justify-between px-2 py-2 text-sm outline-none cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                                >
                                    <span>Dark Mode</span>
                                    {isDark && <Check className="w-3 h-3" />}
                                </DropdownMenu.Item>

                                <DropdownMenu.Separator className="h-px bg-[var(--border-color)] my-1" />

                                <div className="px-2 py-1.5 text-xs font-semibold opacity-50 uppercase tracking-wider">Theme</div>
                                {(['default', 'sepia', 'grey'] as Theme[]).map((t) => (
                                    <DropdownMenu.Item
                                        key={t}
                                        onSelect={() => handleThemeChange(t)}
                                        className="flex items-center justify-between px-2 py-2 text-sm outline-none cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded capitalize"
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
                            <button className="px-4 py-1.5 text-xs font-semibold rounded bg-primary text-white hover:opacity-90 transition-opacity flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary shadow-sm">
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
