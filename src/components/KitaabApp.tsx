"use client";

import { useState, useEffect } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"; // Import for hook usage
import { $convertToMarkdownString } from "@lexical/markdown";
import MarkdownIt from "markdown-it";
import EditorTheme from "@/components/editor/EditorTheme";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { DebouncedAutoSavePlugin } from "@/components/editor/plugins/AutoSavePlugin";
import { ContentInitializationPlugin } from "@/components/editor/plugins/ContentInitializationPlugin";
import CodeHighlightPlugin from "@/components/editor/plugins/CodeHighlightPlugin";
import { AnalysisPlugin } from "@/components/editor/plugins/AnalysisPlugin";
import { IssueHighlighterPlugin } from "@/components/editor/plugins/IssueHighlighterPlugin";
import { AnalysisResult } from "@/lib/analysis";
import { IssueNode } from "@/components/editor/nodes/IssueNode";

const editorConfig = {
    namespace: "KitaabEditor",
    theme: EditorTheme,
    onError(error: Error) {
        console.error(error);
    },
    nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        CodeNode,
        CodeHighlightNode,
        TableNode,
        TableCellNode,
        TableRowNode,
        LinkNode,
        AutoLinkNode,
        IssueNode,
    ],
};

const mdParser = new MarkdownIt();

export default function KitaabApp() {
    const [isPreview, setIsPreview] = useState(false);
    const [previewContent, setPreviewContent] = useState("");
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [docTitle, setDocTitle] = useState("Untitled draft");

    // We need a plugin/component to extract content for preview when toggled
    const PreviewHandler = () => {
        const [editor] = useLexicalComposerContext();
        useEffect(() => {
            if (isPreview) {
                editor.getEditorState().read(() => {
                    const md = $convertToMarkdownString(TRANSFORMERS);
                    setPreviewContent(mdParser.render(md));
                });
            }
        }, [isPreview, editor]);
        return null;
    };

    return (
        <LexicalComposer initialConfig={editorConfig}>
            <div className="flex h-screen overflow-hidden flex-col bg-background-light dark:bg-background-dark text-neutral-800 dark:text-neutral-200 transition-colors duration-200">

                <Header
                    isPreview={isPreview}
                    onTogglePreview={() => setIsPreview(!isPreview)}
                    title={docTitle}
                    setTitle={setDocTitle}
                />

                <div className="flex flex-1 overflow-hidden">
                    <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative">
                        <div className="flex-1 overflow-y-auto relative">
                            {isPreview ? (
                                <div
                                    className="prose dark:prose-invert max-w-3xl mx-auto px-10 md:px-24 py-12"
                                    dangerouslySetInnerHTML={{ __html: previewContent }}
                                />
                            ) : (
                                <>
                                    <RichTextPlugin
                                        contentEditable={
                                            <ContentEditable
                                                className="writing-area min-h-full outline-none px-10 md:px-24 py-12 text-lg font-mono text-neutral-500 focus:text-neutral-900 dark:focus:text-neutral-100 transition-colors max-w-3xl mx-auto"
                                            />
                                        }
                                        placeholder={
                                            <div className="absolute top-12 left-0 right-0 px-10 md:px-24 pointer-events-none select-none max-w-3xl mx-auto">
                                                <span className="text-neutral-400 text-lg font-mono">Start typing here...</span>
                                            </div>
                                        }
                                        ErrorBoundary={LexicalErrorBoundary}
                                    />
                                    <HistoryPlugin />
                                    <AutoFocusPlugin />
                                    <ListPlugin />
                                    <LinkPlugin />
                                    <CodeHighlightPlugin />
                                    <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
                                    <DebouncedAutoSavePlugin />
                                    <ContentInitializationPlugin />
                                    <IssueHighlighterPlugin />
                                    <AnalysisPlugin onAnalysisUpdate={setAnalysis} />
                                    <PreviewHandler />
                                </>
                            )}
                        </div>
                    </main>

                    <Sidebar analysis={analysis} />

                </div>

                {/* Footer */}
                <footer className="h-10 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-6 bg-background-light dark:bg-background-dark w-full z-10">
                    <div className="flex items-center gap-6 text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                        <span>Characters: <span className="text-neutral-600 dark:text-neutral-300">{analysis?.charCount || 0}</span></span>
                        <span>Words: <span className="text-neutral-600 dark:text-neutral-300">{analysis?.wordCount || 0}</span></span>
                        <span>Reading Time: <span className="text-neutral-600 dark:text-neutral-300">{Math.ceil(analysis?.readingTime || 0)} min</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-muted-emerald"></span>
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-emerald">Online</span>
                        </div>
                    </div>
                </footer>

            </div>
        </LexicalComposer>
    );
}
