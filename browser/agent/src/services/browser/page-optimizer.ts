import { Page } from 'playwright';
import { logger } from '../../utils/logger';

export class BrowserPageOptimizer {
  private page: Page | null = null;

  setPage(page: Page | null): void {
    this.page = page;
  }

  async enableAdBlocking(): Promise<void> {
    if (!this.page) return;

    try {
      await this.page.route('**/*', (route) => {
        const url = route.request().url();
        const resourceType = route.request().resourceType();

        // Block known ad domains and patterns
        const adPatterns = [
          // Ad networks
          'doubleclick.net',
          'googlesyndication.com',
          'googleadservices.com',
          'googletagmanager.com',
          'google-analytics.com',
          'facebook.com/tr',
          'connect.facebook.net',
          'amazon-adsystem.com',
          'adsystem.amazon.com',

          // Generic ad patterns
          '/ads/',
          '/advertisement/',
          '/banner/',
          '/popup/',
          'pagead',
          'adsense',

          // Tracking
          'analytics',
          'tracking',
          'metrics',
          'telemetry'
        ];

        const shouldBlock = adPatterns.some(pattern => url.includes(pattern)) ||
          (resourceType === 'image' && (url.includes('ad') || url.includes('banner'))) ||
          (resourceType === 'script' && url.includes('ads'));

        if (shouldBlock) {
          route.abort();
        } else {
          route.continue();
        }
      });

      logger.info('Network-level ad blocking enabled');
    } catch (error) {
      logger.error('Failed to enable ad blocking', error);
    }
  }

