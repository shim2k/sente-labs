# DOM Extraction System

Fast, lightweight DOM extraction for AI-powered web automation.

## Overview

Simple DOM cleaning that removes noise while preserving essential content:
- ⚡ **Fast**: ~50ms extraction time
- 🧹 **Clean**: Removes scripts, styles, hidden elements
- 📦 **Simple**: Returns clean HTML directly
- 💾 **Efficient**: Low memory usage

## Architecture

```
┌─────────────────────────────┐
│    MinimizationDOMStrategy  │
│  • Remove scripts & styles  │  
│  • Filter hidden elements   │
│  • Apply token budget       │
│  • Return clean HTML        │
└─────────────────────────────┘
```

## Usage

```typescript
import { MinimizationDOMStrategy } from './dom-extraction';

// Create strategy
const strategy = new MinimizationDOMStrategy();
strategy.setPage(page);

// Extract clean DOM content
const cleanHTML = await strategy.getDOMContent(5000); // 3000 token budget
```

## What It Does

✅ **Removes**:
- `<script>` tags
- `<style>` tags  
- `<link rel="stylesheet">` tags
- `<noscript>` tags
- Elements with zero size (hidden)

✅ **Preserves**:
- All visible content
- Page structure
- Interactive elements

✅ **Optimizes**:
- Truncates content to fit token budget
- Provides extraction metrics
- Graceful error handling

## Files

```
dom-extraction/
├── index.ts                    # Main exports
└── minimization-strategy/
    └── index.ts               # DOM cleaning logic
```

That's it! Simple, fast, and production-ready. 