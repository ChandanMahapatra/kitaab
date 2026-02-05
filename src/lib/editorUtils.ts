import { $getSelection, $isRangeSelection, LexicalNode } from "lexical";

/**
 * Get the selected node from a Lexical selection.
 * Returns the anchor or focus node depending on selection direction.
 */
export function getSelectedNode(selection: ReturnType<typeof $getSelection>): LexicalNode | null {
    if (!$isRangeSelection(selection)) return null;
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();
    if (anchorNode === focusNode) return anchorNode;
    const isBackward = selection.isBackward();
    return isBackward ? focusNode : anchorNode;
}
