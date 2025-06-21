import { chromium, Browser, BrowserContext, Page, CDPSession } from 'playwright';

export interface PageObservation {
  content: string;
  elementMap: Map<number, string>; // id -> selector
}

export class BrowserService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;
  private isStreaming: boolean = false;
  private elementIdCounter: number = 1;

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
    await this.page.click(selector);
  }

  async type(selector: string, text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }
    await this.page.fill(selector, text);
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

  async getPageObservation(): Promise<PageObservation> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const elementMap = new Map<number, string>();
    this.elementIdCounter = 1;

    // Get page title and URL
    const title = await this.page.title();
    const url = this.page.url();
    
    let content = `**${title}**\nURL: ${url}\n\n`;

    // Get main text content
    const bodyText = await this.page.locator('body').textContent();
    if (bodyText && bodyText.trim()) {
      // Clean up whitespace and limit length
      const cleanText = bodyText.replace(/\s+/g, ' ').trim().slice(0, 500);
      content += `Text: "${cleanText}"\n\n`;
    }

    // Get interactive elements (buttons, links, inputs)
    const interactiveElements = await this.page.locator('button, a, input, select, textarea').all();
    
    if (interactiveElements.length > 0) {
      content += '**Interactive Elements:**\n';
      
      for (const element of interactiveElements.slice(0, 20)) { // Limit to 20 elements
        try {
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());
          const text = await element.textContent();
          const placeholder = await element.getAttribute('placeholder');
          const type = await element.getAttribute('type');
          
          const displayText = text?.trim() || placeholder || type || tagName;
          if (displayText && displayText.length > 0) {
            const selector = await this.generateSelector(element);
            const id = this.elementIdCounter++;
            elementMap.set(id, selector);
            
            content += `- ${displayText} [${id}]\n`;
          }
        } catch (e) {
          // Skip elements that can't be processed
          continue;
        }
      }
    }

    return { content, elementMap };
  }

  private async generateSelector(element: any): Promise<string> {
    // Try to generate a reliable selector for the element
    try {
      const id = await element.getAttribute('id');
      if (id) return `#${id}`;
      
      const role = await element.getAttribute('role');
      const text = await element.textContent();
      
      if (text && text.trim().length > 0 && text.trim().length < 50) {
        const tagName = await element.evaluate((el: any) => el.tagName.toLowerCase());
        return `${tagName}:has-text("${text.trim()}")`;
      }
      
      // Fallback to nth-child selector
      const tagName = await element.evaluate((el: any) => el.tagName.toLowerCase());
      return `${tagName}`;
    } catch (e) {
      return 'button'; // Ultimate fallback
    }
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