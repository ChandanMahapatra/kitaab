"use client";

import { useState, useEffect, useCallback, memo } from "react";
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
import { HorizontalRuleNode, $createHorizontalRuleNode, $isHorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS, ElementTransformer } from "@lexical/markdown";
import EditorTheme from "@/components/editor/EditorTheme";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { DebouncedAutoSavePlugin } from "@/components/editor/plugins/AutoSavePlugin";
import { ContentInitializationPlugin } from "@/components/editor/plugins/ContentInitializationPlugin";
import CodeHighlightPlugin from "@/components/editor/plugins/CodeHighlightPlugin";
import { AnalysisPlugin } from "@/components/editor/plugins/AnalysisPlugin";
import { IssueHighlighterPlugin } from "@/components/editor/plugins/IssueHighlighterPlugin";
import { SentenceHighlighterPlugin } from "@/components/editor/plugins/SentenceHighlighterPlugin";
import { IssueVisibilityPlugin } from "@/components/editor/plugins/IssueVisibilityPlugin";
import { MarkdownCachePlugin } from "@/components/editor/plugins/MarkdownCachePlugin";
import { LinkClickPlugin } from "@/components/editor/plugins/LinkClickPlugin";
import { FloatingLinkEditorPlugin } from "@/components/editor/plugins/FloatingLinkEditorPlugin";
import { AnalysisResult } from "@/lib/analysis";
import { loadSettings, savePricingCache, loadPricingCache } from "@/lib/storage";
import { fetchModelPricing } from "@/lib/pricing";
import { IssueNode } from "@/components/editor/nodes/IssueNode";
import { LexicalNode } from "lexical";

// Custom horizontal rule transformer for markdown shortcut (---)
const HORIZONTAL_RULE_TRANSFORMER: ElementTransformer = {
    dependencies: [HorizontalRuleNode],
    export: (node: LexicalNode) => {
        return $isHorizontalRuleNode(node) ? '---' : null;
    },
    regExp: /^(---|\*\*\*|___)\s?$/,
    replace: (parentNode, _children, _match, isImport) => {
        const line = $createHorizontalRuleNode();

        // When importing or if there's a next sibling, replace the paragraph
        // Otherwise, insert before (keeps cursor in a new paragraph after)
        if (isImport || parentNode.getNextSibling() != null) {
            parentNode.replace(line);
        } else {
            parentNode.insertBefore(line);
        }

        line.selectNext();
    },
    type: 'element',
};

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
        HorizontalRuleNode,
        IssueNode,
    ],
};

