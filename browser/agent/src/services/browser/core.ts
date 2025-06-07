import { chromium } from 'playwright';
import { BrowserState } from './types';
import { BrowserContext } from '../../types';
import { logger } from '../../utils/logger';
import { config } from '../../utils/config';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class BrowserCore {
  private state: BrowserState = {
    browser: null,
    context: null,
    page: null,
    cdpSession: null
  };

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing browser...');

      // Clean up any orphaned browser processes first
      await this.cleanupOrphanedProcesses();

      // Launch Chromium browser
      this.state.browser = await chromium.launch({
        headless: config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-background-networking',
          '--disable-sync',
          '--disable-default-apps',
          '--no-first-run'
        ]
      });

      // Create a new browser context
      this.state.context = await this.state.browser.newContext({
        viewport: {
          width: config.viewportWidth,
          height: config.viewportHeight
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      // Create a new page
      this.state.page = await this.state.context.newPage();

      // Set a reasonable default timeout for all page operations
      this.state.page.setDefaultTimeout(10000); // 10 seconds should be enough for most operations

      // Capture page errors
      this.state.page.on('pageerror', (error) => {
        logger.error('Page error occurred', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      });

      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser', error);
      // Clean up any partial initialization
      await this.close();
      throw error;
    }
  }

  async navigate(url: string): Promise<void> {
    if (!this.state.page) throw new Error('Browser not initialized');

    logger.action(`Navigating to ${url}`);

    try {
      // Use 'domcontentloaded' instead of 'networkidle' for heavy sites with lots of ads
      await this.state.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });

      // Wait for the page to stabilize after DOM is loaded
      await this.wait(2000);

      // Log page state after navigation
      logger.info('Page navigation completed', {
        url: this.state.page.url(),
        title: await this.state.page.title(),
        readyState: await this.state.page.evaluate(() => document.readyState),
        hasBody: await this.state.page.evaluate(() => !!document.body),
        bodyChildrenCount: await this.state.page.evaluate(() => document.body?.children.length || 0)
      });
    } catch (error) {
      logger.error('Navigation failed', error);
      throw error;
    }
  }

  async getContext(): Promise<BrowserContext> {
    if (!this.state.page) throw new Error('Browser not initialized');

    try {
      // Check if page is still valid before accessing it
      if (this.state.page.isClosed()) {
        throw new Error('Page is closed');
      }

      const url = this.state.page.url();
      const title = await this.state.page.title();
      const cookies = await this.state.context?.cookies() || [];

      return {
        currentUrl: url,
        pageTitle: title,
        viewport: {
          width: config.viewportWidth,
          height: config.viewportHeight
        },
        cookies
      };
    } catch (error) {
      // Return a fallback context if browser is closing
      logger.error('Failed to get browser context, returning fallback', error);
      return {
        currentUrl: 'about:blank',
        pageTitle: 'Browser Closed',
        viewport: {
          width: config.viewportWidth,
          height: config.viewportHeight
        },
        cookies: []
      };
    }
  }

  async wait(duration: number): Promise<void> {
    logger.action(`Waiting for ${duration}ms`);
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  async screenshot(): Promise<Buffer> {
    if (!this.state.page) throw new Error('Browser not initialized');

    try {
      // Check if page is still valid
      if (this.state.page.isClosed()) {
        throw new Error('Page is closed');
      }

      return await this.state.page.screenshot({ type: 'png' });
    } catch (error) {
      // Re-throw with more context
      throw new Error(`Screenshot failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async close(): Promise<void> {
    logger.info('Starting browser cleanup...');

    // Close page with timeout
    if (this.state.page) {
      try {
        await Promise.race([
          this.state.page.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Page close timeout')), 5000))
        ]);
        this.state.page = null;
        logger.info('Page closed successfully');
      } catch (error) {
        logger.error('Error closing page (forcing cleanup)', error);
        this.state.page = null;
      }
    }

    // Close context with timeout
    if (this.state.context) {
      try {
        await Promise.race([
          this.state.context.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Context close timeout')), 5000))
        ]);
        this.state.context = null;
        logger.info('Context closed successfully');
      } catch (error) {
        logger.error('Error closing context (forcing cleanup)', error);
        this.state.context = null;
      }
    }

    // Close browser with timeout
    if (this.state.browser) {
      try {
        await Promise.race([
          this.state.browser.close(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Browser close timeout')), 10000))
        ]);
        this.state.browser = null;
        logger.info('Browser closed successfully');
      } catch (error) {
        logger.error('Error closing browser (forcing cleanup)', error);
        this.state.browser = null;
      }
    }

    logger.info('Browser cleanup completed');
  }

  // Getters for internal state access
  get browser() { return this.state.browser; }
  get context() { return this.state.context; }
  get page() { return this.state.page; }
  get cdpSession() { return this.state.cdpSession; }

  // Setters for CDP session management
  setCdpSession(session: any) { this.state.cdpSession = session; }

  private async cleanupOrphanedProcesses(): Promise<void> {
    try {
      logger.info('Checking for orphaned browser processes...');

      // Find all headless_shell processes owned by current user
      const { stdout } = await execAsync('ps aux | grep headless_shell | grep -v grep');

      if (stdout.trim()) {
        const processes = stdout.trim().split('\n');
        logger.info(`Found ${processes.length} headless_shell processes`);

        // Kill processes that have been running for more than 5 minutes or are using high CPU
        for (const processLine of processes) {
          const parts = processLine.trim().split(/\s+/);
          if (parts.length >= 11) {
            const pid = parts[1];
            const cpuUsage = parseFloat(parts[2]);
            const timeRunning = parts[9]; // Time format like "12:34.56"

            // Parse time to minutes
            const timeMinutes = this.parseTimeToMinutes(timeRunning);

            // Kill if running for more than 5 minutes or using more than 50% CPU
            if (timeMinutes > 5 || cpuUsage > 50) {
              try {
                await execAsync(`kill -9 ${pid}`);
                logger.info(`Killed orphaned headless_shell process ${pid} (CPU: ${cpuUsage}%, Time: ${timeRunning})`);
              } catch (killError) {
                logger.error(`Failed to kill process ${pid}:`, killError);
              }
            }
          }
        }
      } else {
        logger.info('No orphaned headless_shell processes found');
      }
    } catch (error) {
      // Don't fail initialization if cleanup fails
      logger.error('Failed to cleanup orphaned processes:', error);
    }
  }

  private parseTimeToMinutes(timeString: string): number {
    try {
      if (timeString.includes(':')) {
        const parts = timeString.split(':');
        if (parts.length === 2) {
          const minutes = parseInt(parts[0]);
          const seconds = parseFloat(parts[1]);
          return minutes + (seconds / 60);
        }
      }
      return 0;
    } catch {
      return 0;
    }
  }
} 