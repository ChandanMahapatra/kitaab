"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { FORMAT_TEXT_COMMAND, TextFormatType } from "lexical";
import { Bold, Italic, Code, Link, List, ListOrdered } from "lucide-react";

export function EditorToolbar() {
    const [editor] = useLexicalComposerContext();

    const formatText = (format: TextFormatType) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    };

    const toolbarButtonClass = "p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200";

    return (
        <div className="flex items-center gap-1.5 px-4 h-10 border-b border-neutral-200 dark:border-neutral-800 bg-background-light dark:bg-background-dark/50 sticky top-0 z-10 backdrop-blur-sm">
            <button
                type="button"
                onClick={() => formatText("bold")}
                className={toolbarButtonClass}
                aria-label="Bold"
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => formatText("italic")}
                className={toolbarButtonClass}
                aria-label="Italic"
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => formatText("code")}
                className={toolbarButtonClass}
                aria-label="Code"
            >
                <Code className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />
            {/* Placeholder for Link and Lists - these require more complex logic/plugins */}
            <button
                type="button"
                className={toolbarButtonClass}
                aria-label="Link"
            >
                <Link className="w-4 h-4" />
            </button>
            <button
                type="button"
                className={toolbarButtonClass}
                aria-label="Unordered List"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                type="button"
                className={toolbarButtonClass}
                aria-label="Ordered List"
            >
                <ListOrdered className="w-4 h-4" />
            </button>

        </div>
    );
}
