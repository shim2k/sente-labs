import { CDPSession, Page } from 'playwright';
import { StreamingConfig, ScreenshotHandler, FrameHandler, StreamingInfo } from './types';
import { logger } from '../../utils/logger';
import { config } from '../../utils/config';

export class BrowserStreaming {
  private page: Page | null = null;
  private cdpSession: CDPSession | null = null;
  private screenshotInterval: NodeJS.Timeout | null = null;
  private screenshotHandler: ScreenshotHandler | null = null;
  private frameHandler: FrameHandler | null = null;
  private streamingConfig: StreamingConfig;

  constructor() {
    this.streamingConfig = {
      mode: config.enableCdpStreaming ? 'cdp' : 'screenshot',
      isActive: false,
      targetFps: config.cdpFrameRate || 30,
      quality: config.cdpQuality || 80,
      maxWidth: config.cdpMaxWidth || 1280,
      maxHeight: config.cdpMaxHeight || 720
    };
  }

  setPage(page: Page | null): void {
    this.page = page;
  }

  setCdpSession(session: CDPSession | null): void {
    this.cdpSession = session;
  }

  async initializeCDPStreaming(): Promise<void> {
    if (!this.page) return;

    try {
      // Get CDP session
      this.cdpSession = await this.page.context().newCDPSession(this.page);

      // Enable necessary CDP domains
      await this.cdpSession.send('Page.enable');
      await this.cdpSession.send('Runtime.enable');
      await this.cdpSession.send('DOM.enable');

      // Calculate frame skip ratio based on target FPS
      // CDP typically runs at ~60fps internally, so we calculate how many frames to skip
      const targetFps = Math.max(1, Math.min(60, this.streamingConfig.targetFps));
      const frameSkip = Math.max(1, Math.round(60 / targetFps));

      // Enable configurable frame capture
      await this.cdpSession.send('Page.startScreencast', {
        format: 'jpeg',
        quality: Math.max(1, Math.min(100, this.streamingConfig.quality)),
        maxWidth: this.streamingConfig.maxWidth,
        maxHeight: this.streamingConfig.maxHeight,
        everyNthFrame: frameSkip // Skip frames to achieve target FPS
      });

      logger.info(`CDP streaming initialized with ${targetFps} FPS target (every ${frameSkip} frames), quality: ${this.streamingConfig.quality}%`);

      // Listen for frame events
      this.cdpSession.on('Page.screencastFrame', (params) => {
        if (this.frameHandler && this.streamingConfig.isActive) {
          // Send frame acknowledgment to continue receiving frames
          this.cdpSession?.send('Page.screencastFrameAck', { sessionId: params.sessionId });

          // Process and forward the frame with metadata
          this.frameHandler({
            type: 'frame',
            data: params.data,
            metadata: {
              timestamp: Date.now(),
              sessionId: params.sessionId,
              targetFps: targetFps,
              quality: this.streamingConfig.quality,
              frameSkip: frameSkip,
              viewport: {
                width: params.metadata.deviceWidth || this.streamingConfig.maxWidth,
                height: params.metadata.deviceHeight || this.streamingConfig.maxHeight
              }
            }
          });
        }
      });

      // Listen for DOM changes for incremental updates
      this.cdpSession.on('DOM.documentUpdated', () => {
        if (this.frameHandler && this.streamingConfig.isActive) {
          this.frameHandler({
            type: 'dom_update',
            metadata: {
              timestamp: Date.now()
            }
          });
        }
      });

      // Listen for page lifecycle events
      this.cdpSession.on('Page.lifecycleEvent', (params) => {
        if (this.frameHandler && this.streamingConfig.isActive) {
          this.frameHandler({
            type: 'lifecycle',
            name: params.name,
            metadata: {
              timestamp: Date.now()
            }
          });
        }
      });

    } catch (error) {
      logger.error('Failed to initialize CDP streaming, falling back to screenshot mode', error);
      this.streamingConfig.mode = 'screenshot';
    }
  }

  startScreenshotStream(handler: ScreenshotHandler): void {
    this.screenshotHandler = handler;

    this.screenshotInterval = setInterval(async () => {
      try {
        if (this.page && this.screenshotHandler && !this.page.isClosed()) {
          const screenshot = await this.page.screenshot({ type: 'png' });
          this.screenshotHandler(screenshot);
        }
      } catch (error) {
        // Simple error logging without complex recovery
        logger.error('Screenshot capture failed', error);
      }
    }, config.screenshotInterval);
  }

