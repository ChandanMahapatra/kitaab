import { useState, useEffect, useMemo, memo } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { AnalysisResult, Issue } from "@/lib/analysis";
import { evaluateText, EvaluationResult, providers, isLocalProvider } from "@/lib/ai";
import { loadSettings, saveSettings } from "@/lib/storage";
import { Zap, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { DetailedFeedbackModal } from "@/components/feedback/DetailedFeedbackModal";

interface SidebarProps {
    analysis: AnalysisResult | null;
    onHoverIssue?: (type: string | null) => void;
    onHoverHighlightChange?: (type: string | null) => void;
    onTokensUpdate?: (tokens: number, cost: number) => void;
}

export const Sidebar = memo(function Sidebar({ analysis, onHoverIssue, onHoverHighlightChange, onTokensUpdate }: SidebarProps) {
    const [editor] = useLexicalComposerContext();
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hoverHighlightEnabled, setHoverHighlightEnabled] = useState(false);
    const [activeIssueTypes, setActiveIssueTypes] = useState<Set<Issue['type']>>(new Set());
    const [aiConfigured, setAiConfigured] = useState(false);
    const [showCostEstimate, setShowCostEstimate] = useState(true);
    const [detailedFeedbackOpen, setDetailedFeedbackOpen] = useState(false);

    const score = analysis?.score ?? 0;
    const gradeLevel = analysis?.gradeLevel ?? 0;
    const fleschScore = analysis?.fleschScore ?? 0;

    // Re-check AI config periodically (e.g., when settings modal closes)
    const checkAiConfig = async () => {
        const settings = await loadSettings();
        setAiConfigured(!!(settings?.provider && (isLocalProvider(settings.provider) || settings?.apiKey)));
    };

    useEffect(() => {
        const loadSettingsData = async () => {
            const settings = await loadSettings();
            setHoverHighlightEnabled(settings?.hoverHighlightEnabled ?? false);
            setAiConfigured(!!(settings?.provider && (isLocalProvider(settings.provider) || settings?.apiKey)));
            setShowCostEstimate(settings?.showCostEstimate ?? true);
        };
        loadSettingsData();
        // Listen for settings changes via custom event dispatched by SettingsModal
        const handleSettingsChange = () => {
            checkAiConfig();
            loadSettingsData();
        };
        window.addEventListener('kitaab-settings-changed', handleSettingsChange);
        return () => window.removeEventListener('kitaab-settings-changed', handleSettingsChange);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        if (hoverHighlightEnabled) {
            root.setAttribute('data-highlight-type', '__all__');
        } else {
            root.removeAttribute('data-highlight-type');
        }
        onHoverHighlightChange?.(hoverHighlightEnabled ? '__all__' : null);
    }, [hoverHighlightEnabled, onHoverHighlightChange]);

    const issuesByType = useMemo(() => {
        return analysis?.issues.reduce((acc, issue) => {
            if (!acc[issue.type]) acc[issue.type] = [];
            acc[issue.type].push(issue);
            return acc;
        }, {} as Record<string, Issue[]>) ?? {};
    }, [analysis?.issues]);

    const issueTypeKeys = useMemo(() => Object.keys(issuesByType) as Issue['type'][], [issuesByType]);

    useEffect(() => {
        if (!hoverHighlightEnabled) {
            setActiveIssueTypes(new Set());
            return;
        }
        setActiveIssueTypes(new Set(issueTypeKeys));
    }, [hoverHighlightEnabled, issueTypeKeys]);

    useEffect(() => {
        const root = document.documentElement;
        const issueTypes: Issue['type'][] = [
            'adverb',
            'passive',
            'complex',
            'veryComplex',
            'hardWord',
            'qualifier',
        ];
        issueTypes.forEach((type) => root.removeAttribute(`data-highlight-active-${type}`));
        if (hoverHighlightEnabled) {
            activeIssueTypes.forEach((type) => root.setAttribute(`data-highlight-active-${type}`, 'on'));
            root.removeAttribute('data-highlight-type');
        }
    }, [hoverHighlightEnabled, activeIssueTypes]);

    const getIssueColor = (type: string) => {
        switch (type) {
            case 'veryComplex': return '#e57373';  // Red - matches editor highlight
            case 'complex': return '#ffb74d';      // Amber - matches editor highlight
            case 'hardWord': return '#ba68c8';     // Purple - matches editor highlight
            case 'adverb': return '#64b5f6';       // Blue - matches editor highlight
            case 'passive': return '#81c784';      // Emerald - matches editor highlight
            case 'qualifier': return '#546e7a';    // Primary - matches editor highlight
            default: return '#ffb74d';
        }
    };

    // Convert hex to rgba with 0.3 opacity to match editor CSS
    const getRgbaBackground = (hex: string): string => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, 0.3)`;
    };

    const getIssueLabel = (type: string) => {
        switch (type) {
            case 'veryComplex': return 'Very Hard Sentences';
            case 'complex': return 'Hard Sentences';
            case 'hardWord': return 'Complex Words';
            case 'adverb': return 'Adverbs';
            case 'passive': return 'Passive Voice';
            case 'qualifier': return 'Weak Qualifiers';
            default: return type;
        }
    };

    const handleHoverEnter = (type: string) => {
        onHoverIssue?.(type);
        onHoverHighlightChange?.(hoverHighlightEnabled ? '__all__' : type);
        document.documentElement.setAttribute('data-highlight-hover', type);
    };

    const handleHoverLeave = () => {
        onHoverIssue?.(null);
        onHoverHighlightChange?.(hoverHighlightEnabled ? '__all__' : null);
        document.documentElement.removeAttribute('data-highlight-hover');
    };

    const toggleIssueType = (type: Issue['type']) => {
        if (!hoverHighlightEnabled) return;
        setActiveIssueTypes((prev) => {
            const next = new Set(prev);
            if (next.has(type)) {
                next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
    };

    const toggleHoverHighlight = async () => {
        const newValue = !hoverHighlightEnabled;
        setHoverHighlightEnabled(newValue);
        const settings = await loadSettings();
        await saveSettings({
            ...settings,
            hoverHighlightEnabled: newValue,
        });
        onHoverHighlightChange?.(newValue ? '__all__' : null);
        if (newValue) {
            document.documentElement.setAttribute('data-highlight-type', '__all__');
        } else {
            document.documentElement.removeAttribute('data-highlight-type');
        }
    };

    const handleAnalyze = async () => {
        setIsEvaluating(true);
        setError(null);
        setEvaluation(null);

        try {
            const settings = await loadSettings();
            if (!settings || !settings.provider) {
                setError("Please configure an AI provider in Settings.");
                setIsEvaluating(false);
                return;
            }

            let markdown = "";
            editor.read(() => {
                markdown = $convertToMarkdownString(TRANSFORMERS);
            });

            if (!markdown.trim()) {
                setError("Please write something first.");
                setIsEvaluating(false);
                return;
            }

            const provider = providers.find(p => p.id === settings.provider);
            const model = settings.model || provider?.models[0] || "gpt-3.5-turbo";

            if (!settings.apiKey && provider?.apiKeyRequired) {
                setError("API Key is missing in Settings.");
                setIsEvaluating(false);
                return;
            }

            const result = await evaluateText(
                markdown,
                settings.provider,
                model,
                settings.apiKey || "",
                settings.baseURL
            );

            setEvaluation(result);

            const newTotalTokens = (settings.tokensUsed ?? 0) + (result.tokensUsed ?? 0);
            const newTotalCost = (settings.totalCost ?? 0) + (result.cost ?? 0);
            onTokensUpdate?.(newTotalTokens, newTotalCost);

            await saveSettings({
                ...settings,
                tokensUsed: newTotalTokens,
                totalCost: newTotalCost,
            });

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Analysis failed");
        } finally {
            setIsEvaluating(false);
        }
    };

    const buttonClass = "px-4 py-1.5 text-xs font-semibold border border-[var(--border-color)] text-[var(--foreground)] bg-transparent hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:text-white rounded transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none flex items-center justify-center gap-2 w-full";

    return (
        <aside className="w-80 border-l border-[var(--border-color)] flex flex-col bg-[var(--sidebar-bg)] h-full transition-colors duration-300">
            <div className="p-4 border-b border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-widest opacity-60">Analysis</h2>
                    <button
                        onClick={toggleHoverHighlight}
                        className="text-[10px] opacity-50 hover:opacity-100 transition-opacity"
                    >
                        {hoverHighlightEnabled ? 'Highlight: On' : 'Highlight: Off'}
                    </button>
                </div>

                {hoverHighlightEnabled && (
                    <div className="flex flex-col items-center justify-center py-3 bg-[var(--background)] rounded-lg border border-[var(--border-color)] mb-4 shadow-sm">
                        <div className="relative w-32 h-16 overflow-hidden">
                            <svg viewBox="0 0 100 50" className="w-full h-full">
                                <path d="M 10 50 A 40 40 0 0 1 90 50" strokeWidth="10" fill="none" className="transition-colors" style={{ stroke: 'var(--border-color)' }} />
                                <path
                                    d="M 10 50 A 40 40 0 0 1 90 50"
                                    strokeWidth="10"
                                    stroke="currentColor"
                                    fill="none"
                                    className="text-primary transition-all duration-1000 ease-out"
                                    strokeDasharray="125.6"
                                    strokeDashoffset={125.6 - (125.6 * (score / 100))}
                                />
                            </svg>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                <span className="text-2xl font-bold leading-none text-[var(--foreground)]">{score}</span>
                                <span className="text-[10px] opacity-50 font-semibold uppercase">Score</span>
                            </div>
                        </div>
                        <p className="text-xs font-medium opacity-50 mt-2">
                            {score > 80 ? 'Good Readability' : score > 50 ? 'Needs Improvement' : 'Hard to Read'}
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <a 
                            href="https://en.wikipedia.org/wiki/Coleman%E2%80%93Liau_index" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="opacity-50 hover:opacity-100 underline decoration-dotted underline-offset-2 transition-opacity"
                        >
                            Grade Level
                        </a>
                        <span className="font-bold text-primary">Grade {gradeLevel}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <a 
                            href="https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="opacity-50 hover:opacity-100 underline decoration-dotted underline-offset-2 transition-opacity"
                        >
                            Flesch Score
                        </a>
                        <span className="font-bold text-[var(--foreground)] opacity-80">{fleschScore}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {Object.keys(issuesByType).length === 0 && !evaluation && (
                    <div className="text-xs opacity-40 text-center py-6">
                        No issues detected.
                    </div>
                )}

                {Object.entries(issuesByType).map(([type, issues]) => {
                    const issueColor = getIssueColor(type);
                    const bgColor = getRgbaBackground(issueColor);
                    const isActive = activeIssueTypes.has(type as Issue['type']);

                    return (
                        <div
                            key={type}
                            className={cn(
                                "p-3 border border-[var(--border-color)] rounded-lg transition-all duration-200 cursor-pointer",
                                hoverHighlightEnabled && !isActive && "opacity-50"
                            )}
                            style={{
                                borderColor: isActive ? issueColor : undefined,
                            }}
                            onPointerEnter={(e) => {
                                handleHoverEnter(type);
                                // Show full color + editor-matching background on hover
                                const labelSpan = e.currentTarget.querySelector('.issue-label') as HTMLElement;
                                if (labelSpan) labelSpan.style.color = issueColor;
                                e.currentTarget.style.backgroundColor = bgColor;
                            }}
                            onPointerLeave={(e) => {
                                handleHoverLeave();
                                // Reset label color based on mode
                                const labelSpan = e.currentTarget.querySelector('.issue-label') as HTMLElement;
                                if (labelSpan) {
                                    if (!hoverHighlightEnabled && !isActive) {
                                        labelSpan.style.color = ''; // Reset to default in highlight off
                                    }
                                }
                                e.currentTarget.style.backgroundColor = '';
                            }}
                            onClick={() => toggleIssueType(type as Issue['type'])}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span 
                                    className="issue-label text-xs font-bold uppercase tracking-wider"
                                    style={{ color: hoverHighlightEnabled || isActive ? issueColor : undefined }}
                                >
                                    {getIssueLabel(type)}
                                </span>
                                <span className="text-xs font-bold px-1.5 rounded opacity-80">
                                    {issues.length}
                                </span>
                            </div>
                            {issues[0]?.suggestion && (
                                <p className="text-[11px] opacity-60 leading-relaxed mt-1">{issues[0].suggestion}</p>
                            )}
                        </div>
                    );
                })}

                {evaluation && evaluation.suggestions.length > 0 && (
                    <div className="mt-4 border-t border-[var(--border-color)] pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-50">AI Feedback</h3>
                            {(evaluation.detailedFeedback?.length || evaluation.weakArguments?.length) ? (
                                <button
                                    onClick={() => setDetailedFeedbackOpen(true)}
                                    className="text-[10px] text-primary hover:underline flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                                >
                                    view all feedback
                                    <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            {evaluation.suggestions.map((suggestion, idx) => (
                                <div key={idx} className="text-xs text-[var(--foreground)] opacity-80 py-1">
                                    {idx + 1}. {suggestion}
                                </div>
                            ))}
                        </div>
                        {evaluation.weakArguments && evaluation.weakArguments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-color)]/50">
                                <div className="text-[10px] font-semibold text-amber-500 mb-1 flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Weak Arguments Found
                                </div>
                                <p className="text-[10px] opacity-60">
                                    {evaluation.weakArguments.length} potential issue{evaluation.weakArguments.length > 1 ? 's' : ''} detected.
                                </p>
                            </div>
                        )}
                        {(evaluation.tokensUsed || (showCostEstimate && evaluation.cost !== undefined)) && (
                            <div className="mt-3 pt-3 border-[var(--border-color)]/50 text-[10px] opacity-50 flex justify-between">
                                <span>Tokens: {evaluation.tokensUsed?.toLocaleString()}</span>
                                {showCostEstimate && (
                                    <span>Cost: ${evaluation.cost?.toFixed(4)}</span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-[var(--border-color)]">
                {error && (
                    <div className="mb-3 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        {error}
                    </div>
                )}

                <button
                    onClick={handleAnalyze}
                    disabled={isEvaluating || !aiConfigured}
                    className={cn(buttonClass, !aiConfigured && "opacity-50 cursor-not-allowed hover:bg-transparent hover:border-[var(--border-color)] hover:text-[var(--foreground)]")}
                    title={!aiConfigured ? "Configure AI provider in Settings first" : undefined}
                >
                    {isEvaluating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Zap className="w-3 h-3" />
                    )}
                    {isEvaluating ? 'ANALYZING...' : 'ANALYZE WITH AI'}
                </button>
            </div>

            <DetailedFeedbackModal
                open={detailedFeedbackOpen}
                onOpenChange={setDetailedFeedbackOpen}
                detailedFeedback={evaluation?.detailedFeedback}
                weakArguments={evaluation?.weakArguments}
            />
        </aside>
    );
});
