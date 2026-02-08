"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";
import { $patchStyleText } from "@lexical/selection";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { TONE_OPTIONS, ToneId, changeToneWithSettings } from "@/lib/tone";
import { loadSettings, type Settings } from "@/lib/storage";
import { isLocalProvider } from "@/lib/ai";
import { useToast } from "@/components/ui/ToastProvider";

interface FloatingPosition {
    top: number;
    left: number;
}

export function FloatingTonePlugin() {
    const [editor] = useLexicalComposerContext();
    const [position, setPosition] = useState<FloatingPosition | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTone, setActiveTone] = useState<ToneId | null>(null);
    const [aiConfigured, setAiConfigured] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const isMouseDownRef = useRef(false);
    const { showToast } = useToast();

    useEffect(() => {
        const checkConfig = async () => {
            const settings: Settings | undefined = await loadSettings();
            setAiConfigured(!!(settings?.provider && (isLocalProvider(settings.provider) || settings?.apiKey)));
        };
        checkConfig();
        const handler = () => { checkConfig(); };
        window.addEventListener('kitaab-settings-changed', handler);
        return () => window.removeEventListener('kitaab-settings-changed', handler);
    }, []);

    const updatePosition = useCallback(() => {
        if (isLoading) return;

        // Don't show popover if AI isn't configured
        if (!aiConfigured) {
            setPosition(null);
            return;
        }

        const nativeSelection = window.getSelection();
        if (!nativeSelection || nativeSelection.rangeCount === 0 || nativeSelection.isCollapsed) {
            setPosition(null);
            return;
        }

        const range = nativeSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Only show if selection is within the editor
        const editorRoot = editor.getRootElement();
        if (!editorRoot || !editorRoot.contains(range.commonAncestorContainer)) {
            setPosition(null);
            return;
        }

        // Check that there's actually selected text (not just whitespace)
        const selectedText = nativeSelection.toString().trim();
        if (!selectedText) {
            setPosition(null);
            return;
        }

        setPosition({
            top: rect.top + window.scrollY - 8,
            left: rect.left + window.scrollX + rect.width / 2,
        });
    }, [editor, isLoading, aiConfigured]);

    useEffect(() => {
        const handleMouseDown = () => { isMouseDownRef.current = true; };
        const handleMouseUp = () => {
            isMouseDownRef.current = false;
            // Delay slightly to let selection settle
            requestAnimationFrame(updatePosition);
        };

        const editorRoot = editor.getRootElement();
        if (!editorRoot) return;

        editorRoot.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            editorRoot.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [editor, updatePosition]);

    // Handle keyboard-based selection changes
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            if (isMouseDownRef.current || isLoading) return;
            editorState.read(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection) && !selection.isCollapsed()) {
                    requestAnimationFrame(updatePosition);
                } else if (!isLoading) {
                    setPosition(null);
                }
            });
        });
    }, [editor, updatePosition, isLoading]);

    // Click outside to dismiss
    useEffect(() => {
        if (!position) return;
        const handleClick = (e: MouseEvent) => {
            if (isLoading) return;
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setPosition(null);
            }
        };
        // Delay listener to avoid dismissing immediately on the mouseup that created the selection
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClick);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClick);
        };
    }, [position, isLoading]);

    const handleToneChange = useCallback(async (tone: ToneId) => {
        if (!aiConfigured) return;

        let selectedText = "";

        // Capture selection state before async operation
        editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                selectedText = selection.getTextContent();
            }
        });

        if (!selectedText.trim()) return;

        setIsLoading(true);
        setActiveTone(tone);

        const TIMEOUT_MS = 30000; // 30 second timeout

        try {
            // Wrap the API call with a timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Request timed out. Please try again.")), TIMEOUT_MS);
            });

            const result = await Promise.race([
                changeToneWithSettings(selectedText, tone),
                timeoutPromise
            ]);

            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection) && !selection.isCollapsed()) {
                    // Verify selection is still valid before replacing
                    selection.insertRawText(result.text);

                    // Clear font-family to reset to default (IBM Plex Mono)
                    // This prevents the tone-changed text from inheriting custom fonts
                    $patchStyleText(selection, { 'font-family': null });
                } else {
                    // Selection changed during async operation
                    showToast("Selection changed. Please try again.", "error");
                }
            });

            setPosition(null);
        } catch (err) {
            console.error("Tone change failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to change tone";
            showToast(errorMessage, "error");
        } finally {
            setIsLoading(false);
            setActiveTone(null);
        }
    }, [editor, aiConfigured, showToast]);

    if (!position) return null;

    return createPortal(
        <div
            ref={popoverRef}
            className="fixed z-[100] animate-in fade-in slide-in-from-bottom-1 duration-150"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translate(-50%, -100%)',
            }}
        >
            <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-lg shadow-xl p-1.5 flex items-center gap-1 flex-wrap max-w-[400px]">
                {isLoading ? (
                    <div className="flex items-center gap-2 px-3 py-1.5">
                        <Loader2 className="w-3 h-3 animate-spin text-[var(--color-primary)]" />
                        <span className="text-[11px] text-[var(--foreground)] opacity-70">
                            Changing to {TONE_OPTIONS.find(t => t.id === activeTone)?.label}...
                        </span>
                    </div>
                ) : (
                    TONE_OPTIONS.map((tone) => (
                        <button
                            key={tone.id}
                            onClick={() => handleToneChange(tone.id)}
                            className="px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] rounded hover:bg-[var(--color-primary)] hover:text-white transition-colors whitespace-nowrap"
                        >
                            {tone.label}
                        </button>
                    ))
                )}
            </div>
        </div>,
        document.body
    );
}
