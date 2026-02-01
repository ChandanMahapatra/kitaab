"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { analyzeText, AnalysisResult } from "@/lib/analysis";

const DEBOUNCE_DELAY = 1000; // Slower debounce for analysis to avoid blocking main thread

interface AnalysisPluginProps {
    onAnalysisUpdate: (result: AnalysisResult) => void;
}

export function AnalysisPlugin({ onAnalysisUpdate }: AnalysisPluginProps) {
    const [editor] = useLexicalComposerContext();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
            // Don't update if nothing changed
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                editorState.read(() => {
                    const markdown = $convertToMarkdownString(TRANSFORMERS);
                    // Run analysis (synchronous for now, could be Web Worker later)
                    const result = analyzeText(markdown);
                    onAnalysisUpdate(result);
                });
            }, DEBOUNCE_DELAY);
        });
    }, [editor, onAnalysisUpdate]);

    return null;
}
