/**
 * Simple DOM Extraction - Fast HTML cleaning
 */
import { Page } from 'playwright';
import { logger } from '../../../../utils/logger';

export class MinimizationDOMStrategy {
  private page: Page | null = null;

  setPage(page: Page | null): void {
    this.page = page;
  }

  async getDOMContent(tokenBudget: number = 10000): Promise<string> {
    if (!this.page) {
      return '<html><body><h1>Error</h1><p>No page available</p></body></html>';
    }

    if (this.page.isClosed()) {
      return '<html><body><h1>Error</h1><p>Page is closed</p></body></html>';
    }

    const startTime = Date.now();

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Wait for page to be ready before extraction
        await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });

        // Give additional time for dynamic content
        if (attempt === 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Extract and clean DOM in browser with LESS AGGRESSIVE noise removal
        const cleanedHTML = await this.page.evaluate(() => {
          // Create working copy containing only the <body> to avoid large <head> CSS/JS noise
          const tempDiv = document.createElement('div');
          // If body is missing for some reason, fall back to full document
          tempDiv.innerHTML = (document.body ? document.body.outerHTML : document.documentElement.outerHTML);

          // CONSERVATIVE CLEANING: Remove only obvious noise elements
          try {
            tempDiv.querySelectorAll(`
            script, style, template, noscript, meta[name*="viewport"], meta[charset], 
            link[rel="stylesheet"], link[rel="icon"],
            iframe[src*="ads"], iframe[src*="doubleclick"], iframe[src*="google"],
            [class*="ad-banner"], [class*="advertisement"], [id*="google-ad"],
            [style*="display:none"], [style*="display: none"]
          `.replace(/\s+/g, ' ').trim()).forEach(el => el.remove());
          } catch (e) {
            // If removal fails, continue with what we have
            console.warn('DOM cleaning failed:', e);
          }

          // Only remove clearly hidden elements (safer approach)
          try {
            tempDiv.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], [hidden]').forEach(el => {
              try {
                el.remove();
              } catch {
                // If we can't remove it, skip
              }
            });
          } catch (e) {
            // If batch removal fails, continue
          }

          // Get the cleaned HTML
          let html = tempDiv.innerHTML;

          // Build a compact list of elements that contain visible text (helps LLM locate labels like "Jobs")
          const elementSummaries: string[] = [];
          try {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
            let node: Node | null = walker.currentNode;
            while (node) {
              const el = node as HTMLElement;
              const tag = el.tagName?.toLowerCase();
              if (tag && !['script', 'style', 'template', 'meta', 'link'].includes(tag)) {
                const text = (el.innerText || el.textContent || '').trim();
                if (text && text.length < 120) {
                  // ignore invisible elements
                  const style = window.getComputedStyle(el);
                  if (style.display !== 'none' && style.visibility !== 'hidden') {
                    const idPart = el.id ? `#${el.id}` : '';
                    const classPart = el.className ? `.${Array.from(el.classList).slice(0, 2).join('.')}` : '';
                    elementSummaries.push(`${tag}${idPart}${classPart}: "${text.replace(/\s+/g, ' ').slice(0, 80)}"`);
                    if (elementSummaries.length >= 400) break; // avoid runaway size
                  }
                }
              }
              node = walker.nextNode();
            }
          } catch {
            // optional summarisation failed – ignore
          }

          if (elementSummaries.length) {
            const summaryBlock = `<!--\nELEMENT_SUMMARY_START\n${elementSummaries.join('\n')}\nELEMENT_SUMMARY_END\n-->`;
            html = summaryBlock + html;
          }

          // AGGRESSIVE TEXT CLEANING: Remove CSS, JSON, and other noise

          // Remove CSS blocks (be more precise to avoid removing content)
          html = html.replace(/@import\s+[^;]+;/gi, '');
          html = html.replace(/@media\s+[^{]+\{(?:[^{}]|\{[^}]*\})*\}/gi, '');
          html = html.replace(/@keyframes\s+[^{]+\{(?:[^{}]|\{[^}]*\})*\}/gi, '');

          // Remove vendor prefixes and animations (more precise)
          html = html.replace(/-webkit-[\w-]+\s*:\s*[^;}]+[;}]/gi, '');
          html = html.replace(/-moz-[\w-]+\s*:\s*[^;}]+[;}]/gi, '');
          html = html.replace(/-ms-[\w-]+\s*:\s*[^;}]+[;}]/gi, '');
          html = html.replace(/(?:animation|transform|transition)[\w-]*\s*:\s*[^;}]+[;}]/gi, '');

          // Remove complex styling patterns (gradients, filters, shadows)
          html = html.replace(/background\s*:\s*[^;}]*gradient[^;}]*[;}]/gi, '');
          html = html.replace(/filter\s*:\s*[^;}]+[;}]/gi, '');
          html = html.replace(/box-shadow\s*:\s*[^;}]+[;}]/gi, '');

          // Remove large JSON data blocks (more precise patterns)
          html = html.replace(/\{data:\{[^}]*entityUrn[^}]*\}[^}]*\}/gi, '');
          html = html.replace(/\{[^}]*entityUrn:[^}]*\}/gi, '');
          html = html.replace(/urn:li:[\w:.-]+/gi, '');
          html = html.replace(/\$type:com\.linkedin\.voyager[\w.-]+/gi, '');

          // Remove tracking and analytics data
          html = html.replace(/lixTracking:\{[^}]*\}/gi, '');
          html = html.replace(/experimentId:\d+/gi, '');
          html = html.replace(/segmentIndex:\d+/gi, '');

          // Remove excessive whitespace and newlines
          html = html.replace(/\s+/g, ' ');
          html = html.replace(/>\s+</g, '><');

          // Remove empty attributes and clean up
          html = html.replace(/\s+(class|id|style)=""/gi, '');
          html = html.replace(/\s+>/g, '>');

          return html.trim();
        });

        // Validate extraction result
        if (!cleanedHTML || cleanedHTML.length < 50) {
          throw new Error(`DOM extraction returned insufficient content: ${cleanedHTML.length} chars`);
        }

        // Apply token budget (rough: 4 chars per token)
        const targetLength = tokenBudget * 4;
        const finalHTML = cleanedHTML.length > targetLength
          ? cleanedHTML.substring(0, targetLength) + '...'
          : cleanedHTML;

        logger.info('DOM extraction completed', {
          time: Date.now() - startTime,
          originalLength: cleanedHTML.length,
          finalLength: finalHTML.length,
          tokenEstimate: Math.ceil(finalHTML.length / 4),
          attempt
        });

        return finalHTML;

      } catch (error) {
        logger.info(`DOM extraction attempt ${attempt} failed`, {
          error: error instanceof Error ? error.message : 'Unknown',
          attempt,
          willRetry: attempt < 3
        });

        if (attempt === 3) {
          // Final attempt failed, try fallback method
          try {
            const fallbackHTML = await this.getFallbackDOM();
            if (fallbackHTML && fallbackHTML.length > 50) {
              return fallbackHTML;
            }
          } catch (fallbackError) {
            logger.error('Fallback DOM extraction also failed', fallbackError);
          }

          logger.error('All DOM extraction attempts failed', error);
          return `<!-- Error: ${error instanceof Error ? error.message : 'Unknown'} -->
<html><body><h1>Extraction Error</h1></body></html>`;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }

    // Should never reach here due to loop structure
    return '<html><body><h1>Error</h1><p>Unexpected end of retry loop</p></body></html>';
  }

  private async getFallbackDOM(): Promise<string> {
    if (!this.page) return '';

    try {
      // Simple fallback: just get basic document structure
      const simpleHTML = await this.page.evaluate(() => {
        const body = document.body;
        if (!body) return '';

        // Get visible text content and basic structure
        const visibleText = body.innerText || body.textContent || '';
        const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: a.textContent?.trim() || '',
          href: a.getAttribute('href') || ''
        })).filter(link => link.text.length > 0);

        let html = '<html><body>';

        // Add basic page content
        if (visibleText.length > 0) {
          html += `<div class="content">${visibleText.substring(0, 2000)}</div>`;
        }

        // Add important links
        if (links.length > 0) {
          html += '<div class="links">';
          links.slice(0, 20).forEach(link => {
            html += `<a href="${link.href}">${link.text}</a> `;
          });
          html += '</div>';
        }

        html += '</body></html>';
        return html;
      });

      return simpleHTML;
    } catch (error) {
      logger.error('Fallback DOM extraction failed', error);
      return '';
    }
  }
}

export default MinimizationDOMStrategy; 