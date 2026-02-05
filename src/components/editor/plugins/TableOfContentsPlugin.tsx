"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useState, useCallback, useRef } from "react";
import { $getRoot, $isElementNode, LexicalNode } from "lexical";
import { $isHeadingNode, HeadingTagType } from "@lexical/rich-text";

interface HeadingEntry {
    key: string;
    text: string;
    tag: HeadingTagType;
    level: number;
}

interface TableOfContentsPluginProps {
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function TableOfContentsPlugin({ scrollContainerRef }: TableOfContentsPluginProps) {
    const [editor] = useLexicalComposerContext();
    const [headings, setHeadings] = useState<HeadingEntry[]>([]);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [isContainerHovered, setIsContainerHovered] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Extract headings from the editor
    const extractHeadings = useCallback(() => {
        editor.getEditorState().read(() => {
            const root = $getRoot();
            const extractedHeadings: HeadingEntry[] = [];

            const traverse = (node: LexicalNode) => {
                if ($isHeadingNode(node)) {
                    const tag = node.getTag();
                    const level = parseInt(tag.replace("h", ""), 10);
                    const text = node.getTextContent().trim();
                    if (text) {
                        extractedHeadings.push({
                            key: node.getKey(),
                            text,
                            tag,
                            level,
                        });
                    }
                }
                if ($isElementNode(node)) {
                    node.getChildren().forEach(traverse);
                }
            };

            root.getChildren().forEach(traverse);
            setHeadings(extractedHeadings);
        });
    }, [editor]);

    // Listen for editor updates
    useEffect(() => {
        extractHeadings();

        const unregister = editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
            if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                extractHeadings();
            }, 300);
        });

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            unregister();
        };
    }, [editor, extractHeadings]);

    // Scroll to heading when clicked or activated with keyboard
    const scrollToHeading = useCallback(
        (key: string) => {
            const scrollContainer = scrollContainerRef.current;
            if (!scrollContainer) return;

            editor.getEditorState().read(() => {
                const node = editor.getElementByKey(key);
                if (node) {
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const nodeRect = node.getBoundingClientRect();
                    const scrollTop = scrollContainer.scrollTop + nodeRect.top - containerRect.top - 80;

                    scrollContainer.scrollTo({
                        top: scrollTop,
                        behavior: "smooth",
                    });
                }
            });
        },
        [editor, scrollContainerRef]
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent, key: string) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                scrollToHeading(key);
            }
        },
        [scrollToHeading]
    );

    if (headings.length === 0) return null;

    // Line widths based on heading level (h1=longest, h6=shortest)
    const getLineWidth = (level: number): number => {
        const widths: Record<number, number> = {
            1: 20,
            2: 16,
            3: 12,
            4: 9,
            5: 7,
            6: 5,
        };
        return widths[level] || 10;
    };

    return (
        <nav
            className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col items-end z-20 py-4"
            aria-label="Table of Contents"
            onMouseEnter={() => setIsContainerHovered(true)}
            onMouseLeave={() => {
                setIsContainerHovered(false);
                setHoveredIndex(null);
            }}
        >
            <div className="flex flex-col gap-[10px]" role="list">
                {headings.map((heading, index) => {
                    const isHovered = hoveredIndex === index;
                    const baseLineWidth = getLineWidth(heading.level);
                    const lineWidth = isHovered ? baseLineWidth + 8 : baseLineWidth;
                    const opacity = isContainerHovered
                        ? isHovered
                            ? 1
                            : 0.35
                        : 0.15;

                    // Use accent color on hover, foreground otherwise
                    const lineColor = isHovered ? "var(--accent)" : "var(--foreground)";

                    return (
                        <div
                            key={heading.key}
                            className="relative flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--foreground)] focus:ring-opacity-50 rounded py-1 px-2 -ml-2"
                            role="listitem"
                            tabIndex={0}
                            aria-label={`Jump to ${heading.text}`}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            onClick={() => scrollToHeading(heading.key)}
                            onKeyDown={(e) => handleKeyDown(e, heading.key)}
                        >
                            {/* The line */}
                            <div
                                className="h-[2px] rounded-full transition-all duration-200 ease-out"
                                style={{
                                    width: `${lineWidth}px`,
                                    backgroundColor: lineColor,
                                    opacity,
                                }}
                            />

                            {/* Tooltip showing heading text on hover */}
                            {isHovered && (
                                <div
                                    className="absolute left-full ml-3 px-2.5 py-1.5 text-xs font-medium bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none"
                                    style={{ color: "var(--foreground)" }}
                                >
                                    {heading.text.length > 50
                                        ? `${heading.text.slice(0, 50)}...`
                                        : heading.text}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}
