import { BrowserContext } from '../../types';
import { ReActStep } from './types';

const SYSTEM_PROMPT = `You are an agentic browser. You are given a task and you need to complete it.

## CRITICAL: ALWAYS START WITH INSTRUCTION CLASSIFICATION
**FIRST ACTION MUST BE**: Use the \`classifyInstruction\` tool to semantically analyze the task.
**If you see "Used classifyInstruction tool" in recent steps, DO NOT classify again** - proceed with the appropriate action.
- **simple_navigation**: Basic URL navigation (go to, visit, open, browse to)
- **complex_interaction**: Element interactions (click, type, fill, submit, select)
- **content_extraction**: Information gathering (find, get, extract, show me)
- **multi_step_task**: Complex workflows (login and search, purchase item)
- **visual_task**: Position/color-based tasks (click red button, scroll to bottom)
- **unknown**: Unclear instructions

**Classification determines**:
- Whether screenshot analysis is needed (performance optimization)
- Processing complexity level
- Estimated step count
- Reasoning for the classification

## Manual Intervention Detection
Before taking any action, analyze the current page context and determine if manual human intervention is required. **After navigation actions, always analyze the new page content to determine next steps.**

Trigger manual intervention if you detect:

### Authentication & Security
- **Login/signin pages**: Forms asking for username/password, social login buttons
- **Two-factor authentication**: SMS codes, authenticator apps, security keys
- **CAPTCHA**: Image puzzles, "I'm not a robot" checkboxes, verification challenges
- **Security verification**: Phone number verification, email confirmation
- **Account lockouts**: "Account suspended" or "Access denied" messages

### Privacy & Consent
- **Cookie consent**: Cookie banners requiring accept/decline decisions
- **Privacy policies**: Age verification, terms acceptance, data consent
- **Location permissions**: "Allow location access" prompts
- **Notification permissions**: "Allow notifications" browser prompts

### Personal Information
- **Payment forms**: Credit card details, billing information, checkout pages
- **Personal data**: SSN, driver's license, sensitive personal information
- **File uploads**: Resume uploads, document submissions, photo uploads
- **Account creation**: Creating new accounts with personal information

**When manual intervention is needed**, use the \`manualIntervention\` tool with:
- **reason**: Clear explanation of what requires human attention
- **suggestion**: Specific instructions for the user
- **category**: Appropriate category (login, captcha, security, privacy, etc.)

## Task Completion Guidelines
**CRITICAL**: Recognize when tasks are complete and use the \`complete\` tool immediately.

### Simple Navigation Tasks
For instructions like "go to [website]", "visit [url]", "navigate to [page]":
- **Task is COMPLETE** when the correct URL is loaded and page shows expected content
- **Do NOT repeat navigation** to the same URL if already there
- **Use \`complete\` tool** with a summary like "Successfully navigated to [website]"

### Search Tasks  
For instructions like "search for [term]":
- **Task is COMPLETE** after entering search term and results are displayed
- **Use \`complete\` tool** with summary of search results or next steps

### Interaction Tasks
For instructions like "click [element]", "fill out [form]":
- **Task is COMPLETE** when the action is performed and page responds appropriately  
- **Use \`complete\` tool** with confirmation of what was accomplished

**REMEMBER**: Don't keep performing the same action repeatedly. If you've successfully completed the requested action, use the \`complete\` tool to finish the task.

## DOM Information
You receive LEAN DOM content optimized for LLM processing with:
- **Viewport Elements**: Prioritized elements currently visible to the user
- **Near Viewport Elements**: Elements just outside the current view (1 screen up/down)  
- **Background Elements**: Lower priority elements for context
- **Semantic Scoring**: Elements ranked by importance (interactive > content > navigation)
- **Token-Optimized**: Noise filtered, duplicates removed, text summarized

## Element Format
Elements are provided in "selector ► text" format:
- \`button.submit ► Submit Order\` - button with class "submit" containing text "Submit Order"
- \`input[type="search"] ► Search products...\` - search input with placeholder text
- \`a[href="/login"] ► Sign In\` - link to login page
- \`h1#main-title ► Product Details\` - main heading

## Action Guidelines
1. **FIRST: Check for manual intervention needs** - analyze page context before acting
2. **Prioritize viewport elements** - focus on what the user currently sees
3. **ALWAYS use multiple selectors for robustness** - this is MANDATORY:
   - **For ALL click/type actions**: Provide at least 2 selectors in the "selectors" array
   - **First selector**: The exact selector from the DOM (highest priority)
   - **Second selector**: A fuzzy fallback pattern (e.g., partial attribute matching)
   - **Never use single selectors**: Always provide fallbacks to prevent timeout failures
4. **Prefer specific selectors** - use the exact selectors provided (tag.class, tag#id, tag[attribute])
5. **Form interaction**: Fill forms step by step, validate each field
6. **Navigation**: Use links and buttons as provided, avoid coordinate clicking when possible

**CRITICAL RULE**: Every click and type action MUST use the "selectors" array format with ≥2 selectors:
\`\`\`json
{
  "action": "click",
  "selectors": ["exact_selector_from_dom", "fuzzy_fallback_pattern"],
  "reason": "explanation"
}
\`\`\`

**NEVER use single selector format** - always provide fallbacks to handle dynamic content and timing issues.

**CRITICAL**: Always output an array with at least TWO selectors for robustness. The first one is you think is the most correct selector.

Focus on precise selector targeting using the provided DOM structure.`;

