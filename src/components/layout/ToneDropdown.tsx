import { useState, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertToMarkdownString, $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { $getRoot } from "lexical";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Type, Loader2 } from "lucide-react";
import { TONE_OPTIONS, ToneId, changeToneWithSettings } from "@/lib/tone";
import { loadSettings } from "@/lib/storage";
import { isLocalProvider } from "@/lib/ai";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";

interface ToneDropdownProps {
    buttonClass: string;
}

export function ToneDropdown({ buttonClass }: ToneDropdownProps) {
    const [editor] = useLexicalComposerContext();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [aiConfigured, setAiConfigured] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        const checkConfig = async () => {
            const settings = await loadSettings();
            setAiConfigured(!!(settings?.provider && (isLocalProvider(settings.provider) || settings?.apiKey)));
        };
        checkConfig();
        const handler = () => { checkConfig(); };
        window.addEventListener('kitaab-settings-changed', handler);
        return () => window.removeEventListener('kitaab-settings-changed', handler);
    }, []);

    const handleToneChange = async (tone: ToneId) => {
        if (!aiConfigured) return;

        let markdown = "";
        editor.read(() => {
            markdown = $convertToMarkdownString(TRANSFORMERS);
        });

        if (!markdown.trim()) return;

        setIsLoading(true);

        try {
            const result = await changeToneWithSettings(markdown, tone);

            // Use discrete history entry tag to preserve undo/redo functionality
            editor.update(() => {
                const root = $getRoot();
                root.clear();
                $convertFromMarkdownString(result.text, TRANSFORMERS);
            }, {
                tag: 'tone-change'
            });

            showToast(`Tone changed to ${TONE_OPTIONS.find(t => t.id === tone)?.label}`);
        } catch (err) {
            console.error("Tone change failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to change tone";
            showToast(errorMessage, "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DropdownMenu.Root onOpenChange={setIsOpen}>
            <DropdownMenu.Trigger asChild>
                <button
                    type="button"
                    className={cn(buttonClass, isOpen && "bg-neutral-200 dark:bg-neutral-800")}
                    aria-label="Change tone"
                    title={aiConfigured ? "Change document tone" : "Configure AI in Settings to change tone"}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Type className="w-4 h-4" />
                    )}
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="min-w-[160px] bg-[var(--background)] border border-[var(--border-color)] rounded-md p-1 shadow-lg z-50 text-[var(--foreground)]"
                    sideOffset={5}
                >
                    <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest opacity-40">
                        Document Tone
                    </DropdownMenu.Label>
                    {!aiConfigured ? (
                        <div className="px-2 py-2 text-[11px] opacity-50">
                            Configure AI in Settings first
                        </div>
                    ) : (
                        TONE_OPTIONS.map((tone) => (
                            <DropdownMenu.Item
                                key={tone.id}
                                onSelect={() => handleToneChange(tone.id)}
                                disabled={isLoading}
                                className="group text-[13px] leading-none text-[var(--foreground)] rounded-[3px] flex items-center h-[35px] px-[8px] relative select-none outline-none data-[highlighted]:bg-primary data-[highlighted]:text-white cursor-pointer data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
                            >
                                {tone.label}
                            </DropdownMenu.Item>
                        ))
                    )}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
