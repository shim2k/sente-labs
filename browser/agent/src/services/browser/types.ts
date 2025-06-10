import { Browser, Page, BrowserContext as PlaywrightContext, CDPSession } from 'playwright';

export interface StreamingConfig {
  mode: 'screenshot' | 'cdp';
  isActive: boolean;
  targetFps: number;
  quality: number;
  maxWidth: number;
  maxHeight: number;
}

export interface DOMChangeTracker {
  isActive: boolean;
  changeHistory: Array<{
    timestamp: number;
    type: string;
    target: string;
    description: string;
    location: string;
    significance: 'low' | 'medium' | 'high';
  }>;
  focusAreas: Map<string, number>; // CSS selectors with change frequency
  lastSnapshot: any;
  observerHandle: any;
}

export interface FrameData {
  type: 'frame' | 'screenshot' | 'dom_update' | 'lifecycle';
  data?: string;
  metadata?: {
    timestamp: number;
    sessionId?: number;
    targetFps?: number;
    quality?: number;
    frameSkip?: number;
    viewport?: {
      width: number;
      height: number;
    };
    cssViewport?: {
      width: number;
      height: number;
    };
    dpr?: number;
    scaleFactor?: number;
    [key: string]: any;
  };
  name?: string;
}

export interface BrowserState {
  browser: Browser | null;
  context: PlaywrightContext | null;
  page: Page | null;
  cdpSession: CDPSession | null;
}

export interface ClickResult {
  success: boolean;
  usedSelector?: string;
  error?: string;
}

export interface TypeResult {
  success: boolean;
  usedSelector?: string;
  error?: string;
}

export interface DOMChangeResult {
  hasChanges: boolean;
  changeCount: number;
  changeTypes: string[];
  urlChanged: boolean;
  beforeUrl: string;
  afterUrl: string;
}

export interface DOMChangeContext {
  recentChanges: any[];
  focusAreas: Array<{selector: string; frequency: number}>;
  changesSummary: string;
  focusedDOM?: string;
}

export interface ElementThumbnail {
  [elementId: string]: string;
}

export interface ScreenshotHandler {
  (screenshot: Buffer): void;
}

export interface FrameHandler {
  (frameData: FrameData): void;
}

export interface StreamingInfo {
  mode: string;
  fps?: number;
  quality?: number;
}

export interface BrowserContext {
  currentUrl: string;
  pageTitle: string;
  viewport: { width: number; height: number };
  dpr?: number;
  cookies?: any[];
  localStorage?: Record<string, string>;
} 