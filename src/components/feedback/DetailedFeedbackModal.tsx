"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertTriangle } from "lucide-react";
import { FeedbackPoint } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface DetailedFeedbackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    detailedFeedback?: FeedbackPoint[];
    weakArguments?: string[];
}

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
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[800px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-[var(--background)] border border-[var(--border-color)] p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50 text-[var(--foreground)] overflow-y-auto">
                    <Dialog.Title className="m-0 text-[17px] font-medium mb-4">
                        Writing Feedback
                    </Dialog.Title>

                    {!hasContent ? (
                        <div className="text-center py-8 text-sm opacity-50">
                            No detailed feedback available. Run the AI analysis to get feedback.
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {Object.entries(groupedFeedback).map(([category, points]) => (
                                <div key={category}>
                                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3">
                                        {categoryLabels[category as FeedbackPoint['category']] || category}
                                    </h3>
                                    <div className="divide-y divide-[var(--border-color)]">
                                        {points.map((point, idx) => (
                                            <div key={idx} className="py-3 first:pt-0 last:pb-0">
                                                <div className="flex items-start gap-3">
                                                    <span className={cn(
                                                        "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5",
                                                        severityColors[point.severity]
                                                    )}>
                                                        {point.severity.toUpperCase()}
                                                    </span>
                                                    <div>
                                                        <p className="text-sm opacity-80">{point.issue}</p>
                                                        <p className="text-sm opacity-50 mt-1">
                                                            {point.suggestion}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {weakArguments && weakArguments.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-50 mb-3 flex items-center gap-2 text-amber-500">
                                        <AlertTriangle className="w-3 h-3" />
                                        Weak Arguments
                                    </h3>
                                    <div className="divide-y divide-[var(--border-color)]">
                                        {weakArguments.map((arg, idx) => (
                                            <div key={idx} className="py-3 first:pt-0 last:pb-0">
                                                <p className="text-sm opacity-70">{arg}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
