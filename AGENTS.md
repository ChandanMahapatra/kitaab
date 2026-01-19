---
name: kitaab-project
description: Context and guidelines for working on the Kitaab Privacy-First Markdown Editor project.
---

# Kitaab Project Context

This document provides context, conventions, and guidelines for agents working on the Kitaab markdown editor.

## Project Overview

**Kitaab** is a privacy-first, local-first markdown editor built with:
- Next.js 15.1+ with App Router
- React 19 with TypeScript
- Lexical editor framework
- Base UI component library
- Tailwind CSS 4 for styling
- IndexedDB for local storage

## Technology Stack

### Core Framework
- **Next.js 15.1+** with App Router, `output: 'export'` for static deployment
- **React 19.1+** with strict TypeScript 5

### UI Components
- **Base UI** (`@base-ui-components/react`) for primitives:
  - `Dialog` for modals (Settings modal)
  - `Select` for dropdowns (provider/model selection)
  - `Field` for form fields
- **Lucide React** for icons (replace emoji icons)

### Editor
- **Lexical** (`lexical`, `@lexical/react`) for markdown editing
- `@lexical/markdown` for markdown import/export
- Custom `HighlightNode` for issue highlighting

### Styling
- **Tailwind CSS 4** with CSS variables for theming
- **CSS Variables** for light/dark theme colors
- Vercel-inspired design system

### Storage & Utilities
- **idb** for IndexedDB operations
- **markdown-it** for HTML conversion
- **jsPDF + html2canvas** for PDF export

### Testing
- **Vitest** for unit tests (`src/__tests__/`)
- **@testing-library/react** for component tests
- **axe-core** for accessibility testing

## Code Style & Conventions

### File Organization
```
src/
├── app/
│   ├── page.tsx         # Main editor page
│   ├── layout.tsx       # Root layout with theme init
│   └── globals.css      # Global styles, CSS variables
├── components/
│   ├── LexicalEditor.tsx    # Main editor component
│   ├── EditorToolbar.tsx    # Toolbar with formatting actions
│   ├── AnalysisPanel.tsx    # Side panel with metrics
│   ├── SettingsModal.tsx    # AI provider settings
│   ├── PreviewToggle.tsx    # Edit/preview toggle
│   ├── MarkdownPreview.tsx  # Markdown preview component
│   ├── WritingIssuesPlugin.tsx  # Issue highlighting
│   ├── HighlightNode.ts     # Custom Lexical node
│   └── ContentUpdatePlugin.tsx  # Content initialization
└── lib/
    ├── analysis.ts      # Text analysis algorithms
    ├── ai.ts            # AI provider integration
    ├── storage.ts       # IndexedDB operations
    └── export.ts        # Export functionality
```

### Component Patterns

**React Hooks Usage:**
- Use `useState` for local component state
- Use `useCallback` for event handlers and callbacks
- Use `useEffect` for side effects (theme, auto-save)
- Use `useMemo` for expensive computations

**Callback Signatures:**
```typescript
// Editor content changes
onChange: (markdown: string, plainText: string) => void

// Modal open/close
onOpenChange: (open: boolean) => void

// Issue hover interaction
onIssueHover: (issue: Issue | null) => void
```

**Type Definitions:**
- Use interfaces for object types
- Export all public interfaces
- Place shared types in component files or `lib/` directory

### Lexical Editor Configuration

**Theme Object Pattern:**
```typescript
const editorTheme = {
    paragraph: 'editor-paragraph',
    text: {
        bold: 'editor-text-bold',
        italic: 'editor-text-italic',
        // ...
    },
    heading: {
        h1: 'editor-heading-h1',
        // ...
    },
    // ...
};
```

**Custom Node Registration:**
```typescript
const initialConfig = {
    namespace: 'KitaabEditor',
    theme: editorTheme,
    onError: (error: Error) => console.error(error),
    nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        CodeNode,
        LinkNode,
        AutoLinkNode,
        HighlightNode,
    ],
};
```

### CSS Variables (Theming)

**Light Theme (default):**
```css
:root {
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #fafafa;
    --color-bg-tertiary: #f5f5f5;
    --color-text-primary: #171717;
    --color-text-secondary: #525252;
    --color-text-tertiary: #737373;
    --color-border-primary: rgba(0, 0, 0, 0.08);
    --color-accent: #0070f3;
    --color-success: #10b981;
    --color-warning: #f59e0b;
    --color-error: #ef4444;
    --radius-md: 8px;
    --transition-fast: 150ms ease-out;
}
```

