import { useState, useEffect, useMemo } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { AnalysisResult, Issue } from "@/lib/analysis";
import { evaluateText, EvaluationResult, providers } from "@/lib/ai";
import { loadSettings, saveSettings } from "@/lib/storage";
import { Zap, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
    analysis: AnalysisResult | null;
    onHoverIssue?: (type: string | null) => void;
    onHoverHighlightChange?: (type: string | null) => void;
    onTokensUpdate?: (tokens: number) => void;
}

export function Sidebar({ analysis, onHoverIssue, onHoverHighlightChange, onTokensUpdate }: SidebarProps) {
    const [editor] = useLexicalComposerContext();
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hoverHighlightEnabled, setHoverHighlightEnabled] = useState(false);
    const [activeIssueTypes, setActiveIssueTypes] = useState<Set<Issue['type']>>(new Set());

    const score = analysis?.score ?? 100;
    const gradeLevel = analysis?.gradeLevel ?? 0;
    const fleschScore = analysis?.fleschScore ?? 0;

    useEffect(() => {
        const loadSettingsData = async () => {
            const settings = await loadSettings();
            setHoverHighlightEnabled(settings?.hoverHighlightEnabled ?? false);
        };
        loadSettingsData();
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

    const issuesByType = analysis?.issues.reduce((acc, issue) => {
        if (!acc[issue.type]) acc[issue.type] = [];
        acc[issue.type].push(issue);
        return acc;
    }, {} as Record<string, Issue[]>) ?? {};

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
            case 'veryComplex': return 'muted-red';
            case 'complex': return 'muted-amber';
            case 'hardWord': return 'muted-purple';
            case 'adverb': return 'muted-blue';
            case 'passive': return 'muted-emerald';
            case 'qualifier': return 'primary';
            default: return 'muted-amber';
        }
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
        if (!hoverHighlightEnabled) {
            document.documentElement.setAttribute('data-highlight-type', type);
        }
    };

    const handleHoverLeave = () => {
        onHoverIssue?.(null);
        onHoverHighlightChange?.(hoverHighlightEnabled ? '__all__' : null);
        if (!hoverHighlightEnabled) {
            document.documentElement.removeAttribute('data-highlight-type');
        }
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
            onTokensUpdate?.(newTotalTokens);

            await saveSettings({
                ...settings,
                tokensUsed: newTotalTokens,
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
                        <span className="opacity-50">Grade Level</span>
                        <span className="font-bold text-primary">Grade {gradeLevel}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="opacity-50">Flesch Score</span>
                        <span className="font-bold text-[var(--foreground)] opacity-80">{fleschScore}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-50 mb-2">Writing Issues</h3>
                {Object.keys(issuesByType).length === 0 && !evaluation && (
                    <div className="text-xs opacity-40 text-center py-6">
                        No issues detected. Good job!
                    </div>
                )}

                {Object.entries(issuesByType).map(([type, issues]) => {
                    const colorClass = `text-${getIssueColor(type)}`;
                    const isActive = activeIssueTypes.has(type as Issue['type']);

                    return (
                        <div
                            key={type}
                            className={cn(
                                "p-3 border border-[var(--border-color)] rounded-lg transition-colors cursor-pointer",
                                "hover:border-[var(--color-primary)] hover:bg-[var(--background)]",
                                hoverHighlightEnabled && !isActive && "opacity-50"
                            )}
                            onPointerEnter={() => handleHoverEnter(type)}
                            onPointerLeave={handleHoverLeave}
                            onClick={() => toggleIssueType(type as Issue['type'])}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-xs font-bold capitalize ${hoverHighlightEnabled ? colorClass : 'opacity-60'}`}>{getIssueLabel(type)}</span>
                                <span className={`text-xs font-bold ${hoverHighlightEnabled ? colorClass : 'opacity-40'} px-1.5 rounded`}>{issues.length}</span>
                            </div>
                            {issues[0]?.suggestion && (
                                <p className="text-[11px] opacity-40">{issues[0].suggestion}</p>
                            )}
                        </div>
                    );
                })}

                {evaluation && evaluation.suggestions.length > 0 && (
                    <div className="mt-4 border-t border-[var(--border-color)] pt-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest opacity-50 mb-3">AI Feedback</h3>
                        <div className="space-y-2">
                            {evaluation.suggestions.map((suggestion, idx) => (
                                <div key={idx} className="text-xs text-[var(--foreground)] opacity-80 py-1">
                                    {idx + 1}. {suggestion}
                                </div>
                            ))}
                        </div>
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
                    disabled={isEvaluating}
                    className={buttonClass}
                >
                    {isEvaluating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Zap className="w-3 h-3" />
                    )}
                    {isEvaluating ? 'ANALYZING...' : 'ANALYZE WITH AI'}
                </button>
            </div>
        </aside>
    );
}
