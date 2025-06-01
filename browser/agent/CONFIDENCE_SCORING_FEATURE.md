# LLM Confidence Scoring Feature

## Overview
The LLM Confidence Scoring feature enhances the browser automation agent by evaluating user instructions before execution. It uses an LLM to assess instruction clarity and requests clarification when needed, preventing failed or unintended actions.

## Feature Details

### How It Works
1. **Instruction Analysis**: When a user sends an instruction, the system first evaluates its clarity using GPT-4
2. **Confidence Score**: Each instruction receives a score from 1-10:
   - 1-3: Very unclear, needs significant clarification
   - 4-6: Somewhat unclear, needs some clarification  
   - 7-8: Mostly clear, might need minor clarification
   - 9-10: Very clear, can be executed immediately
3. **Clarification Request**: If score < 7, the agent requests clarification instead of attempting execution
4. **Context Building**: Clarification responses are combined with the original instruction for re-evaluation
5. **Execution**: Once confidence is high enough, the instruction proceeds to normal execution

### Benefits
- **Prevents Failures**: Avoids wasted execution attempts on unclear instructions
- **Better User Experience**: Guided clarification instead of cryptic error messages
- **Improved Accuracy**: Clear instructions lead to more accurate task completion
- **Context Awareness**: Builds conversation history for better understanding
- **Safety**: Prevents potentially harmful actions from ambiguous instructions

## Implementation Details

### New Components

#### 1. **Confidence Scorer Service** (`services/confidence-scorer.ts`)
- Uses OpenAI GPT-4 to evaluate instruction clarity
- Maintains conversation history per session
- Provides clarification messages and suggested questions
- Gracefully falls back to execution if scoring fails

#### 2. **Updated Types** (`types/index.ts`)
- Added `needs_clarification` status to `ResponseMessage`
- Added `ClarificationRequest` interface with confidence details

#### 3. **Orchestrator Integration** (`services/orchestrator.ts`)
- Checks confidence before executing instructions
- Returns clarification requests when confidence is low
- Environment variable `ENABLE_CONFIDENCE_SCORING` to enable/disable

#### 4. **WebSocket Handler Updates** (`websocket/handlers.ts`)
- New `clarification_response` message type
- Handles clarification flow and combines with original instruction
- Broadcasts clarification requests to UI

#### 5. **UI Components** 
- **InstructionPanel** (`components/InstructionPanel.tsx`):
  - Displays clarification requests with confidence scores
  - Shows suggested questions as clickable options
  - Provides clarification input interface
- **SessionContext** (`context/SessionContext.tsx`):
  - Added `sendClarification` method
  - Handles clarification message flow
- **App/ControlPanel** updates to wire clarification handlers

### Configuration
- **Enable/Disable**: Set `ENABLE_CONFIDENCE_SCORING=false` to disable (enabled by default)
- **OpenAI API**: Requires `OPENAI_API_KEY` environment variable
- **Confidence Threshold**: Currently hardcoded to 7, can be made configurable

### Message Flow

1. User sends instruction: `"book a flight"`
2. Agent evaluates (confidence: 2/10) and responds with clarification request
3. UI shows clarification message with suggested questions
4. User provides clarification: `"book a flight from SFO to NYC on Dec 15"`
5. Agent re-evaluates (confidence: 9/10) and executes
6. Normal execution flow continues

## User Experience Examples

### Example 1: Ambiguous Navigation
```
User: "go to that site"
Agent: [Confidence: 2/10] "I need more information to navigate to a website. Could you please specify:
- The exact website URL or name you want to visit?
- Or describe what kind of site you're looking for?"
User: "go to amazon.com"
Agent: [Confidence: 9/10] *Navigates to Amazon*
```

### Example 2: Dangerous Action Prevention
```
User: "delete everything"
Agent: [Confidence: 3/10] "This action could have serious consequences. To proceed safely:
- What specifically do you want to delete?
- Are you looking to clear browser data, remove files, or something else?
- Should I help you with a more specific deletion task?"
User: "clear my browser cookies"
Agent: [Confidence: 8/10] *Clears browser cookies*
```

### Example 3: Context-Aware Clarification
```
User: "buy a laptop"
Agent: [Confidence: 3/10] "I can help you find a laptop! To show you the best options:
- What's your budget range?
- What will you primarily use it for?
- Any brand preferences?
- Screen size preference?"
User: "budget $1000, for coding, prefer ThinkPad, 14 inch"
Agent: [Confidence: 9/10] *Searches for matching laptops*
```

## Technical Implementation Notes

### Error Handling
- If confidence scoring fails, defaults to score 8 (proceeds with execution)
- Prevents blocking user actions due to LLM API failures
- Logs all scoring attempts and failures

### Performance Considerations
- Adds ~1-2 second latency for confidence scoring
- Only scores when feature is enabled
- Caches conversation history in memory per session

### Future Enhancements
1. **Configurable Thresholds**: Allow customizing confidence threshold per deployment
2. **User Preferences**: Remember user patterns to reduce clarification requests
3. **Multi-turn Clarification**: Support multiple rounds of clarification
4. **Analytics**: Track clarification success rates and common unclear patterns
5. **Custom Models**: Support for other LLM providers beyond OpenAI

## Testing the Feature

1. Enable the feature (default) or set `ENABLE_CONFIDENCE_SCORING=true`
2. Send ambiguous instructions like:
   - "find something interesting"
   - "click on it"
   - "go there"
   - "search for that thing we discussed"
3. Observe clarification requests and provide responses
4. Note how clarified instructions execute successfully

## Code Changes Summary

### Added Files:
- `browser/agent/src/services/confidence-scorer.ts` - Core confidence scoring service
- `browser/agent/CONFIDENCE_SCORING_FEATURE.md` - This documentation

### Modified Files:
- `browser/agent/src/types/index.ts` - Added clarification types
- `browser/agent/src/services/orchestrator.ts` - Integrated confidence checking
- `browser/agent/src/websocket/handlers.ts` - Added clarification message handling
- `browser/ui/src/components/InstructionPanel.tsx` - Added clarification UI
- `browser/ui/src/components/ControlPanel.tsx` - Wired clarification handler
- `browser/ui/src/context/SessionContext.tsx` - Added clarification methods
- `browser/ui/src/App.tsx` - Connected clarification flow

## Environment Variables
- `ENABLE_CONFIDENCE_SCORING` - Enable/disable feature (default: true)
- `OPENAI_API_KEY` - Required for GPT-4 confidence scoring 