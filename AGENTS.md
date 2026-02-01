---
name: kitaab-project
description: Context and guidelines for working on the Kitaab Privacy-First Markdown Editor project.
---

# Kitaab Project Context

This document provides context, conventions, and guidelines for agents working on the Kitaab markdown editor.

## Agent Instructions: Skills & Capabilities

**Attention: Antigravity / Gemini Agents**
You are required to utilize the specialized skills defined in the `.opencode/skills` directory. These skills contain detailed constraints and best practices that supersede general knowledge.

### 1. React & Next.js Best Practices
**Source:** `.opencode/skills/react-best-practices/SKILL.md`
**When to apply:**
- Writing or refactoring React components.
- Implementing data fetching or server actions.
- Optimizing performance (Core Web Vitals).
- **Action:** Read the SKILL.md file if you are performing any of the above tasks.

### 2. UI Engineering & Design
**Source:** `.opencode/skills/ui-skills/SKILL.md`
**When to apply:**
- Creating or styling UI components.
- Implementing animations (framer-motion, tailwind).
- Ensuring accessibility compliance.
- **Action:** You must strictly follow the "Opinionated Constraints" in this skill for all UI work.

---

## Project Overview

**Kitaab** is a privacy-first, local-first markdown editor built with Next.js, React, and Lexical. It features a premium, minimalist design with real-time writing analysis and optional AI integration.

## Technology Stack

### Core Framework
- **Next.js 15.1+** with App Router, `output: 'export'` for static deployment
- **React 19+** with strict TypeScript 5

### UI Components & Styling
- **Tailwind CSS 4**: Used for all styling.
- **Base UI** (`@base-ui-components/react`): For accessible primitives (Dialog, Select, etc.).
- **Icons**: Material Icons (Round) for a consistent look matching the design. `class="material-icons-round"`.
- **Fonts**:
  - Headings/Body: `Lato` (Google Fonts)
  - Code/Editor: `IBM Plex Mono` (Google Fonts)

### Editor Engine
- **Lexical** (`lexical`, `@lexical/react`) for the core editor.
- **Markdown**: Custom plugins to handle markdown parsing and highlighting.

### Storage & Logic
- **idb**: IndexedDB for local storage of documents and settings.
- **Analysis**: Custom TypeScript algorithms (run on main thread or worker).

## Design System (Mandatory)

The design must strictly follow the aesthetics defined in `code.html`.

### Color Palette
**Primary Theme**
- **Primary (Steel Blue)**: `#546e7a`
- **Background Light**: `#f5f5f5`
- **Background Dark**: `#121212`

**Sidebar & Panels**
- **Sidebar Light**: `#eeeeee`
- **Sidebar Dark**: `#1a1a1a`

**Analysis Indicators (Muted Palette)**
- **Red (Critical)**: `#e57373` (BG: rgba(229, 115, 115, 0.15)) - Used for "Very Hard to Read"
- **Amber (Warning)**: `#ffb74d` (BG: rgba(255, 183, 77, 0.15)) - Used for "Hard to Read"
- **Purple (Suggestion)**: `#ba68c8` (BG: rgba(186, 104, 200, 0.15)) - Used for "Complex Words"
- **Blue (Info)**: `#64b5f6` (BG: rgba(100, 181, 246, 0.15)) - Used for "Adverbs / Passive"
- **Emerald (Success)**: `#81c784` - Used for "Live" status and high scores.

### Typography
- **Headings**: `font-family: 'Lato', sans-serif; font-weight: 700;`
- **Body**: `font-family: 'Lato', sans-serif;`
- **Editor/Code**: `font-family: 'IBM Plex Mono', monospace;`

### Layout Structure
1.  **Header**: `h-14`, border-bottom.
    - Left: Logo (w-8 h-8 rounded bg-primary), Title "Untitled draft", Toolbar icons.
    - Right: Settings icon, Export button (primary color).
2.  **Main Area**: Flex container.
    - **Editor/Preview**: Centered, max-w-3xl.
    - **Sidebar**: Right side, `w-80`, border-left.
