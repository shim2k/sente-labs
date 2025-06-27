import { chromium, Browser, BrowserContext, Page, CDPSession } from 'playwright';
import { DomParser, PageObservation, ElementDescriptor } from './domParser';



export { PageObservation, ElementDescriptor };

export class BrowserService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;
  private isStreaming: boolean = false;
  private domParser: DomParser;

  constructor() {
    this.domParser = new DomParser();
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
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

    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    this.cdpSession = await this.page.context().newCDPSession(this.page);

    await this.page.goto('https://www.google.com');
  }

  getPage(): Page | null {
    return this.page;
  }

  async click(selector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    // Handle special getByRole selectors for international text
    if (selector.startsWith('getByRole:')) {
      const [, role, name] = selector.split(':', 3);
      try {
        await this.page.getByRole(role as any, { name }).click({ timeout: 3000 });
      } catch (error) {
        if (error instanceof Error && error.message.includes('strict mode violation')) {
          await this.page.getByRole(role as any, { name }).first().click({ timeout: 3000 });
        } else if (error instanceof Error && error.message.includes('intercepts pointer events')) {
          // Try alternative click strategies for complex dropdowns
          const locator = this.page.getByRole(role as any, { name });
          try {
            // Try force click to bypass pointer event interception
            await locator.click({ force: true, timeout: 3000 });
          } catch (forceError) {
            // Try selecting the option directly for dropdowns
            if (role === 'combobox') {
              await locator.selectOption({ label: name });
            } else {
              throw error;
            }
          }
        } else {
          throw error;
        }
      }
    } else {
      await this.page.click(selector, { timeout: 3000 });
    }
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    // Handle special getByRole selectors for international text  
    if (selector.startsWith('getByRole:')) {
      const [, role, name] = selector.split(':', 3);
      try {
        await this.page.getByRole(role as any, { name }).fill(text, { timeout: 3000 });
      } catch (error) {
        if (error instanceof Error && error.message.includes('strict mode violation')) {
          await this.page.getByRole(role as any, { name }).first().fill(text, { timeout: 3000 });
        } else {
          throw error;
        }
      }
    } else {
      await this.page.fill(selector, text, { timeout: 3000 });
    }
  }

  async goBack(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    await this.page.goBack();
  }

  async goto(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    await this.page.goto(url);
  }

  async enter(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    await this.page.keyboard.press('Enter');
  }

  async getPageObservation(): Promise<PageObservation> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    return await this.domParser.getPageObservation(this.page);
  }

  // Mouse control methods for manual intervention
  async mouseMove(x: number, y: number): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    await this.page.mouse.move(x, y);
  }

  async mouseClick(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left', clickCount: number = 1): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const options: any = { button, clickCount };
    await this.page.mouse.click(x, y, options);
  }

  async mouseDown(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.mouse.move(x, y);
    await this.page.mouse.down({ button });
  }

  async mouseUp(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.mouse.move(x, y);
    await this.page.mouse.up({ button });
  }

  async scroll(x: number, y: number, deltaX: number, deltaY: number): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.mouse.wheel(deltaX, deltaY);
  }

  // Keyboard control methods for manual intervention
  async keyDown(key: string, modifiers?: string[]): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    // Map common key names to Playwright-compatible names
    const mappedKey = this.mapKeyName(key);

    // Apply modifiers first
    if (modifiers) {
      for (const modifier of modifiers) {
        const mappedModifier = this.mapKeyName(modifier);
        await this.page.keyboard.down(mappedModifier);
      }
    }

    await this.page.keyboard.down(mappedKey);
  }

  async keyUp(key: string, modifiers?: string[]): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const mappedKey = this.mapKeyName(key);
    await this.page.keyboard.up(mappedKey);

    // Release modifiers
    if (modifiers) {
      for (const modifier of modifiers.reverse()) {
        const mappedModifier = this.mapKeyName(modifier);
        await this.page.keyboard.up(mappedModifier);
      }
    }
  }

  // Map browser key names to Playwright key names
  private mapKeyName(key: string): string {
    const keyMap: { [key: string]: string } = {
      // Modifier keys
      'meta': 'Meta',
      'ctrl': 'Control',
      'control': 'Control',
      'alt': 'Alt',
      'shift': 'Shift',

      // Special keys
      'enter': 'Enter',
      'return': 'Enter',
      'space': 'Space',
      'spacebar': 'Space',
      'backspace': 'Backspace',
      'delete': 'Delete',
      'tab': 'Tab',
      'escape': 'Escape',
      'esc': 'Escape',

      // Arrow keys
      'arrowup': 'ArrowUp',
      'arrowdown': 'ArrowDown',
      'arrowleft': 'ArrowLeft',
      'arrowright': 'ArrowRight',
      'up': 'ArrowUp',
      'down': 'ArrowDown',
      'left': 'ArrowLeft',
      'right': 'ArrowRight',

      // Function keys
      'f1': 'F1', 'f2': 'F2', 'f3': 'F3', 'f4': 'F4',
      'f5': 'F5', 'f6': 'F6', 'f7': 'F7', 'f8': 'F8',
      'f9': 'F9', 'f10': 'F10', 'f11': 'F11', 'f12': 'F12',

      // Common punctuation that might cause issues
      'dead': 'Dead', // For dead keys in international keyboards
    };

    // Convert to lowercase for lookup, but preserve original case if not found
    const lowerKey = key.toLowerCase();
    return keyMap[lowerKey] || key;
  }

  async typeText(text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.keyboard.type(text);
  }

  async startStreaming(onFrame: (frameData: string) => void): Promise<void> {
    if (!this.cdpSession || this.isStreaming) {
      return;
    }

    await this.cdpSession.send('Page.enable');
    await this.cdpSession.send('Runtime.enable');

    this.cdpSession.on('Page.screencastFrame', (event: any) => {
      onFrame(event.data);
      this.cdpSession?.send('Page.screencastFrameAck', { sessionId: event.sessionId });
    });

    await this.cdpSession.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: 1280,
      maxHeight: 720
    });

    this.isStreaming = true;
  }

  async stopStreaming(): Promise<void> {
    if (!this.cdpSession || !this.isStreaming) {
      return;
    }

    await this.cdpSession.send('Page.stopScreencast');
    this.isStreaming = false;
  }

  isStreamingActive(): boolean {
    return this.isStreaming;
  }
} 