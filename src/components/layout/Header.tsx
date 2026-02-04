
import { useState, useEffect, memo } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { Settings, Share, Palette, FileText, FileCode, FileType, Check, Copy } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { exportToMarkdown, exportToHTML, exportToPDF } from "@/lib/export";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";

interface HeaderProps {
    title?: string;
    setTitle?: (title: string) => void;
}

type Theme = 'light' | 'dark' | 'sepia' | 'grey';

export const Header = memo(function Header({ title = "Untitled", setTitle }: HeaderProps) {
    const [editor] = useLexicalComposerContext();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, setTheme] = useState<Theme>('light');
    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const copyToClipboard = useCopyToClipboard();

    const applyTheme = (t: Theme) => {
        const root = document.documentElement;
        root.removeAttribute('data-theme');
        root.setAttribute('data-theme', t);
        root.classList.toggle('dark', t === 'dark');
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem('kitaab-theme') as Theme || 'light';
        applyTheme(savedTheme);
        const timeoutId = setTimeout(() => setTheme(savedTheme), 0);
        return () => clearTimeout(timeoutId);
    }, []);

    const handleThemeChange = (t: Theme) => {
        setTheme(t);
        localStorage.setItem('kitaab-theme', t);
        applyTheme(t);
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
                    <div className="size-8 bg-primary rounded flex items-center justify-center text-white font-bold text-lg cursor-default shadow-sm">K</div>

                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle?.(e.target.value)}
                        className="text-sm font-medium text-[var(--foreground)] bg-transparent border-none outline-none hover:opacity-70 transition-opacity w-48 placeholder-neutral-400"
                        placeholder="Untitled draft"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={copyToClipboard}
                        className={buttonClass}
                        aria-label="Copy to clipboard"
                        title="Copy as Markdown"
                    >
                        <Copy className="w-4 h-4" />
                    </button>

                    <DropdownMenu.Root onOpenChange={setIsThemeMenuOpen}>
                        <DropdownMenu.Trigger asChild>
                            <button className={cn(buttonClass, isThemeMenuOpen && "bg-neutral-200 dark:bg-neutral-800")} aria-label="Change Theme" title="Change theme">
                                <Palette className="w-4 h-4" />
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
                                        className="flex items-center justify-between px-3 py-2 text-sm outline-none cursor-pointer rounded capitalize data-[highlighted]:bg-[var(--color-primary)] data-[highlighted]:text-white"
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
                        title="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>

                    <DropdownMenu.Root onOpenChange={setIsExportMenuOpen}>
                        <DropdownMenu.Trigger asChild>
                            <button className={cn(buttonClass, isExportMenuOpen && "bg-neutral-200 dark:bg-neutral-800")} aria-label="Export" title="Export document">
                                <Share className="w-4 h-4" />
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
});
