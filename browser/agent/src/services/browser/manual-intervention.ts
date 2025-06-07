import { Page } from 'playwright';
import { logger } from '../../utils/logger';

export class BrowserManualIntervention {
  private page: Page | null = null;

  setPage(page: Page | null): void {
    this.page = page;
  }

  async enableManualInterventionMode(): Promise<void> {
    if (!this.page) return;

    try {
      // Ensure the page has focus for keyboard events
      await this.page.bringToFront();
      
      // Focus the document body to ensure keyboard events are captured
      await this.page.evaluate(() => {
        if (document.body) {
          document.body.focus();
        }
      });

      // Inject a visual cursor that follows mouse movements
      await this.page.evaluate(() => {
        // Remove existing cursor if any
        const existingCursor = document.getElementById('manual-intervention-cursor');
        if (existingCursor) existingCursor.remove();

        // Create cursor element
        const cursor = document.createElement('div');
        cursor.id = 'manual-intervention-cursor';
        cursor.style.cssText = `
          position: fixed;
          width: 20px;
          height: 20px;
          border: 2px solid #00ff00;
          border-radius: 50%;
          background-color: rgba(0, 255, 0, 0.1);
          pointer-events: none;
          z-index: 999998;
          transform: translate(-50%, -50%);
          transition: all 0.1s ease-out;
        `;

        // Add inner dot
        const dot = document.createElement('div');
        dot.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          width: 4px;
          height: 4px;
          background-color: #00ff00;
          border-radius: 50%;
          transform: translate(-50%, -50%);
        `;
        cursor.appendChild(dot);

        document.body.appendChild(cursor);

        // Store cursor reference on window for position updates
        (window as any).__manualCursor = cursor;
      });

      logger.info('Manual intervention mode enabled with keyboard focus');
    } catch (error) {
      logger.error('Failed to enable manual intervention mode', error);
    }
  }

  async disableManualInterventionMode(): Promise<void> {
    if (!this.page) return;

    try {
      await this.page.evaluate(() => {
        const cursor = document.getElementById('manual-intervention-cursor');
        if (cursor) cursor.remove();
        delete (window as any).__manualCursor;
      });

      logger.info('Manual intervention mode disabled');
    } catch (error) {
      logger.error('Failed to disable manual intervention mode', error);
    }
  }

  async updateCursorPosition(x: number, y: number): Promise<void> {
    if (!this.page) return;

    try {
      await this.page.evaluate(({ x, y }) => {
        const cursor = (window as any).__manualCursor;
        if (cursor) {
          cursor.style.left = `${x}px`;
          cursor.style.top = `${y}px`;
        }
      }, { x, y });
    } catch (error) {
      // Silently ignore cursor update errors
    }
  }
} 