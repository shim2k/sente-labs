import { BrowserService } from '../browser';
import { Action } from '../../types';
import { logger } from '../../utils/logger';
import { ActionExecutionResult, ChangeDetectionResult, TaskCompletionCheck } from './types';

export class ActionExecutor {
  private browser: BrowserService;

  constructor(browser: BrowserService) {
    this.browser = browser;
  }

  async executeAction(action: Action): Promise<ActionExecutionResult> {
    const startTime = Date.now();
    
    try {
      logger.action(`Executing: ${action.description}`);

      let changeDetection: ChangeDetectionResult | undefined;

      // Execute with DOM change observation
      if (action.type === 'click' || action.type === 'type' || action.type === 'navigate' || action.type === 'pressEnter') {
        changeDetection = await this.browser.observeDOMChangesForAction(async () => {
          await this.performAction(action);
        });
      } else {
        await this.performAction(action);
      }

      const duration = Date.now() - startTime;
      logger.action(`✅ Action completed in ${duration}ms`);

      return {
        success: true,
        observation: `Successfully executed: ${action.description}`,
        metadata: {
          duration,
          changeDetection
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`❌ Action failed: ${action.description}`, error);

      return {
        success: false,
        error: errorMessage,
        metadata: { duration }
      };
    }
  }

  private async performAction(action: Action): Promise<void> {
    switch (action.type) {
      case 'navigate':
        await this.browser.navigate(action.url!);
        break;

      case 'click':
        if (action.selectors && action.selectors.length > 0) {
          const clickResult = await this.browser.clickWithSelectors(action.selectors);
          if (!clickResult.success) {
            throw new Error(clickResult.error || 'Click failed with selectors');
          }
        } else {
          throw new Error('No selectors provided for click action');
        }
        break;

      case 'clickByPosition':
        if (action.x !== undefined && action.y !== undefined) {
          await this.browser.clickCoordinates(action.x, action.y);
        } else {
          throw new Error('Coordinates not provided for clickByPosition action');
        }
        break;

      case 'type':
        if (action.selectors && action.selectors.length > 0 && action.value) {
          const typeResult = await this.browser.typeWithSelectors(action.selectors, action.value);
          if (!typeResult.success) {
            throw new Error(typeResult.error || 'Type failed with selectors');
          }
        } else {
          throw new Error('Selectors or value not provided for type action');
        }
        break;

      case 'pressEnter':
        await this.browser.executeKeyboardAction({
          actionType: 'key_press',
          key: 'Enter'
        });
        break;

      case 'scroll':
        const direction = action.direction as 'up' | 'down';
        const amount = action.amount || 300;
        await this.browser.scroll(direction, amount);
        break;

      case 'wait':
        if (action.duration) {
          await this.browser.wait(action.duration);
        } else {
          throw new Error('Duration not provided for wait action');
        }
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async checkForTaskCompletion(changeDetection: ChangeDetectionResult, action: Action): Promise<TaskCompletionCheck> {
    // Don't auto-complete navigation actions - let the LLM analyze the new page content
    // The LLM should use the 'complete' tool when the task is actually done
    // or 'manualIntervention' tool if the page requires manual intervention
    
    // Heuristic-1: URL changed => navigation complete.
    if (action.type === 'click' && changeDetection.urlChanged) {
      logger.agent('Task completion detected: URL changed after click', {
        beforeUrl: changeDetection.beforeUrl,
        afterUrl: changeDetection.afterUrl,
        action: action.description
      });

      return {
        shouldComplete: true,
        reason: `Click triggered navigation to ${changeDetection.afterUrl}`
      };
    }

    // Heuristic-2: Same-URL but massive DOM update (e.g., search results appear, modal opens).
    // Treat as complete if:
    //  • at least 30 DOM mutations AND
    //  • we added or removed content (not just attribute tweaks).
    if (
      action.type === 'click' &&
      changeDetection.hasChanges &&
      changeDetection.changeCount >= 30 &&
      changeDetection.changeTypes.some(t => t === 'content_added' || t === 'content_removed')
    ) {
      logger.agent('Task completion detected: substantial DOM changes after click with no navigation', {
        changeCount: changeDetection.changeCount,
        changeTypes: changeDetection.changeTypes,
        action: action.description
      });

      return {
        shouldComplete: true,
        reason: `Click caused significant page update (${changeDetection.changeCount} mutations)`
      };
    }

    // Let the LLM continue reasoning for all other cases
    return { shouldComplete: false };
  }
}