3.  **Sidebar Components**:
    - **Score Gauge**: Top section. A custom semi-circle gauge displaying the Writing Score (0-100).
    - **Metrics**: Grade Level (e.g., "Grade 8") and Flesch Score (e.g., "46.1").
    - **Issue Cards**: Stacked cards using the Muted Palette. Each card shows the issue type, count, and short instruction.
    - **AI Section**: Bottom of sidebar. Button to "Analyze with AI".
4.  **Footer**: `h-10`, border-top.
    - Left: Stats (Characters, Words, Reading Time).
    - Right: Online status.

## Core Logic & Algorithms

Implementation must adhere to `logic.md`.

### 1. Local Analysis (Real-time)
Located in `src/lib/analysis.ts`.

**Algorithms**:
- **Syllable Counting**: Regex-based approach handling exceptions.
- **Flesch Reading Ease**: `206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)`
- **Grade Level**: `4.71 * (letters/words) + 0.5 * (words/sentences) - 21.43`
- **Reading Time**: `words / 250` (minutes).

**Issue Detection**:
- **Adverbs**: Ends in `-ly` (regex).
- **Passive Voice**: `to be` verb + past participle (regex).
- **Complex Sentences**: > 25 words.
- **Complex Words**: 4+ syllables (or specific list).
- **Weak Qualifiers**: List based (e.g., "I think", "maybe").

**Scoring System (0-100)**:
Start at 100. Apply penalties:
- Adverbs: -2 pts each (after first 2).
- Passive: -2 pts each (after first 4).
- Hard Words (3 syl): Weight of 15.
- Very Hard Words (4 syl): Weight of 25.
- Complex Sentences: -1 pt each.

### 2. AI Integration
Located in `src/lib/ai.ts`.

**Providers**:
- **OpenAI**: `gpt-4`, `gpt-3.5-turbo`
- **Anthropic**: `claude-3-sonnet`, `claude-3-haiku`
- **OpenRouter**: Aggregator for multiple models.

**Features**:
- **Evaluation**: Send text to LLM to get Grammar (0-100), Clarity (0-100), Overall (0-100) and 3 bullet-point suggestions.
- **Privacy**: API keys stored strictly in IndexedDB. No server-side relay.

## Implementation Guidelines

### File Structure
```
src/
├── app/
│   ├── page.tsx         # Main layout integration
│   ├── globals.css      # CSS variables (colors from code.html)
│   └── layout.tsx
├── components/
│   ├── editor/
│   │   ├── Editor.tsx       # Lexical instance
│   │   └── Toolbar.tsx
│   ├── analysis/
│   │   ├── Sidebar.tsx      # Main right sidebar
│   │   ├── ScoreGauge.tsx   # Visual score indicator
│   │   └── IssueCard.tsx    # Reusable issue display
│   └── icons/               # If not using Material Icons font directly
├── lib/
│   ├── analysis.ts      # Core algorithms
│   ├── ai.ts            # LLM integration
│   └── storage.ts       # idb wrapper
```

### Development Rules
1.  **Visual Fidelity**: Always compare implementation against `code.html`. The goal is to look *exactly* like that template.
2.  **Responsiveness**: Editor area is fluid, Sidebar is fixed width (hidden/drawer on mobile).
3.  **State Management**: Use React Context or simple prop drilling for Editor <-> Sidebar communication. Analysis runs in `useEffect` with debounce (300ms).
4.  **Testing**:
    - Unit test `analysis.ts` heavily (it's pure logic).
    - Component test `Sidebar` for rendering correct stats.

## Feature Checklist (Quick Ref)

- [ ] **Editor**: Markdown support, spell check, placeholder.
- [ ] **Analysis Sidebar**: Real-time updates of Score, Grade, Flesch.
- [ ] **Visual Highlights**: Highlight adverbs (blue), complex sentences (red/amber) in the text itself.
- [ ] **Settings**: Modal to configure AI API keys.
- [ ] **Export**: PDF, Markdown, HTML export.
- [ ] **Theme**: Light/Dark mode toggle (using Tailwind `dark:` classes).

---
*Refer to `code.html` for any DOM structure or CSS class ambiguity. Refer to `logic.md` for exact formulas.*
