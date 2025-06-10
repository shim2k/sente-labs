import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import { withRetry } from '../../utils/withRetry';
import { ScreenshotAnalysisResult } from './types';

export class ScreenshotAnalyzer {
  private openai: OpenAI;

  constructor(openai: OpenAI) {
    this.openai = openai;
  }

  async analyzeScreenshot(
    instruction: string, 
    screenshotBuffer: Buffer, 
    viewport?: { width: number; height: number }
  ): Promise<ScreenshotAnalysisResult> {
    try {
      const base64Screenshot = screenshotBuffer.toString('base64');
      
      // Use provided viewport or fallback to config defaults
      const actualViewport = viewport || { 
        width: 1280, 
        height: 720, 
        dpr: 1,
        scaleFactor: 1
      } as any;

      const dprInfo = (actualViewport as any).dpr ? `DevicePixelRatio: ${(actualViewport as any).dpr}` : 'DevicePixelRatio: 1';
      const scaleInfo = (actualViewport as any).scaleFactor && (actualViewport as any).scaleFactor !== 1 ? `Screenshot scaleFactor: ${(actualViewport as any).scaleFactor} (imagePx = cssPx * scaleFactor)` : '';
      
      const visionPayload = {
        model: 'gpt-4o' as const,
        max_tokens: 200,
        messages: [
          {
            role: 'user' as const,
            content: [
              {
                type: 'text' as const,
                text: `Task: "${instruction}".

FAST COORDINATE ANALYSIS - Be concise!

VIEWPORT (CSS px): ${actualViewport.width}x${actualViewport.height}
${dprInfo}
${scaleInfo}

Return coordinates in CSS pixels ONLY, e.g. "Click at (640, 360) to press the Jobs link"`
              },
              {
                type: 'image_url' as const,
                image_url: {
                  url: `data:image/png;base64,${base64Screenshot}`,
                  detail: 'low' as const
                }
              }
            ]
          }
        ]
      };

      const response = await withRetry(() => this.openai.chat.completions.create(visionPayload), { 
        retries: 1,
        timeout: 15000
      }) as OpenAI.Chat.Completions.ChatCompletion;

      const content = response.choices[0].message.content || 'Could not analyze screenshot';
      
      return {
        content,
        hasCoordinates: content.includes('(') && content.includes(')'),
        length: content.length
      };
    } catch (error) {
      logger.error('Screenshot analysis failed', error);
      return {
        content: '',
        hasCoordinates: false,
        length: 0
      };
    }
  }
} 