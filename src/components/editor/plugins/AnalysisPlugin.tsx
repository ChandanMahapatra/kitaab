"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";
import { analyzeText, AnalysisResult } from "@/lib/analysis";
import { getCachedMarkdown } from "@/lib/markdownCache";

const DEBOUNCE_DELAY = 1000;

interface AnalysisPluginProps {
    onAnalysisUpdate: (result: AnalysisResult) => void;
}

export function AnalysisPlugin({ onAnalysisUpdate }: AnalysisPluginProps) {
    const [editor] = useLexicalComposerContext();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                const { markdown } = getCachedMarkdown();
                const result = analyzeText(markdown);
                onAnalysisUpdate(result);
            }, DEBOUNCE_DELAY);
        });
    }, [editor, onAnalysisUpdate]);

    return null;
}
