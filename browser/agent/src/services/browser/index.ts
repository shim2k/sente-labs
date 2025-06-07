import { BrowserContext, MouseAction, KeyboardAction } from '../../types';
import { logger } from '../../utils/logger';
import { config } from '../../utils/config';
import { 
  ClickResult, 
  TypeResult, 
  DOMChangeResult, 
  ScreenshotHandler, 
  FrameHandler, 
  StreamingInfo 
} from './types';
import { BrowserCore } from './core';
import { BrowserActions } from './actions';
import { BrowserStreaming } from './streaming';
import { MinimizationDOMStrategy } from './dom-extraction';
import { BrowserManualIntervention } from './manual-intervention';
import { BrowserPageOptimizer } from './page-optimizer';

export class BrowserService {
  private core: BrowserCore;
  private actions: BrowserActions;
  private streaming: BrowserStreaming;
  private domStrategy: MinimizationDOMStrategy | null = null;
  private manualIntervention: BrowserManualIntervention;
  private pageOptimizer: BrowserPageOptimizer;

  constructor() {
    this.core = new BrowserCore();
    this.actions = new BrowserActions();
    this.streaming = new BrowserStreaming();
    this.manualIntervention = new BrowserManualIntervention();
    this.pageOptimizer = new BrowserPageOptimizer();
  }

  async initialize(): Promise<void> {
    await this.core.initialize();
    
    // Update all modules with the current page
    const page = this.core.page;
    this.actions.setPage(page);
    this.streaming.setPage(page);
    this.manualIntervention.setPage(page);
    this.pageOptimizer.setPage(page);

    // Enable ad blocking at the network level
    await this.pageOptimizer.enableAdBlocking();

    // Initialize CDP session for high-performance streaming (only if enabled)
    if (config.enableCdpStreaming) {
      await this.streaming.initializeCDPStreaming();
      // Update core with CDP session
      this.core.setCdpSession(this.streaming.getCdpSession());
    } else {
      logger.info('CDP streaming disabled - using screenshot mode for better stability');
    }

    // Load a beautiful welcome page instead of leaving blank
    await this.pageOptimizer.loadWelcomePage();
  }

  async navigate(url: string): Promise<void> {
    await this.core.navigate(url);
    
    // Remove ads from the live page after navigation
    await this.pageOptimizer.removeAdsFromPage();
  }

  async click(selector: string): Promise<void> {
    return this.actions.click(selector);
  }

  async clickWithSelectors(selectors: string[]): Promise<ClickResult> {
    return this.actions.clickWithSelectors(selectors);
  }

  async clickCoordinates(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    return this.actions.clickCoordinates(x, y, button);
  }

  async type(selector: string, text: string): Promise<void> {
    return this.actions.type(selector, text);
  }

  async typeWithSelectors(selectors: string[], text: string): Promise<TypeResult> {
    return this.actions.typeWithSelectors(selectors, text);
  }

  async hover(selector: string): Promise<void> {
    return this.actions.hover(selector);
  }

  async scroll(direction: 'up' | 'down', amount: number = 100): Promise<void> {
    return this.actions.scroll(direction, amount);
  }

  async wait(duration: number): Promise<void> {
    return this.core.wait(duration);
  }

  async screenshot(): Promise<Buffer> {
    return this.core.screenshot();
  }

  async executeMouseAction(action: MouseAction): Promise<void> {
    return this.actions.executeMouseAction(action);
  }

  async executeKeyboardAction(action: KeyboardAction): Promise<void> {
    return this.actions.executeKeyboardAction(action);
  }

  async updateMousePosition(x: number, y: number): Promise<void> {
    return this.actions.updateMousePosition(x, y);
  }

  async getContext(): Promise<BrowserContext> {
    return this.core.getContext();
  }

  async getDOMContent(tokenBudget?: number): Promise<string> {
    if (!this.domStrategy) {
      this.domStrategy = new MinimizationDOMStrategy();
      this.domStrategy.setPage(this.core.page);
    }
    return this.domStrategy.getDOMContent(tokenBudget);
  }

  startScreenshotStream(handler: ScreenshotHandler): void {
    this.streaming.startScreenshotStream(handler);
  }

  startHighFPSStream(handler: FrameHandler): void {
    this.streaming.startHighFPSStream(handler);
  }

  stopHighFPSStream(): void {
    this.streaming.stopHighFPSStream();
  }

  stopScreenshotStream(): void {
    this.streaming.stopScreenshotStream();
  }

  getStreamingInfo(): StreamingInfo {
    return this.streaming.getStreamingInfo();
  }

  async close(): Promise<void> {
    // Clean up streaming first
    await this.streaming.cleanupStreaming();
    
    // Disable manual intervention mode
    await this.manualIntervention.disableManualInterventionMode();
    
    // Close core browser
    await this.core.close();
  }

  async enableManualInterventionMode(): Promise<void> {
    return this.manualIntervention.enableManualInterventionMode();
  }

  async disableManualInterventionMode(): Promise<void> {
    return this.manualIntervention.disableManualInterventionMode();
  }

  async updateCursorPosition(x: number, y: number): Promise<void> {
    return this.manualIntervention.updateCursorPosition(x, y);
  }

  async observeDOMChangesForAction(actionCallback: () => Promise<void>): Promise<DOMChangeResult> {
    return this.actions.observeDOMChangesForAction(actionCallback);
  }

  // DOM change tracking not supported by minimization strategy
} 