"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, BookOpen, AlertTriangle, Lightbulb } from "lucide-react";
import { FeedbackPoint } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface DetailedFeedbackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    detailedFeedback?: FeedbackPoint[];
    weakArguments?: string[];
}

const sourceInfo: Record<string, { name: string; short: string; color: string }> = {
    king: { name: "On Writing (Stephen King)", short: "King", color: "text-blue-500" },
    strunk: { name: "The Elements of Style (Strunk & White)", short: "Strunk", color: "text-emerald-500" },
    pinker: { name: "The Sense of Style (Steven Pinker)", short: "Pinker", color: "text-purple-500" },
};

const categoryLabels: Record<FeedbackPoint['category'], string> = {
    'style': 'Style',
    'clarity': 'Clarity',
    'argument': 'Argument',
    'structure': 'Structure',
    'word-choice': 'Word Choice',
};

const severityColors: Record<FeedbackPoint['severity'], string> = {
    high: 'bg-red-500/20 text-red-600 dark:text-red-400',
    medium: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    low: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
};

export function DetailedFeedbackModal({ open, onOpenChange, detailedFeedback, weakArguments }: DetailedFeedbackModalProps) {
    const groupedFeedback = React.useMemo(() => {
        if (!detailedFeedback) return {};
        return detailedFeedback.reduce((acc, point) => {
            if (!acc[point.category]) acc[point.category] = [];
            acc[point.category].push(point);
            return acc;
        }, {} as Record<string, FeedbackPoint[]>);
    }, [detailedFeedback]);

    const hasContent = (detailedFeedback?.length ?? 0) > 0 || (weakArguments?.length ?? 0) > 0;

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-[var(--background)] border border-[var(--border-color)] p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50 text-[var(--foreground)] overflow-y-auto">
                    <Dialog.Title className="m-0 text-[17px] font-medium mb-2 flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Detailed Writing Feedback
                    </Dialog.Title>
                    <Dialog.Description className="text-xs opacity-60 mb-4">
                        Opinionated feedback based on On Writing, The Elements of Style, and The Sense of Style
                    </Dialog.Description>

                    {!hasContent ? (
                        <div className="text-center py-8 text-sm opacity-50">
                            No detailed feedback available. Run the AI analysis to get feedback.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedFeedback).map(([category, points]) => (
                                <div key={category} className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                                        <Lightbulb className="w-3 h-3" />
                                        {categoryLabels[category as FeedbackPoint['category']] || category}
                                    </h3>
                                    <div className="space-y-2">
                                        {points.map((point, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 border border-[var(--border-color)] rounded-lg bg-[var(--sidebar-bg)]"
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={cn(
                                                            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                                                            severityColors[point.severity]
                                                        )}>
                                                            {point.severity.toUpperCase()}
                                                        </span>
                                                        {point.source && (
                                                            <span className={cn(
                                                                "text-[10px] font-medium",
                                                                sourceInfo[point.source]?.color || "opacity-60"
                                                            )}>
                                                                {sourceInfo[point.source]?.short || point.source}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-sm mb-2">
                                                    <span className="font-semibold text-red-500/80">Issue:</span>{" "}
                                                    <span className="opacity-80">{point.issue}</span>
                                                </p>
                                                <p className="text-sm">
                                                    <span className="font-semibold text-emerald-500/80">Fix:</span>{" "}
                                                    <span className="opacity-80">{point.suggestion}</span>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {weakArguments && weakArguments.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-2 text-amber-500">
                                        <AlertTriangle className="w-3 h-3" />
                                        Weak Arguments & Unsupported Claims
                                    </h3>
                                    <div className="space-y-2">
                                        {weakArguments.map((arg, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 border border-amber-500/30 rounded-lg bg-amber-500/5"
                                            >
                                                <p className="text-sm opacity-80">{arg}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-[var(--border-color)]">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Reference Books</h4>
                                <div className="flex flex-wrap gap-2 text-[10px]">
                                    <span className={sourceInfo.king.color}>{sourceInfo.king.name}</span>
                                    <span className="opacity-30">|</span>
                                    <span className={sourceInfo.strunk.color}>{sourceInfo.strunk.name}</span>
                                    <span className="opacity-30">|</span>
                                    <span className={sourceInfo.pinker.color}>{sourceInfo.pinker.name}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <Dialog.Close asChild>
                        <button
                            className="text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:shadow-neutral-400 absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
