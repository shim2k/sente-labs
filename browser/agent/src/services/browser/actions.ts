import { Page } from 'playwright';
import { ClickResult, TypeResult, DOMChangeResult } from './types';
import { MouseAction, KeyboardAction } from '../../types';
import { logger } from '../../utils/logger';

export class BrowserActions {
  private page: Page | null = null;

  setPage(page: Page | null): void {
    this.page = page;
  }

  async click(selector: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.action(`Clicking on ${selector}`);
    await this.page.waitForSelector(selector, { timeout: 5000 });
    await this.page.click(selector, { timeout: 5000 });
  }

  async clickWithSelectors(selectors: string[]): Promise<ClickResult> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.action(`Attempting to click with ${selectors.length} selectors: ${selectors.join(', ')}`);

    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      try {
        logger.action(`Trying selector ${i + 1}/${selectors.length}: ${selector}`);

        // Use much shorter timeout for faster fallback to coordinates (reduced from 2000ms to 1000ms)
        await this.page.waitForSelector(selector, { timeout: 1000 });
        // Add explicit timeout to click operation to prevent 30-second hangs
        await this.page.click(selector, { timeout: 3000 });

        logger.action(`✅ Successfully clicked with selector: ${selector}`);
        return { success: true, usedSelector: selector };

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.action(`❌ Selector ${i + 1} failed (${selector}): ${errorMsg}`);

        // If this is the last selector, return more helpful error message
        if (i === selectors.length - 1) {
          const shouldUseCoordinates = errorMsg.includes('outside') || 
                                     errorMsg.includes('timeout') || 
                                     errorMsg.includes('unstable') ||
                                     errorMsg.includes('Timeout');
          
          return {
            success: false,
            error: shouldUseCoordinates ? 
              `All ${selectors.length} selectors failed with viewport/timeout issues. Consider using clickByPosition with screenshot analysis. Last error: ${errorMsg}` :
              `All ${selectors.length} selectors failed. Last error: ${errorMsg}`
          };
        }
        // Otherwise continue to the next selector
        continue;
      }
    }

    return { success: false, error: 'No selectors provided' };
  }

  async clickCoordinates(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.action(`Clicking at coordinates (${x}, ${y}) with ${button} button`);
    
    // Show visual indicator before clicking to provide feedback in the stream
    await this.showClickIndicator(x, y);
    
    // Small delay to ensure the indicator is visible in the screenshot stream
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await this.page.mouse.click(x, y, { button });
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.action(`Typing "${text}" into ${selector}`);
    await this.page.waitForSelector(selector, { timeout: 5000 });
    await this.page.fill(selector, text, { timeout: 5000 });
  }

  async typeWithSelectors(selectors: string[], text: string): Promise<TypeResult> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.action(`Attempting to type "${text}" with ${selectors.length} selectors: ${selectors.join(', ')}`);

    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      try {
        logger.action(`Trying selector ${i + 1}/${selectors.length}: ${selector}`);

        // Try to find the element with a timeout suitable for modern SPAs that hydrate slowly
        await this.page.waitForSelector(selector, { timeout: 4000 });
        await this.page.fill(selector, text, { timeout: 3000 });

        logger.action(`✅ Successfully typed into selector: ${selector}`);
        return { success: true, usedSelector: selector };

      } catch (error) {
        logger.action(`❌ Selector ${i + 1} failed (${selector}): ${error instanceof Error ? error.message : 'Unknown error'}`);

        // If this is the last selector, return the error
        if (i === selectors.length - 1) {
          return {
            success: false,
            error: `All ${selectors.length} selectors failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
        // Otherwise continue to the next selector
        continue;
      }
    }

    return { success: false, error: 'No selectors provided' };
  }

  async hover(selector: string): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.action(`Hovering over ${selector}`);
    await this.page.waitForSelector(selector, { timeout: 5000 });
    await this.page.hover(selector, { timeout: 5000 });
  }

  async scroll(direction: 'up' | 'down', amount: number = 100): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.action(`Scrolling ${direction} by ${amount}px`);
    // Use mouse wheel for scrolling
    const deltaY = direction === 'down' ? amount : -amount;
    await this.page.mouse.wheel(0, deltaY);
  }

  async executeMouseAction(action: MouseAction): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const mouse = this.page.mouse;

    switch (action.actionType) {
      case 'click':
        // Move to position first to trigger hover effects
        await mouse.move(action.x, action.y);

        // Show click indicator before clicking
        await this.showClickIndicator(action.x, action.y, 'manual');

        // Perform the click
        await mouse.click(action.x, action.y, {
          button: action.button || 'left',
          clickCount: action.clickCount || 1
        });
        break;
      case 'move':
        // Just move the mouse to trigger hover effects
        await mouse.move(action.x, action.y);
        break;
      case 'scroll':
        // Use deltaX and deltaY for more precise scrolling
        await this.page.mouse.wheel(action.deltaX || 0, action.deltaY || 100);
        break;
      case 'drag':
        await mouse.down();
        await mouse.move(action.x, action.y);
        await mouse.up();
        break;
    }
  }

  async executeKeyboardAction(action: KeyboardAction): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    const keyboard = this.page.keyboard;

    switch (action.actionType) {
      case 'key_down':
        if (!action.key) throw new Error('Key required for key_down action');

        // Handle modifiers
        if (action.modifiers && action.modifiers.length > 0) {
          for (const modifier of action.modifiers) {
            await keyboard.down(this.mapModifier(modifier));
          }
        }

        await keyboard.down(action.key);
        break;

      case 'key_up':
        if (!action.key) throw new Error('Key required for key_up action');

        await keyboard.up(action.key);

        // Release modifiers in reverse order
        if (action.modifiers && action.modifiers.length > 0) {
          for (const modifier of action.modifiers.reverse()) {
            await keyboard.up(this.mapModifier(modifier));
          }
        }
        break;

      case 'key_press':
        if (!action.key) throw new Error('Key required for key_press action');

        // Handle modifiers by concatenating them with the key
        if (action.modifiers && action.modifiers.length > 0) {
          const modifierKeys = action.modifiers.map(m => this.mapModifier(m));
          const keyWithModifiers = `${modifierKeys.join('+')}+${action.key}`;
          await keyboard.press(keyWithModifiers);
        } else {
          await keyboard.press(action.key);
        }
        break;

      case 'text_input':
        if (!action.text) throw new Error('Text required for text_input action');
        await keyboard.type(action.text);
        break;
    }
  }

  async updateMousePosition(x: number, y: number): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    // Move mouse to position without clicking
    // This will trigger hover effects on the page
    await this.page.mouse.move(x, y);
  }

  async observeDOMChangesForAction(actionCallback: () => Promise<void>): Promise<DOMChangeResult> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const beforeUrl = this.page.url();
    let afterUrl = beforeUrl;
    let changeCount = 0;
    let changeTypes: string[] = [];

    try {
      // Set up MutationObserver to track changes
      await this.page.evaluate(() => {
        return new Promise<() => void>((resolve) => {
          const changes: Array<{
            type: string;
            target: string;
            addedNodes: number;
            removedNodes: number;
          }> = [];

          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              changes.push({
                type: mutation.type,
                target: mutation.target.nodeName || 'unknown',
                addedNodes: mutation.addedNodes.length,
                removedNodes: mutation.removedNodes.length
              });
            });
          });

          observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeOldValue: false,
            characterData: true,
            characterDataOldValue: false
          });

          // Store observer and changes on window for cleanup
          (window as any).__domChangeObserver = observer;
          (window as any).__domChanges = changes;

          // Return cleanup function
          resolve(() => {
            observer.disconnect();
            delete (window as any).__domChangeObserver;
            const finalChanges = (window as any).__domChanges;
            delete (window as any).__domChanges;
            return finalChanges;
          });
        });
      });

      // Execute the action
      await actionCallback();

      // Small delay to let changes settle
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if URL changed (navigation occurred)
      try {
        afterUrl = this.page.url();
      } catch (error) {
        // If we can't get the URL, assume navigation occurred
        logger.info('Could not get URL after action, assuming navigation occurred');
        afterUrl = 'navigation_occurred';
      }

      const urlChanged = beforeUrl !== afterUrl;

      // If URL changed, this is a navigation - treat as successful change
      if (urlChanged) {
        logger.agent('Navigation detected during action', {
          beforeUrl,
          afterUrl,
          actionType: 'navigation'
        });

        return {
          hasChanges: true,
          changeCount: 1,
          changeTypes: ['navigation'],
          urlChanged: true,
          beforeUrl,
          afterUrl
        };
      }

      // Try to get DOM changes - handle context destruction gracefully
      try {
        const domChanges = await this.page.evaluate(() => {
          const cleanupFn = (window as any).__domChangeObserver;
          if (cleanupFn && typeof cleanupFn === 'function') {
            return cleanupFn();
          }
          return (window as any).__domChanges || [];
        });

        changeCount = domChanges?.length || 0;
        
        // Categorize change types
        const typeSet = new Set<string>();
        if (domChanges) {
          domChanges.forEach((change: any) => {
            if (change.addedNodes > 0) typeSet.add('content_added');
            if (change.removedNodes > 0) typeSet.add('content_removed');
            if (change.type === 'attributes') typeSet.add('attributes_changed');
            if (change.type === 'characterData') typeSet.add('text_changed');
          });
        }
        changeTypes = Array.from(typeSet);

        logger.agent('DOM changes detected', {
          changeCount,
          changeTypes,
          hasChanges: changeCount > 0
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // If execution context was destroyed, this likely means navigation occurred
        if (errorMessage.includes('Execution context was destroyed') || 
            errorMessage.includes('Target closed') ||
            errorMessage.includes('Navigation')) {
          
          logger.agent('Execution context destroyed during change detection - treating as navigation', {
            beforeUrl,
            currentUrl: (() => {
              try {
                return this.page ? this.page.url() : 'unknown';
              } catch {
                return 'unknown';
              }
            })()
          });

          // Try to get current URL to confirm navigation
          try {
            afterUrl = this.page.url();
          } catch {
            afterUrl = 'navigation_occurred';
          }

          return {
            hasChanges: true,
            changeCount: 1,
            changeTypes: ['navigation'],
            urlChanged: beforeUrl !== afterUrl,
            beforeUrl,
            afterUrl
          };
        }

        // For other errors, log and return no changes
        logger.error('Error detecting DOM changes', error);
        changeCount = 0;
        changeTypes = [];
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle navigation-related errors gracefully
      if (errorMessage.includes('Execution context was destroyed') ||
          errorMessage.includes('Target closed') ||
          errorMessage.includes('Navigation')) {
        
        logger.agent('Action caused navigation (execution context destroyed)', {
          beforeUrl,
          actionType: 'navigation'
        });

        // Try to get final URL
        try {
          afterUrl = this.page.url();
        } catch {
          afterUrl = 'navigation_occurred';
        }

        return {
          hasChanges: true,
          changeCount: 1,
          changeTypes: ['navigation'],
          urlChanged: true,
          beforeUrl,
          afterUrl
        };
      }

      // Re-throw non-navigation errors
      throw error;
    }

    return {
      hasChanges: changeCount > 0,
      changeCount,
      changeTypes,
      urlChanged: beforeUrl !== afterUrl,
      beforeUrl,
      afterUrl
    };
  }

  private async showClickIndicator(x: number, y: number, type: 'manual' | 'position' = 'position'): Promise<void> {
    if (!this.page) return;

    try {
      // Inject a visual click indicator into the page
      await this.page.evaluate(({ x, y, type }) => {
        // Create click indicator element
        const indicator = document.createElement('div');
        
        // Different styles for different click types
        const styles = {
          position: {
            border: '4px solid #ff4444',
            backgroundColor: 'rgba(255, 68, 68, 0.3)',
            animation: 'agentClickPulse 1s ease-out'
          },
          manual: {
            border: '3px solid #ff0000',
            backgroundColor: 'rgba(255, 0, 0, 0.2)',
            animation: 'clickPulse 0.6s ease-out'
          }
        };

        const style = styles[type as keyof typeof styles];
        
        indicator.style.cssText = `
          position: fixed;
          left: ${x - 20}px;
          top: ${y - 20}px;
          width: 40px;
          height: 40px;
          border: ${style.border};
          border-radius: 50%;
          background-color: ${style.backgroundColor};
          pointer-events: none;
          z-index: 999999;
          animation: ${style.animation};
        `;

        // Add a center dot for better visibility
        const centerDot = document.createElement('div');
        centerDot.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          width: 8px;
          height: 8px;
          background-color: ${type === 'position' ? '#ff4444' : '#ff0000'};
          border-radius: 50%;
          transform: translate(-50%, -50%);
        `;
        indicator.appendChild(centerDot);

        // Add animation keyframes if not already present
        if (!document.getElementById('click-indicator-styles')) {
          const styleElement = document.createElement('style');
          styleElement.id = 'click-indicator-styles';
          styleElement.textContent = `
            @keyframes clickPulse {
              0% {
                transform: scale(0.5);
                opacity: 1;
              }
              100% {
                transform: scale(1.5);
                opacity: 0;
              }
            }
            @keyframes agentClickPulse {
              0% {
                transform: scale(0.3);
                opacity: 1;
              }
              50% {
                transform: scale(1.2);
                opacity: 0.8;
              }
              100% {
                transform: scale(2);
                opacity: 0;
              }
            }
          `;
          document.head.appendChild(styleElement);
        }

        // Add indicator to page
        document.body.appendChild(indicator);

        // Remove indicator after animation
        const duration = type === 'position' ? 1000 : 600;
        setTimeout(() => {
          indicator.remove();
        }, duration);
      }, { x, y, type });
    } catch (error) {
      // Don't fail the click action if indicator fails
      logger.error('Failed to show click indicator', error);
    }
  }

  private mapModifier(modifier: string): string {
    const modifierMap: { [key: string]: string } = {
      'ctrl': 'Control',
      'shift': 'Shift',
      'alt': 'Alt',
      'meta': 'Meta'
    };
    return modifierMap[modifier.toLowerCase()] || modifier;
  }
} 