export default function KitaabApp() {
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [docTitle, setDocTitle] = useState("Untitled draft");
    const [persistedTokens, setPersistedTokens] = useState(0);
    const [persistedCost, setPersistedCost] = useState(0);
    const [showCostEstimate, setShowCostEstimate] = useState(true);
    const [hoveredIssueType, setHoveredIssueType] = useState<string | null>(null);

    const handleHoverHighlightChange = useCallback(
        (type: string | null) => setHoveredIssueType(type),
        []
    );

    const handleTokensUpdate = useCallback(
        (tokens: number, cost: number) => {
            setPersistedTokens(tokens);
            setPersistedCost(cost);
        },
        []
    );

    useEffect(() => {
        const loadPersistedStats = async () => {
            const settings = await loadSettings();
            setPersistedTokens(settings?.tokensUsed ?? 0);
            setPersistedCost(settings?.totalCost ?? 0);
            setShowCostEstimate(settings?.showCostEstimate ?? true);
        };
        loadPersistedStats();
    }, []);

    useEffect(() => {
        const handleSettingsChange = async () => {
            const settings = await loadSettings();
            setPersistedTokens(settings?.tokensUsed ?? 0);
            setPersistedCost(settings?.totalCost ?? 0);
            setShowCostEstimate(settings?.showCostEstimate ?? true);
        };
        window.addEventListener('kitaab-settings-changed', handleSettingsChange);
        return () => window.removeEventListener('kitaab-settings-changed', handleSettingsChange);
    }, []);

    useEffect(() => {
        const fetchAndCachePricing = async () => {
            try {
                const cached = await loadPricingCache();
                const cacheAge = cached?.lastUpdated ? Date.now() - new Date(cached.lastUpdated).getTime() : Infinity;
                const oneDay = 24 * 60 * 60 * 1000;
                
                // Fetch if no cache or cache is older than 1 day
                if (!cached || cacheAge > oneDay) {
                    const pricing = await fetchModelPricing();
                    if (pricing && pricing.length > 0) {
                        const pricingMap = pricing.reduce((acc, model) => {
                            acc[model.id] = model;
                            return acc;
                        }, {} as Record<string, any>);
                        await savePricingCache(pricingMap);
                        console.log('Pricing cache updated');
                    }
                }
            } catch (error) {
                console.error('Failed to fetch pricing:', error);
            }
        };
        fetchAndCachePricing();
    }, []);

    return (
        <LexicalComposer initialConfig={editorConfig}>
            <div className="flex h-dvh overflow-hidden flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 font-display">

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
                                        className="writing-area min-h-full outline-none px-8 md:px-16 py-8 text-lg text-[var(--foreground)] transition-colors max-w-3xl mx-auto text-pretty font-display"
                                    />
                                }
                                placeholder={
                                    <div className="absolute top-8 left-0 right-0 px-8 md:px-16 pointer-events-none select-none max-w-3xl mx-auto">
                                        <span className="text-[var(--foreground)] text-lg opacity-40 text-pretty">Start typing here...</span>
                                    </div>
                                }
                                ErrorBoundary={LexicalErrorBoundary}
                            />
                            <HistoryPlugin />
                            <AutoFocusPlugin />
                            <ListPlugin />
                            <LinkPlugin />
                            <AutoLinkPlugin
                                matchers={[
                                    (text: string) => {
                                        const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/i;
                                        const match = URL_REGEX.exec(text);
                                        if (match) {
                                            const url = match[0];
                                            return {
                                                index: match.index,
                                                length: url.length,
                                                text: url,
                                                url: url.startsWith('http') ? url : `https://${url}`,
                                            };
                                        }
                                        return null;
                                    }
                                ]}
                            />
                            <LinkClickPlugin />
                            <FloatingLinkEditorPlugin />
                            <HorizontalRulePlugin />
                            <CodeHighlightPlugin />
                            <MarkdownShortcutPlugin transformers={[...TRANSFORMERS, HORIZONTAL_RULE_TRANSFORMER]} />
                            <MarkdownCachePlugin />
                            <DebouncedAutoSavePlugin />
                            <ContentInitializationPlugin />
                            <IssueHighlighterPlugin />
                            <SentenceHighlighterPlugin analysis={analysis} />
                            <IssueVisibilityPlugin hoveredIssueType={hoveredIssueType} enabled={true} />
                            <AnalysisPlugin onAnalysisUpdate={setAnalysis} />
                        </div>
                    </main>

                    <Sidebar
                        analysis={analysis}
                        onHoverIssue={setHoveredIssueType}
                        onHoverHighlightChange={handleHoverHighlightChange}
                        onTokensUpdate={handleTokensUpdate}
                    />

                </div>

                <Footer analysis={analysis} persistedTokens={persistedTokens} />

            </div>
        </LexicalComposer>
    );
}

const Footer = memo(function Footer({ analysis, persistedTokens }: { analysis: AnalysisResult | null; persistedTokens: number }) {
    return (
        <footer className="h-10 border-t border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--background)] w-full z-10 transition-colors duration-300">
            <div className="flex items-center gap-6 text-[10px] uppercase tracking-wider font-semibold opacity-50">
                <span>Characters: <span className="text-[var(--foreground)] opacity-70">{analysis?.charCount || 0}</span></span>
                <span>Words: <span className="text-[var(--foreground)] opacity-70">{analysis?.wordCount || 0}</span></span>
                <span>Reading Time: <span className="text-[var(--foreground)] opacity-70">{Math.ceil(analysis?.readingTime || 0)} min</span></span>
            </div>
            <div className="flex items-center gap-4">
                {persistedTokens > 0 && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-50">
                        Tokens: <span className="text-[var(--foreground)] opacity-70">{persistedTokens.toLocaleString()}</span>
                    </span>
                )}
                <StatusIndicator />
            </div>
        </footer>
    );
});

function StatusIndicator() {
    const [status, setStatus] = useState<'offline' | 'online'>('offline');

    useEffect(() => {
        let isMounted = true;

        const checkStatus = async () => {
            try {
                const settings = await loadSettings();
                if (!isMounted) return;
                setStatus(settings?.apiKey ? 'online' : 'offline');
            } catch (e) {
                if (!isMounted) return;
                setStatus('offline');
            }
        };

        void checkStatus();

        const handleSettingsChanged = () => {
            void checkStatus();
        };

        window.addEventListener('kitaab-settings-changed', handleSettingsChanged);

        return () => {
            isMounted = false;
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