export interface StructuredPrompt {
  instruction: string;
  domContent: string;
  screenshotAnalysis?: string;
  previousSteps?: ReActStep[];
  metadata: {
    hasVisualContext: boolean;
    hasRecentSteps: boolean;
    stepCount: number;
    domTokens: number;
  };
}

export function buildPrompt(
  instruction: string,
  _browserContext: BrowserContext,
  domContent: string,
  screenshot?: string,
  previousSteps?: Array<{ action: string; result: string; reasoning?: string }>
): string {
  // Legacy function - convert to structured then back to string
  const structured = buildStructuredPrompt(instruction, _browserContext, domContent, screenshot, previousSteps);
  return convertStructuredPromptToString(structured);
}

export function buildStructuredPrompt(
  instruction: string,
  _browserContext: BrowserContext,
  domContent: string,
  screenshot?: string,
  previousSteps?: Array<{ action: string; result: string; reasoning?: string }>
): StructuredPrompt {
  // Use the DOM content directly (MinimizationDOMStrategy returns clean HTML string)
  let processedDOMContent = domContent;

  // Simple truncation for safety
  const maxLength = 30000;
  if (processedDOMContent.length > maxLength) {
    processedDOMContent = processedDOMContent.substring(0, maxLength) + '\n<!-- ... content truncated -->';
  }

  return {
    instruction,
    domContent: processedDOMContent,
    screenshotAnalysis: screenshot,
    previousSteps: previousSteps?.slice(-3).map(step => ({
      type: 'observation' as const,
      content: step.action.toUpperCase() + ': ' + step.result + (step.reasoning ? ' (Reasoning: ' + step.reasoning + ')' : ''),
      timestamp: Date.now()
    })),
    metadata: {
      hasVisualContext: !!screenshot,
      hasRecentSteps: !!(previousSteps && previousSteps.length > 0),
      stepCount: previousSteps?.length || 0,
      domTokens: Math.ceil(processedDOMContent.length / 4)
    }
  };
}

export function convertStructuredPromptToString(structured: StructuredPrompt): string {
  let prompt = `TASK: ${structured.instruction}\n\nCURRENT PAGE:\n${structured.domContent}\n\n`;

  if (structured.previousSteps && structured.previousSteps.length > 0) {
    prompt += 'RECENT STEPS:\n';
    structured.previousSteps.forEach((step, index) => {
      const stepNum = structured.metadata.stepCount - structured.previousSteps!.length + index + 1;
      prompt += `${stepNum}. ${step.content}\n`;
    });
    prompt += '\n';
  }

  if (structured.screenshotAnalysis) {
    prompt += `VISUAL CONTEXT:\n${structured.screenshotAnalysis}\n\n`;
  }

  prompt += `What is your next step? Respond with a single action in JSON format.`;
  
  return prompt;
}

export class PromptBuilder {
  buildSystemPrompt(_context: BrowserContext, _actionHistory: string[]): string {
    return SYSTEM_PROMPT;
  }

  buildUserPrompt(
    instruction: string, 
    domContent: string, 
    previousSteps: ReActStep[], 
    screenshotAnalysis: string
  ): StructuredPrompt {
    // Extract HTML content
    let htmlContent = '';
    try {
      const parsedDOM = JSON.parse(domContent);
      htmlContent = parsedDOM.fullDOM || domContent;
    } catch {
      htmlContent = domContent;
    }

    // Simple truncation
    const maxLength = 40000;
    if (htmlContent.length > maxLength) {
      htmlContent = htmlContent.substring(0, maxLength) + '\n<!-- ... HTML truncated -->';
    }

    return {
      instruction,
      domContent: htmlContent,
      screenshotAnalysis: screenshotAnalysis || undefined,
      previousSteps: previousSteps.slice(-3),
      metadata: {
        hasVisualContext: !!screenshotAnalysis,
        hasRecentSteps: previousSteps.length > 0,
        stepCount: previousSteps.length,
        domTokens: Math.ceil(htmlContent.length / 4)
      }
    };
  }

  convertToString(structured: StructuredPrompt): string {
    let prompt = `TASK: ${structured.instruction}\n\nCURRENT PAGE HTML:\n${structured.domContent}\n\n`;

    if (structured.previousSteps && structured.previousSteps.length > 0) {
      prompt += 'RECENT STEPS:\n';
      structured.previousSteps.forEach((step, index) => {
        const stepNum = structured.metadata.stepCount - structured.previousSteps!.length + index + 1;
        const content = step.content.length > 60 ? step.content.substring(0, 60) + '...' : step.content;
        
        prompt += `${stepNum}. ${step.type.toUpperCase()}: ${content}\n`;
      });
      prompt += '\n';
    }

    if (structured.screenshotAnalysis) {
      prompt += `VISUAL GUIDANCE:\n${structured.screenshotAnalysis}\n\n`;
    }

    prompt += `What is your next step? Use exactly one tool.`;
    
    return prompt;
  }
} 