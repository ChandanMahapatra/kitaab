import { useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { AnalysisResult, Issue } from "@/lib/analysis";
import { evaluateText, EvaluationResult, providers } from "@/lib/ai";
import { loadSettings } from "@/lib/storage";
import { Zap, Loader2, CheckCircle2, AlertTriangle, MessageSquare } from "lucide-react";

interface SidebarProps {
    analysis: AnalysisResult | null;
    onHoverIssue?: (type: string | null) => void;
}

export function Sidebar({ analysis, onHoverIssue }: SidebarProps) {
    const [editor] = useLexicalComposerContext();
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Safe defaults
    const score = analysis?.score ?? 100;
    const gradeLevel = analysis?.gradeLevel ?? 0;
    const fleschScore = analysis?.fleschScore ?? 0;

    // Group issues
    const issuesByType = analysis?.issues.reduce((acc, issue) => {
        if (!acc[issue.type]) acc[issue.type] = [];
        acc[issue.type].push(issue);
        return acc;
    }, {} as Record<string, Issue[]>) ?? {};

    const gaugeRotation = (score / 100) * 180;

    const getIssueColor = (type: string) => {
        switch (type) {
            case 'complex': return 'muted-red';
            case 'hardWord': return 'muted-purple';
            case 'adverb': return 'muted-blue';
            case 'passive': return 'muted-blue';
            default: return 'muted-amber';
        }
    };

    const getIssueLabel = (type: string) => {
        switch (type) {
            case 'complex': return 'Hard Sentences';
            case 'hardWord': return 'Complex Words';
            case 'adverb': return 'Adverbs';
            case 'passive': return 'Passive Voice';
            case 'qualifier': return 'Weak Qualifiers';
            default: return type;
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

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Analysis failed");
        } finally {
            setIsEvaluating(false);
        }
    };

    return (
        <aside className="w-80 border-l border-neutral-200 dark:border-neutral-800 flex flex-col bg-sidebar-light dark:bg-sidebar-dark h-full">
            {/* Top Section: Analysis Score */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Analysis</h2>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-muted-emerald border border-muted-emerald/30 px-1.5 py-0.5 rounded">
                        LIVE
                    </span>
                </div>

                {/* Gauge */}
                <div className="flex flex-col items-center justify-center py-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-lg border border-neutral-200 dark:border-neutral-800 mb-6">
                    <div className="relative w-32 h-16 overflow-hidden">
                        <svg viewBox="0 0 100 50" className="w-full h-full">
                            <path d="M 10 50 A 40 40 0 0 1 90 50" strokeWidth="10" stroke="#e5e7eb" fill="none" className="dark:stroke-neutral-700" />
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
                            <span className="text-2xl font-bold leading-none text-neutral-700 dark:text-neutral-200">{score}</span>
                            <span className="text-[10px] text-neutral-500 font-semibold uppercase">Score</span>
                        </div>
                    </div>
                    <p className="text-xs font-medium text-neutral-400 mt-2">
                        {score > 80 ? 'Good Readability' : score > 50 ? 'Needs Improvement' : 'Hard to Read'}
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500">Grade Level</span>
                        <span className="font-bold text-primary">Grade {gradeLevel}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500">Flesch Score</span>
                        <span className="font-bold text-neutral-600 dark:text-neutral-300">{fleschScore}</span>
                    </div>
                </div>
            </div>

            {/* Issues Section */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Writing Issues</h3>
                {Object.keys(issuesByType).length === 0 && !evaluation && (
                    <div className="text-xs text-neutral-400 text-center py-8">
                        No issues detected. Good job!
                    </div>
                )}

                {Object.entries(issuesByType).map(([type, issues]) => {
                    const colorClass = `text-${getIssueColor(type)}`;
                    const bgClass = `bg-${getIssueColor(type)}/10`;
                    const borderClass = `border-${getIssueColor(type)}/20`;

                    return (
                        <div
                            key={type}
                            className={`p-3 ${bgClass} border ${borderClass} rounded-lg group hover:border-${getIssueColor(type)}/40 transition-colors cursor-pointer`}
                            onMouseEnter={() => onHoverIssue?.(type)}
                            onMouseLeave={() => onHoverIssue?.(null)}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-xs font-bold ${colorClass} capitalize`}>{getIssueLabel(type)}</span>
                                <span className={`text-xs font-bold ${colorClass} ${bgClass} px-1.5 rounded`}>{issues.length}</span>
                            </div>
                            {issues[0]?.suggestion && (
                                <p className="text-[11px] text-neutral-500">{issues[0].suggestion}</p>
                            )}
                        </div>
                    );
                })}

                {/* AI Evaluation Results */}
                {evaluation && (
                    <div className="mt-6 border-t border-neutral-200 dark:border-neutral-800 pt-6">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-4">AI Feedback</h3>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="text-center p-2 bg-neutral-100 dark:bg-neutral-800 rounded">
                                <div className="text-xs font-bold text-neutral-600 dark:text-neutral-300">{evaluation.scores.grammar}</div>
                                <div className="text-[9px] text-neutral-400 uppercase">Grammar</div>
                            </div>
                            <div className="text-center p-2 bg-neutral-100 dark:bg-neutral-800 rounded">
                                <div className="text-xs font-bold text-neutral-600 dark:text-neutral-300">{evaluation.scores.clarity}</div>
                                <div className="text-[9px] text-neutral-400 uppercase">Clarity</div>
                            </div>
                            <div className="text-center p-2 bg-neutral-100 dark:bg-neutral-800 rounded">
                                <div className="text-xs font-bold text-neutral-600 dark:text-neutral-300">{evaluation.scores.overall}</div>
                                <div className="text-[9px] text-neutral-400 uppercase">Overall</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {evaluation.suggestions.map((suggestion, idx) => (
                                <div key={idx} className="flex gap-2 text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded border border-neutral-100 dark:border-neutral-800">
                                    <MessageSquare className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                                    <span>{suggestion}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom AI Section */}
            <div className="p-6 border-t border-neutral-200 dark:border-neutral-800">
                {error && (
                    <div className="mb-3 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        {error}
                    </div>
                )}

                <button
                    onClick={handleAnalyze}
                    disabled={isEvaluating}
                    className="w-full py-3 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black hover:opacity-90 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
