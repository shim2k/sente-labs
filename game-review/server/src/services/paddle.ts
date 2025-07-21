import crypto from 'crypto';

export interface PaddleWebhookEvent {
  alert_id: string;
  alert_name: string;
  balance_currency: string;
  balance_earnings: string;
  balance_fee: string;
  balance_gross: string;
  balance_tax: string;
  checkout_id: string;
  country: string;
  coupon: string;
  currency: string;
  customer_name: string;
  earnings: string;
  email: string;
  event_time: string;
  fee: string;
  ip_country: string;
  marketing_consent: string;
  order_id: string;
  passthrough: string;
  payment_method: string;
  payment_tax: string;
  product_id: string;
  product_name: string;
  quantity: string;
  receipt_url: string;
  sale_gross: string;
  used_checkout_id: string;
  user_id: string;
  p_signature: string;
  // Custom fields we'll use
  custom_data?: string;
}

export interface PaddleCustomData {
  userId: string;
  tokenAmount: string;
  packageId: string;
}

export class PaddleService {
  private webhookSecret: string;

  constructor(webhookSecret?: string) {
    this.webhookSecret = webhookSecret || process.env.PADDLE_WEBHOOK_SECRET || '';
  }

  /**
   * Verifies a Paddle webhook signature (new Paddle system)
   * @param rawBody The raw webhook body as string
   * @param signature The signature from the webhook headers
   * @returns true if signature is valid
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    try {
      // Skip verification in development mode if no webhook secret is configured
      if (!this.webhookSecret && process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Paddle webhook signature verification skipped in development mode');
        return true;
      }

      if (!this.webhookSecret) {
        console.error('Paddle webhook secret is not configured');
        return false;
      }

      // New Paddle uses HMAC-SHA256 with webhook secret
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');

      // Paddle sends signature in format "ts=timestamp,h1=signature"
      const signatureData = signature.split(',');
      const h1 = signatureData.find(part => part.startsWith('h1='));
      
      if (!h1) {
        console.error('Invalid signature format from Paddle');
        return false;
      }

      const receivedSignature = h1.split('=')[1];
      
      // Compare signatures using constant time comparison
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error verifying Paddle webhook signature:', error);
      return false;
    }
  }

  /**
   * Parses custom data from Paddle webhook
   * @param customDataString The custom data string from Paddle
   * @returns Parsed custom data or null if invalid
   */
  parseCustomData(customDataString: string): PaddleCustomData | null {
    try {
      return JSON.parse(customDataString);
    } catch (error) {
      console.error('Error parsing Paddle custom data:', error);
      return null;
    }
  }

  /**
   * Determines if this is a payment completion event
   * @param eventType The Paddle event type (new system)
   * @returns true if this is a payment completion event
   */
  isPaymentCompletionEvent(eventType: string): boolean {
    // New Paddle event types
    return eventType === 'transaction.completed' || eventType === 'transaction.paid';
  }

  /**
   * Extracts payment information from webhook event
   * @param event The Paddle webhook event
   * @returns Payment information or null if invalid
   */
  extractPaymentInfo(event: PaddleWebhookEvent): {
    orderId: string;
    email: string;
    amountPaid: string;
    currency: string;
    customData: PaddleCustomData | null;
  } | null {
    try {
      const customData = event.custom_data ? this.parseCustomData(event.custom_data) : null;

      return {
        orderId: event.order_id,
        email: event.email,
        amountPaid: event.sale_gross,
        currency: event.currency,
        customData
      };
    } catch (error) {
      console.error('Error extracting payment info:', error);
      return null;
    }
  }
}

// Export singleton instance
export const paddleService = new PaddleService();