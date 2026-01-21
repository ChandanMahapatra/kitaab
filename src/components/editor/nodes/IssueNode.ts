import {
    TextNode,
    NodeKey,
    EditorConfig,
    SerializedTextNode,
    Spread,
} from "lexical";

export type SerializedIssueNode = Spread<
    {
        issueType: string;
    },
    SerializedTextNode
>;

export class IssueNode extends TextNode {
    __issueType: string;

    static getType(): string {
        return "issue";
    }

    static clone(node: IssueNode): IssueNode {
        return new IssueNode(node.getTextContent(), node.__issueType, node.__key);
    }

    constructor(text: string, issueType: string, key?: NodeKey) {
        super(text, key);
        this.__issueType = issueType;
    }

    createDOM(config: EditorConfig): HTMLElement {
        const dom = super.createDOM(config);
        const issueClass = `issue-highlight-${this.__issueType === 'adverb' || this.__issueType === 'passive' ? 'blue' :
            this.__issueType === 'complex' ? 'red' :
                this.__issueType === 'hardWord' ? 'purple' : 'amber'}`;
        dom.classList.add(issueClass);
        return dom;
    }

    updateDOM(prevNode: IssueNode, dom: HTMLElement, config: EditorConfig): boolean {
        const isUpdated = super.updateDOM(prevNode as any, dom, config);
        if (prevNode.__issueType !== this.__issueType) {
            // Simple class replacement strategy would be needed if type updates, 
            // but typically nodes are replaced.
            return true;
        }
        return isUpdated;
    }

    static importJSON(serializedNode: SerializedIssueNode): IssueNode {
        const node = $createIssueNode(
            serializedNode.text,
            serializedNode.issueType
        );
        node.setFormat(serializedNode.format);
        node.setDetail(serializedNode.detail);
        node.setMode(serializedNode.mode);
        node.setStyle(serializedNode.style);
        return node;
    }

    exportJSON(): SerializedIssueNode {
        return {
            ...super.exportJSON(),
            issueType: this.__issueType,
            type: "issue",
            version: 1,
        };
    }
}

export function $createIssueNode(text: string, issueType: string): IssueNode {
    return new IssueNode(text, issueType);
}

export function $isIssueNode(node: any): node is IssueNode {
    return node instanceof IssueNode;
}