  async removeAdsFromPage(): Promise<void> {
    if (!this.page) return;

    try {
      const adsRemoved = await this.page.evaluate(() => {
        let removedCount = 0;

        // Define ad selectors
        const adSelectors = [
          // Generic ad containers
          '[id*="ad"]:not([id*="add"]):not([id*="address"])',
          '[class*="ad"]:not([class*="add"]):not([class*="address"])',
          '[id*="ads"]', '[class*="ads"]',
          '[id*="advertisement"]', '[class*="advertisement"]',
          '[id*="banner"]', '[class*="banner"]',
          '[id*="sponsor"]', '[class*="sponsor"]',
          '[id*="promo"]', '[class*="promo"]',

          // Common ad networks
          '[id*="google_ads"]', '[class*="google_ads"]',
          '[id*="doubleclick"]', '[class*="doubleclick"]',
          '[id*="adsystem"]', '[class*="adsystem"]',

          // Specific ad patterns
          'iframe[src*="doubleclick"]',
          'iframe[src*="googlesyndication"]',
          'iframe[src*="googleadservices"]',
          'iframe[src*="ads"]',
          'div[data-ad]',
          '[data-google-query-id]',

          // Common ad container classes
          '.advertisement', '.sponsored', '.ad-container',
          '.banner-ad', '.sidebar-ad', '.header-ad', '.footer-ad'
        ];

        // Remove elements that match ad selectors
        adSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              const text = el.textContent?.toLowerCase() || '';
              const hasAdIndicators = text.includes('advertisement') ||
                text.includes('sponsored') ||
                text.includes('ad by') ||
                el.getAttribute('aria-label')?.toLowerCase().includes('advertisement') ||
                el.querySelector('iframe') ||
                el.tagName === 'IFRAME';

              // Be more aggressive for obvious ad elements
              const isObviousAd = el.tagName === 'IFRAME' ||
                el.getAttribute('data-google-query-id') ||
                text.includes('sponsored') ||
                text.includes('advertisement') ||
                (text.length < 100 && (selector.includes('ad') || selector.includes('banner')));

              if (hasAdIndicators || isObviousAd) {
                // Hide instead of remove to avoid layout shifts
                const htmlEl = el as HTMLElement;
                htmlEl.style.display = 'none';
                htmlEl.style.visibility = 'hidden';
                htmlEl.style.height = '0';
                htmlEl.style.width = '0';
                htmlEl.style.overflow = 'hidden';
                removedCount++;
              }
            });
          } catch (e) {
            // Ignore selector errors
          }
        });

        // Also hide elements with ad-related text content
        const allElements = document.querySelectorAll('div, span, section, aside');
        allElements.forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          if ((text.includes('advertisement') || text.includes('sponsored content')) &&
            text.length < 200) {
            (el as HTMLElement).style.display = 'none';
            removedCount++;
          }
        });

        return removedCount;
      });

      if (adsRemoved > 0) {
        logger.info(`Removed ${adsRemoved} ad elements from live page`);
      }
    } catch (error) {
      logger.error('Failed to remove ads from page', error);
    }
  }

  async loadWelcomePage(): Promise<void> {
    if (!this.page) return;

    try {
      // Create a beautiful welcome page with sophisticated animations inspired by our UI components
      const welcomeHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sente Labs Browser Agent - Ready</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 50%, #475569 75%, #64748b 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              overflow: hidden;
              position: relative;
            }
            
            /* Sophisticated layered background system */
            .background-layer {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 0;
            }
            
            .background-layer-1 {
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
            }
            
            .background-layer-2 {
              background: radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                          radial-gradient(circle at 70% 80%, rgba(147, 51, 234, 0.08) 0%, transparent 50%);
              animation: backgroundShift 20s ease-in-out infinite;
            }
            
            .background-layer-3 {
              background: linear-gradient(45deg, transparent 40%, rgba(79, 70, 229, 0.03) 50%, transparent 60%);
              animation: backgroundWave 15s ease-in-out infinite;
            }
            
            /* Main animated background waves */
            .wave-background {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              z-index: 1;
            }
            
            .wave-layer {
              position: absolute;
              width: 120%;
              height: 120%;
              background: linear-gradient(45deg, transparent 30%, rgba(59, 130, 246, 0.06) 40%, rgba(147, 51, 234, 0.04) 60%, transparent 70%);
              animation: waveMove 25s ease-in-out infinite;
              transform-origin: center;
            }
            
            .wave-layer:nth-child(1) { animation-delay: 0s; opacity: 0.6; }
            .wave-layer:nth-child(2) { animation-delay: 8s; opacity: 0.4; animation-duration: 30s; }
            .wave-layer:nth-child(3) { animation-delay: 16s; opacity: 0.3; animation-duration: 35s; }
            
            /* Floating particles system */
            .floating-particles {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              z-index: 2;
            }
            
            .particle {
              position: absolute;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 50%;
              animation: particleFloat 20s ease-in-out infinite;
              backdrop-filter: blur(1px);
            }
            
            .particle:nth-child(1) { width: 8px; height: 8px; top: 10%; left: 10%; animation-delay: 0s; animation-duration: 25s; }
            .particle:nth-child(2) { width: 6px; height: 6px; top: 20%; left: 80%; animation-delay: 5s; animation-duration: 30s; }
            .particle:nth-child(3) { width: 10px; height: 10px; top: 70%; left: 15%; animation-delay: 10s; animation-duration: 28s; }
            .particle:nth-child(4) { width: 4px; height: 4px; top: 80%; left: 70%; animation-delay: 15s; animation-duration: 32s; }
            .particle:nth-child(5) { width: 12px; height: 12px; top: 40%; left: 90%; animation-delay: 20s; animation-duration: 26s; }
            .particle:nth-child(6) { width: 7px; height: 7px; top: 60%; left: 5%; animation-delay: 3s; animation-duration: 29s; }
            .particle:nth-child(7) { width: 5px; height: 5px; top: 30%; left: 45%; animation-delay: 12s; animation-duration: 27s; }
            
            /* Main container with sophisticated glassmorphism */
            .welcome-container {
              position: relative;
              z-index: 10;
              text-align: center;
              max-width: 700px;
              padding: 30px 50px;
              background: rgba(255, 255, 255, 0.08);
              backdrop-filter: blur(25px);
              border-radius: 25px;
              border: 1px solid rgba(255, 255, 255, 0.15);
              box-shadow: 
                0 25px 50px rgba(0, 0, 0, 0.15),
                0 0 80px rgba(59, 130, 246, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.2);
              animation: containerFadeInUp 2.5s ease-out;
              overflow: hidden;
            }
            
            /* Enhanced logo with multiple animation layers */
            .logo {
              position: relative;
              width: 80px;
              height: 80px;
              margin: 0 auto 25px;
              background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 25%, #06b6d4 50%, #10b981 75%, #3b82f6 100%);
              border-radius: 25px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 36px;
              animation: logoBreathing 6s ease-in-out infinite;
              box-shadow: 
                0 15px 35px rgba(59, 130, 246, 0.3),
                0 0 50px rgba(139, 92, 246, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.3);
              overflow: hidden;
            }
            
            /* Enhanced typography */
            h1 {
              position: relative;
              font-size: 2.5rem;
              font-weight: 800;
              margin-bottom: 15px;
              background: linear-gradient(135deg, 
                #ffffff 0%, 
                #e2e8f0 20%, 
                #cbd5e1 40%, 
                #94a3b8 60%, 
                #64748b 80%, 
                #475569 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              animation: titleGlow 4s ease-in-out infinite;
              text-shadow: 0 0 30px rgba(255, 255, 255, 0.1);
            }
            
            .subtitle {
              font-size: 1.2rem;
              margin-bottom: 25px;
              opacity: 0.9;
              font-weight: 300;
              color: #e2e8f0;
              animation: subtitleFadeIn 3s ease-out 0.5s both;
              text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
            }
            
            /* Enhanced status indicator */
            .status-indicator {
              position: relative;
              display: inline-flex;
              align-items: center;
              gap: 12px;
              background: rgba(34, 197, 94, 0.15);
              padding: 12px 28px;
              border-radius: 50px;
              border: 1px solid rgba(34, 197, 94, 0.3);
              margin-bottom: 25px;
              animation: statusFadeIn 2s ease-out 1s both;
              backdrop-filter: blur(10px);
              box-shadow: 
                0 8px 25px rgba(34, 197, 94, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
              overflow: hidden;
            }
            
            .status-dot {
              position: relative;
              width: 14px;
              height: 14px;
              background: radial-gradient(circle, #22c55e 0%, #16a34a 70%);
              border-radius: 50%;
              animation: statusDotPulse 4s ease-in-out infinite;
              box-shadow: 
                0 0 15px rgba(34, 197, 94, 0.6),
                inset 0 1px 2px rgba(255, 255, 255, 0.3);
            }
            
            /* Enhanced instructions section */
            .instructions {
              position: relative;
              background: rgba(255, 255, 255, 0.04);
              padding: 20px;
              border-radius: 20px;
              border: 1px solid rgba(255, 255, 255, 0.08);
              margin-top: 20px;
              animation: instructionsFadeIn 2.5s ease-out 1.5s both;
              backdrop-filter: blur(15px);
              box-shadow: 
                0 10px 30px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.05);
              overflow: hidden;
            }
            
            .instruction-item {
              position: relative;
              display: flex;
              align-items: center;
              gap: 15px;
              margin-bottom: 15px;
              font-size: 0.95rem;
              animation: instructionSlideIn 2s ease-out;
              animation-fill-mode: both;
              padding: 8px 0;
            }
            
            .instruction-item:nth-child(1) { animation-delay: 2s; }
            .instruction-item:nth-child(2) { animation-delay: 2.3s; }
            .instruction-item:nth-child(3) { animation-delay: 2.6s; }
            
            .instruction-item:last-child {
              margin-bottom: 0;
            }
            
            .instruction-number {
              position: relative;
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, 
                rgba(59, 130, 246, 0.8) 0%, 
                rgba(147, 51, 234, 0.6) 50%, 
                rgba(79, 70, 229, 0.8) 100%);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 0.9rem;
              flex-shrink: 0;
              box-shadow: 
                0 4px 15px rgba(59, 130, 246, 0.3),
                inset 0 1px 2px rgba(255, 255, 255, 0.2);
              animation: numberPulse 4s ease-in-out infinite;
              animation-delay: inherit;
              overflow: hidden;
            }
            
            .instruction-text {
              color: #e2e8f0;
              line-height: 1.6;
              font-weight: 400;
            }
            
            /* Enhanced footer */
            .footer {
              margin-top: 40px;
              font-size: 0.9rem;
              opacity: 0.8;
              animation: footerFadeIn 2s ease-out 3s both;
              text-align: center;
            }
            
            .footer-text {
              color: #cbd5e1;
              margin-bottom: 15px;
              text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
            }
            
            .version {
              position: relative;
              background: rgba(255, 255, 255, 0.08);
              padding: 8px 20px;
              border-radius: 20px;
              font-size: 0.8rem;
              display: inline-block;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #94a3b8;
              box-shadow: 
                0 4px 15px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
              animation: versionGlow 5s ease-in-out infinite;
            }
            
            /* Sophisticated Animation Keyframes */
            @keyframes waveMove {
              0% { transform: translateX(-100%) translateY(-50%) rotate(-10deg); opacity: 0; }
              25% { opacity: 1; }
              75% { opacity: 1; }
              100% { transform: translateX(100%) translateY(50%) rotate(10deg); opacity: 0; }
            }
            
            @keyframes backgroundShift {
              0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
              50% { transform: scale(1.1) rotate(2deg); opacity: 1; }
            }
            
            @keyframes backgroundWave {
              0% { transform: translateX(-100%) skew(-15deg); opacity: 0; }
              50% { opacity: 1; }
              100% { transform: translateX(100%) skew(15deg); opacity: 0; }
            }
            
            @keyframes particleFloat {
              0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.3; }
              25% { transform: translateY(-20px) translateX(10px) rotate(90deg); opacity: 0.7; }
              50% { transform: translateY(-30px) translateX(-5px) rotate(180deg); opacity: 0.5; }
              75% { transform: translateY(-10px) translateX(-15px) rotate(270deg); opacity: 0.8; }
            }
            
            @keyframes containerFadeInUp {
              0% { opacity: 0; transform: translateY(60px) scale(0.9); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            @keyframes logoBreathing {
              0%, 100% { transform: scale(1) rotate(0deg); box-shadow: 0 15px 35px rgba(59, 130, 246, 0.3), 0 0 50px rgba(139, 92, 246, 0.2); }
              50% { transform: scale(1.05) rotate(2deg); box-shadow: 0 20px 45px rgba(59, 130, 246, 0.4), 0 0 70px rgba(139, 92, 246, 0.3); }
            }
            
            @keyframes titleGlow {
              0%, 100% { opacity: 1; text-shadow: 0 0 30px rgba(255, 255, 255, 0.1); }
              50% { opacity: 0.9; text-shadow: 0 0 40px rgba(255, 255, 255, 0.2), 0 0 60px rgba(59, 130, 246, 0.1); }
            }
            
            @keyframes subtitleFadeIn {
              0% { opacity: 0; transform: translateY(20px); }
              100% { opacity: 0.9; transform: translateY(0); }
            }
            
            @keyframes statusFadeIn {
              0% { opacity: 0; transform: translateY(30px) scale(0.8); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            @keyframes statusDotPulse {
              0%, 100% { transform: scale(1); box-shadow: 0 0 15px rgba(34, 197, 94, 0.6); }
              50% { transform: scale(1.1); box-shadow: 0 0 25px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.4); }
            }
            
            @keyframes instructionsFadeIn {
              0% { opacity: 0; transform: translateY(40px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes instructionSlideIn {
              0% { opacity: 0; transform: translateX(-40px); }
              100% { opacity: 1; transform: translateX(0); }
            }
            
            @keyframes numberPulse {
              0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3); }
              50% { transform: scale(1.05); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5), 0 0 30px rgba(147, 51, 234, 0.3); }
            }
            
            @keyframes footerFadeIn {
              0% { opacity: 0; transform: translateY(20px); }
              100% { opacity: 0.8; transform: translateY(0); }
            }
            
            @keyframes versionGlow {
              0%, 100% { box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1); }
              50% { box-shadow: 0 6px 25px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2); }
            }
            
            /* Accessibility: Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
              *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
              }
            }
          </style>
        </head>
        <body>
          <!-- Sophisticated layered background system -->
          <div class="background-layer background-layer-1"></div>
          <div class="background-layer background-layer-2"></div>
          <div class="background-layer background-layer-3"></div>
          
          <!-- Wave background system -->
          <div class="wave-background">
            <div class="wave-layer"></div>
            <div class="wave-layer"></div>
            <div class="wave-layer"></div>
          </div>
          
          <!-- Floating particles -->
          <div class="floating-particles">
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
            <div class="particle"></div>
          </div>
          
          <!-- Main container -->
          <div class="welcome-container">
            <!-- Enhanced logo with shimmer effect -->
            <div class="logo">🤖</div>
            
            <!-- Enhanced typography -->
            <h1>Sente Browser Agent</h1>
            <p class="subtitle">AI-Powered Web Automation Platform</p>
            
            <!-- Enhanced status indicator -->
            <div class="status-indicator">
              <div class="status-dot"></div>
              <span>Browser Ready & Connected</span>
            </div>
            
            <!-- Enhanced instructions with sophisticated animations -->
            <div class="instructions">
              <div class="instruction-item">
                <div class="instruction-number">1</div>
                <div class="instruction-text">Open the Instructions panel on the left sidebar</div>
              </div>
              <div class="instruction-item">
                <div class="instruction-number">2</div>
                <div class="instruction-text">Enter your task (e.g., "Navigate to Google and search for AI news")</div>
              </div>
              <div class="instruction-item">
                <div class="instruction-number">3</div>
                <div class="instruction-text">Watch as the AI agent autonomously completes your request</div>
              </div>
            </div>
            
            <!-- Enhanced footer -->
            <div class="footer">
              <div class="footer-text">Powered by Playwright & Advanced AI</div>
              <div class="version">v1.0.0 • High-FPS Streaming</div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Set the welcome page content
      await this.page.setContent(welcomeHTML, { waitUntil: 'domcontentloaded' });

      logger.info('Enhanced welcome page with sophisticated animations loaded successfully');
    } catch (error) {
      logger.error('Failed to load enhanced welcome page', error);
      // Don't throw error - browser can still function without welcome page
    }
  }
} 