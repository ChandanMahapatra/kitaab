"use client";

import { useRef, useState, useEffect } from "react";
import { DraggableBlockPlugin_EXPERIMENTAL } from "@lexical/react/LexicalDraggableBlockPlugin";
import { GripVertical } from "lucide-react";

const DRAGGABLE_BLOCK_MENU_CLASSNAME = "draggable-block-menu";

function isOnMenu(element: HTMLElement): boolean {
    return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

export default function DraggableBlockPlugin({
    anchorElem,
}: {
    anchorElem?: HTMLElement;
}) {
    const menuRef = useRef<HTMLDivElement>(null);
    const targetLineRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <DraggableBlockPlugin_EXPERIMENTAL
            anchorElem={anchorElem}
            menuRef={menuRef}
            targetLineRef={targetLineRef}
            menuComponent={
                <div
                    ref={menuRef}
                    className={`${DRAGGABLE_BLOCK_MENU_CLASSNAME} absolute left-0 top-0 cursor-grab rounded p-0.5 opacity-0 will-change-transform hover:bg-[var(--sidebar-bg)] active:cursor-grabbing`}
                >
                    <GripVertical className="w-4 h-4 text-[var(--foreground)] opacity-40" />
                </div>
            }
            targetLineComponent={
                <div
                    ref={targetLineRef}
                    className="draggable-block-target-line pointer-events-none absolute left-0 top-0 h-1 rounded bg-[var(--color-primary)] opacity-0 will-change-transform"
                />
            }
            isOnMenu={isOnMenu}
        />
    );
}