  startHighFPSStream(handler: FrameHandler): void {
    this.frameHandler = handler;
    this.streamingConfig.isActive = true;

    if (this.streamingConfig.mode === 'cdp' && this.cdpSession) {
      logger.info('Started high-FPS CDP streaming');
      // CDP streaming is already set up in initializeCDPStreaming()
      // Frames will be delivered via the screencastFrame event
    } else {
      // Fallback to optimized screenshot streaming
      logger.info('Started optimized screenshot streaming (CDP not available)');
      this.startOptimizedScreenshotStream();
    }
  }

  private startOptimizedScreenshotStream(): void {
    // Use much faster intervals when in optimized mode
    const optimizedInterval = Math.max(16, config.screenshotInterval); // Minimum 60 FPS cap

    this.screenshotInterval = setInterval(async () => {
      try {
        if (this.page && this.frameHandler && !this.page.isClosed() && this.streamingConfig.isActive) {
          const screenshot = await this.page.screenshot({ type: 'png' });
          this.frameHandler({
            type: 'screenshot',
            data: screenshot.toString('base64'),
            metadata: {
              timestamp: Date.now(),
              format: 'png',
              viewport: {
                width: config.viewportWidth,
                height: config.viewportHeight
              }
            }
          });
        }
      } catch (error) {
        logger.error('Optimized screenshot capture failed', error);
      }
    }, optimizedInterval);
  }

  stopHighFPSStream(): void {
    this.streamingConfig.isActive = false;
    this.frameHandler = null;

    if (this.cdpSession && this.streamingConfig.mode === 'cdp') {
      try {
        // Stop CDP screencast first
        this.cdpSession.send('Page.stopScreencast').catch(error => {
          logger.error('Error stopping CDP screencast', error);
        });

        // Remove specific event listeners to prevent memory leaks
        this.cdpSession.off('Page.screencastFrame', () => { });
        this.cdpSession.off('DOM.documentUpdated', () => { });
        this.cdpSession.off('Page.lifecycleEvent', () => { });

        logger.info('Stopped CDP streaming and removed event listeners');
      } catch (error) {
        logger.error('Error stopping CDP streaming', error);
      }
    }

    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
  }

  stopScreenshotStream(): void {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
    this.screenshotHandler = null;
  }

  getStreamingInfo(): StreamingInfo {
    if (this.streamingConfig.mode === 'cdp') {
      return {
        mode: 'CDP High-FPS',
        fps: this.streamingConfig.targetFps,
        quality: this.streamingConfig.quality
      };
    } else {
      return {
        mode: 'Screenshot',
        fps: Math.round(1000 / config.screenshotInterval)
      };
    }
  }

  getCdpSession(): CDPSession | null {
    return this.cdpSession;
  }

  async cleanupStreaming(): Promise<void> {
    logger.info('Cleaning up streaming...');

    // Stop streaming first to prevent any ongoing operations
    this.stopHighFPSStream();
    this.stopScreenshotStream();

    // Clean up CDP session with proper error handling and timeout
    if (this.cdpSession) {
      try {
        logger.info('Cleaning up CDP session...');

        // Stop all CDP domains first
        await Promise.race([
          Promise.all([
            this.cdpSession.send('Page.stopScreencast').catch(() => { }), // Ignore errors if already stopped
            this.cdpSession.send('DOM.disable').catch(() => { }),
            this.cdpSession.send('Runtime.disable').catch(() => { }),
            this.cdpSession.send('Page.disable').catch(() => { })
          ]),
          new Promise(resolve => setTimeout(resolve, 2000)) // 2 second timeout
        ]);

        // Detach CDP session with timeout (this will automatically clean up listeners)
        await Promise.race([
          this.cdpSession.detach(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('CDP detach timeout')), 3000))
        ]);

        this.cdpSession = null;
        logger.info('CDP session cleaned up successfully');
      } catch (error) {
        logger.error('Error during CDP cleanup (forcing close)', error);
        // Force null the session even if cleanup failed
        this.cdpSession = null;
      }
    }
  }
} 