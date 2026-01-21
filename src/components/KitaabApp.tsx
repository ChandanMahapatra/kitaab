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
import { $convertToMarkdownString } from "@lexical/markdown";
import EditorTheme from "@/components/editor/EditorTheme";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { DebouncedAutoSavePlugin } from "@/components/editor/plugins/AutoSavePlugin";
import { ContentInitializationPlugin } from "@/components/editor/plugins/ContentInitializationPlugin";
import CodeHighlightPlugin from "@/components/editor/plugins/CodeHighlightPlugin";
import { AnalysisPlugin } from "@/components/editor/plugins/AnalysisPlugin";
import { IssueHighlighterPlugin } from "@/components/editor/plugins/IssueHighlighterPlugin";
import { IssueVisibilityPlugin } from "@/components/editor/plugins/IssueVisibilityPlugin";
import { AnalysisResult } from "@/lib/analysis";
import { loadSettings } from "@/lib/storage";
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

export default function KitaabApp() {
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [docTitle, setDocTitle] = useState("Untitled draft");
    const [persistedTokens, setPersistedTokens] = useState(0);
    const [hoveredIssueType, setHoveredIssueType] = useState<string | null>(null);

    useEffect(() => {
        const loadPersistedTokens = async () => {
            const settings = await loadSettings();
            setPersistedTokens(settings?.tokensUsed ?? 0);
        };
        loadPersistedTokens();
    }, []);

    return (
        <LexicalComposer initialConfig={editorConfig}>
            <div className="flex h-screen overflow-hidden flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 font-sans">

                <Header
                    title={docTitle}
                    setTitle={setDocTitle}
                />

                <div className="flex flex-1 overflow-hidden">
                    <main className="flex-1 flex flex-col min-w-0 bg-[var(--background)] relative transition-colors duration-300">
                        <div className="flex-1 overflow-y-auto relative scrollbar-thin">
                            <RichTextPlugin
                                contentEditable={
                                    <ContentEditable
                                        className="writing-area min-h-full outline-none px-8 md:px-16 py-8 text-lg text-neutral-500 focus:text-[var(--foreground)] transition-colors max-w-3xl mx-auto"
                                    />
                                }
                                placeholder={
                                    <div className="absolute top-8 left-0 right-0 px-8 md:px-16 pointer-events-none select-none max-w-3xl mx-auto">
                                        <span className="text-neutral-400 text-lg opacity-50">Start typing here...</span>
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
                            <IssueVisibilityPlugin hoveredIssueType={hoveredIssueType} enabled={true} />
                            <AnalysisPlugin onAnalysisUpdate={setAnalysis} />
                        </div>
                    </main>

                    <Sidebar
                        analysis={analysis}
                        onHoverIssue={setHoveredIssueType}
                        onHoverHighlightChange={(type) => setHoveredIssueType(type)}
                        onTokensUpdate={setPersistedTokens}
                    />

                </div>

                <footer className="h-10 border-t border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--background)] w-full z-10 transition-colors duration-300">
                    <div className="flex items-center gap-6 text-[10px] uppercase tracking-wider font-semibold opacity-50">
                        <span>Characters: <span className="text-[var(--foreground)] opacity-70">{analysis?.charCount || 0}</span></span>
                        <span>Words: <span className="text-[var(--foreground)] opacity-70">{analysis?.wordCount || 0}</span></span>
                        <span>Reading Time: <span className="text-[var(--foreground)] opacity-70">{Math.ceil(analysis?.readingTime || 0)} min</span></span>
                        {persistedTokens > 0 && (
                            <span>Tokens: <span className="text-[var(--foreground)] opacity-70">{persistedTokens.toLocaleString()}</span></span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <StatusIndicator />
                    </div>
                </footer>

            </div>
        </LexicalComposer>
    );
}

function StatusIndicator() {
    const [status, setStatus] = useState<'offline' | 'online'>('offline');

    useEffect(() => {
        const checkStatus = () => {
            try {
                const stored = localStorage.getItem('kitaab-settings');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.apiKey) {
                        setStatus('online');
                        return;
                    }
                }
                setStatus('offline');
            } catch (e) {
                setStatus('offline');
            }
        };

        checkStatus();

        const handleSettingsChanged = () => {
            checkStatus();
        };

        window.addEventListener('storage', checkStatus);
        window.addEventListener('kitaab-settings-changed', handleSettingsChanged);

        return () => {
            window.removeEventListener('storage', checkStatus);
            window.removeEventListener('kitaab-settings-changed', handleSettingsChanged);
        };
    }, []);

    return (
        <div className="flex items-center gap-2">
            <span className={`flex h-1.5 w-1.5 rounded-full ${status === 'online' ? 'bg-muted-emerald' : 'bg-neutral-400'}`}></span>
            <span className={`text-[10px] uppercase tracking-wider font-semibold ${status === 'online' ? 'text-muted-emerald' : 'opacity-50'}`}>
                {status}
            </span>
        </div>
    );
}
