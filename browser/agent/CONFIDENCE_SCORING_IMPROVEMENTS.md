# Confidence Scoring Feature Improvements

## Issue
The suggested responses for clarification requests were poorly formatted questions rather than actionable instructions. For example:
- ❌ "Do you want to navigate to the Hacker News website?"
- ❌ "Are you looking for a specific article or topic on Hacker News?"

## Solution
Updated the confidence scoring system to provide complete, actionable responses that users can click and send directly.

## Changes Made

### 1. **Improved System Prompt** (`confidence-scorer.ts`)
- Added explicit instructions for formatting suggested responses as complete actions
- Provided examples of good vs bad suggestions
- Emphasized that responses should be clickable and directly executable

### 2. **Enhanced User Prompt** (`confidence-scorer.ts`)
- Added concrete examples for common ambiguous instructions
- Examples for "hackernews":
  - ✅ "Navigate to news.ycombinator.com"
  - ✅ "Search for Hacker News on Google"
  - ✅ "Open Hacker News in a new tab"

### 3. **Better UI Presentation** (`InstructionPanel.tsx`)
- Changed label from "Suggested responses:" to "Click a suggestion or write your own:"
- Improved button styling with borders and better hover states
- Removed bullet points for cleaner appearance

### 4. **Fixed Clarification Flow** 
- **WebSocket Handler** (`handlers.ts`): Now sends only the clarification text, not combined with original
- **SessionContext** (`SessionContext.tsx`): Shows only the clarification response, avoiding duplication

## Result
Now when a user types "hackernews", they get:
- Clear clarification message explaining the ambiguity
- Actionable suggestions they can click:
  - "Navigate to news.ycombinator.com"
  - "Go to the Hacker News homepage"
  - "Search for Hacker News articles"

## Benefits
- **Better UX**: Users can click suggestions instead of typing responses
- **Clearer Intent**: Suggestions are complete instructions, not questions
- **Faster Resolution**: One-click clarification instead of back-and-forth
- **Reduced Confusion**: No duplicate instructions in the conversation flow 