**Dark Theme (`.dark` class):**
- Invert background colors (#0a0a0a, #141414, #1a1a1a)
- Invert text colors (#ededed, #a3a3a3)
- Keep accent as blue (#3b82f6)

### Accessibility Requirements

- **Focus management**: Use visible focus indicators
- **ARIA labels**: Required on all icon-only buttons
- **Keyboard navigation**: Support Tab, Enter, Escape
- **Screen readers**: Use semantic HTML elements
- **Contrast ratios**: WCAG AA minimum (4.5:1)
- **Reduced motion**: Respect `prefers-reduced-motion`

### Import Conventions

**Path aliases:**
- Use `@/` prefix for src imports (`@/components/`, `@/lib/`)

**Import order:**
1. React imports
2. Third-party libraries
3. Lexical packages
4. Internal components (`@/components/`)
5. Internal utilities (`@/lib/`)

```typescript
import { useState, useCallback } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { HeadingNode } from '@lexical/rich-text';
import { LexicalEditor } from '@/components/LexicalEditor';
import { analyzeText } from '@/lib/analysis';
```

## Implementation Guidelines

### Adding New Features

1. **Follow existing patterns**: Match the style of similar components
2. **Use Base UI primitives**: For accessible interactive components
3. **Add TypeScript types**: All props and return values typed
4. **Write tests**: Add unit tests in `src/__tests__/`
5. **Update globals.css**: Add CSS variables for new design tokens

### State Management

- **Local state**: `useState` in individual components
- **Cross-component state**: Lift to common ancestor (page.tsx)
- **Persistent state**: IndexedDB via `lib/storage.ts`
- **No external state library**: Keep it simple

### Event Handling

- **Debounce**: Text analysis (300ms), auto-save (500ms)
- **Error handling**: Console log errors, show user-friendly messages
- **Loading states**: Use `isLoading` / `isProcessing` flags

### Export Functionality

- **Markdown**: Raw text download
- **HTML**: Styled HTML with markdown-it
- **PDF**: Multi-page A4 using jsPDF + html2canvas

## GitHub Actions Deployment

**Workflow file:** `.github/workflows/deploy.yml`

**Build configuration:**
```yaml
NEXT_TELEMETRY_DISABLED: 1
npm run build  # Outputs to ./out directory
```

**Deployment target:** GitHub Pages (`output: 'export'`)

## Testing Requirements

**Test files location:** `src/__tests__/`

**Test patterns:**
- Unit tests for `lib/` functions
- Component tests with React Testing Library
- Accessibility tests with axe-core

**Run tests:**
```bash
npm test          # Run all tests
npm run test:ui   # Run with UI
```

## Privacy & Security

- **No telemetry**: `NEXT_TELEMETRY_DISABLED=1`
- **Local-first**: All data stored in browser (IndexedDB)
- **API keys**: Stored only in IndexedDB, never sent to third parties
- **No server processing**: All analysis runs client-side

## UI Skills (Applied to All UI Work)

When working on UI components, follow these constraints:

### Stack
- Use Tailwind CSS defaults unless custom values exist
- Use `cn` utility (`clsx` + `tailwind-merge`) for class logic

### Components
- Use Base UI for accessible primitives (Dialog, Select, Menu)
- Never mix primitive systems within same interaction surface
- Add `aria-label` to icon-only buttons

### Interaction
- Use AlertDialog for destructive actions
- Never block paste in inputs
- Show errors next to where action happens

### Animation
- Never add animation unless explicitly requested
- Animate only compositor props (`transform`, `opacity`)
- Respect `prefers-reduced-motion`
- Max 200ms for interaction feedback

### Typography
- Use `text-balance` for headings
- Use `tabular-nums` for data displays

### Layout
- Use fixed z-index scale (no arbitrary `z-*`)
- Use `size-*` for square elements

## Common Tasks Reference

### Adding a New Export Format
1. Add function to `src/lib/export.ts`
2. Add button/menu item to toolbar
3. Update SettingsModal if needed

### Adding New AI Provider
1. Add provider to `providers` array in `src/lib/ai.ts`
2. Add model options to provider
3. Test connection logic

### Adding New Analysis Metric
1. Add algorithm to `src/lib/analysis.ts`
2. Update `TextAnalysis` interface
3. Add to AnalysisPanel display
4. Add unit tests

### Modifying Theme Colors
1. Update CSS variables in `src/app/globals.css`
2. Update both `:root` and `.dark` sections
3. Test in both themes

---

## Quick Reference: File Modification Rules

| File Type | Modification Rule |
|-----------|-------------------|
| `src/app/page.tsx` | Main state container, theme toggle |
| `src/components/*.tsx` | UI components with Base UI |
| `src/lib/*.ts` | Pure functions, no React dependencies |
| `src/app/globals.css` | CSS variables, component styles |
| `.github/workflows/*.yml` | CI/CD configuration |
| `package.json` | Add dependencies only when needed |

## Don't Forget

- [ ] Run `npm test` after changes
- [ ] Run `npm run lint` before committing
- [ ] Test in both light and dark modes
- [ ] Test keyboard navigation
- [ ] Verify accessibility with screen reader
- [ ] Check mobile responsiveness
