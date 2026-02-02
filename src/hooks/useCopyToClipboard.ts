"use client";

import { useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { useToast } from "@/components/ui/ToastProvider";

export function useCopyToClipboard() {
  const [editor] = useLexicalComposerContext();
  const { showToast } = useToast();

  const copyToClipboard = useCallback(async () => {
    try {
      let markdown = "";

      editor.read(() => {
        markdown = $convertToMarkdownString(TRANSFORMERS);
      });

      await navigator.clipboard.writeText(markdown);
      showToast("Copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      showToast("Failed to copy");
    }
  }, [editor, showToast]);

  return copyToClipboard;
}
