import express from 'express';
import { paddleService, PaddleWebhookEvent } from '../services/paddle';
import { pool } from '../db/connection';

const router = express.Router();

// Middleware to parse raw body for signature verification
router.use('/paddle', express.raw({ type: 'application/json' }));

router.post('/paddle', async (req, res) => {
  const webhookStartTime = Date.now();
  
  try {
    // Get raw body and signature header
    const rawBody = req.body.toString();
    const signature = req.headers['paddle-signature'] as string;

    console.log('🔔 === PADDLE WEBHOOK RECEIVED ===');
    console.log('📋 Request Details:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
      hasSignature: !!signature,
      signaturePreview: signature ? signature.substring(0, 50) + '...' : null,
      bodyLength: rawBody.length,
      bodyPreview: rawBody.substring(0, 200) + (rawBody.length > 200 ? '...' : ''),
      allHeaders: Object.keys(req.headers),
    });

    // Extract signature
    if (!signature) {
      console.error('❌ WEBHOOK ERROR: Missing signature header');
      console.log('📋 Available headers:', Object.keys(req.headers));
      return res.status(400).json({ error: 'Missing signature header' });
    }

    console.log('🔐 Signature verification starting...');
    
    // Verify signature
    const signatureValid = paddleService.verifyWebhookSignature(rawBody, signature);
    console.log('🔐 Signature verification result:', {
      valid: signatureValid,
      webhookSecretConfigured: !!process.env.PADDLE_WEBHOOK_SECRET,
      isDevelopment: process.env.NODE_ENV === 'development'
    });
    
    if (!signatureValid) {
      console.error('❌ WEBHOOK ERROR: Signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature verified successfully');

    // Parse the webhook data
    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
      console.log('📦 Webhook data parsed:', {
        hasEventType: !!webhookData.event_type,
        hasData: !!webhookData.data,
        dataKeys: webhookData.data ? Object.keys(webhookData.data) : [],
        fullEventStructure: {
          event_type: webhookData.event_type,
          event_id: webhookData.event_id,
          occurred_at: webhookData.occurred_at,
          notification_id: webhookData.notification_id
        }
      });
    } catch (parseError) {
      console.error('❌ WEBHOOK ERROR: Failed to parse JSON body:', parseError);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const eventType = webhookData.event_type;

    // Check if this is a payment completion event
    const isPaymentEvent = paddleService.isPaymentCompletionEvent(eventType);
    console.log('🎯 Event type check:', {
      eventType,
      isPaymentEvent,
      supportedEvents: ['transaction.completed', 'transaction.paid']
    });
    
    if (!isPaymentEvent) {
      console.log('⏩ Ignoring non-payment webhook event:', eventType);
      return res.status(200).json({ message: 'Event ignored' });
    }

    console.log('💰 Processing payment event...');
    
    // Extract payment information from new Paddle webhook format
    const transactionData = webhookData.data;
    console.log('🔍 Transaction data structure:', {
      hasTransactionData: !!transactionData,
      transactionId: transactionData?.id,
      transactionStatus: transactionData?.status,
      hasCustomData: !!transactionData?.custom_data,
      hasCustomer: !!transactionData?.customer,
      hasDetails: !!transactionData?.details,
      customDataRaw: transactionData?.custom_data,
      customerEmail: transactionData?.customer?.email,
      currencyCode: transactionData?.currency_code,
      allTransactionKeys: transactionData ? Object.keys(transactionData) : []
    });

    let customData = null;
    try {
      customData = transactionData?.custom_data ? JSON.parse(transactionData.custom_data) : null;
      console.log('📝 Custom data parsed:', customData);
    } catch (customDataError) {
      console.error('❌ WEBHOOK ERROR: Failed to parse custom data:', customDataError);
      console.log('🔍 Raw custom data:', transactionData?.custom_data);
    }

    // Validate required data
    console.log('✅ Validation checks:', {
      hasCustomData: !!customData,
      hasUserId: !!customData?.userId,
      hasTokenAmount: !!customData?.tokenAmount,
      hasPackageId: !!customData?.packageId,
      customDataContent: customData
    });

    if (!customData?.userId || !customData?.tokenAmount || !customData?.packageId) {
      console.error('❌ WEBHOOK ERROR: Missing required custom data');
      console.log('🔍 Expected: userId, tokenAmount, packageId');
      console.log('🔍 Received:', customData);
      return res.status(400).json({ error: 'Missing custom data' });
    }

    const { userId, tokenAmount, packageId } = customData;
    const tokensToAdd = parseInt(tokenAmount);
    const orderId = transactionData.id;
    const email = transactionData.customer?.email;
    const amountPaid = transactionData.details?.totals?.grand_total;
    const currency = transactionData.currency_code;

    console.log('💳 Payment details extracted:', {
      userId,
      tokenAmount,
      packageId,
      tokensToAdd,
      orderId,
      email,
      amountPaid,
      currency,
      isValidTokenAmount: !isNaN(tokensToAdd) && tokensToAdd > 0
    });

    if (isNaN(tokensToAdd) || tokensToAdd <= 0) {
      console.error('❌ WEBHOOK ERROR: Invalid token amount:', tokenAmount);
      return res.status(400).json({ error: 'Invalid token amount' });
    }

    console.log('🔄 Starting database operations...');
    const client = await pool().connect();

    try {
      // Check if we've already processed this payment
      console.log('🔍 Checking for duplicate payment:', orderId);
      const existingTransaction = await client.query(
        'SELECT id FROM transactions WHERE paddle_order_id = $1',
        [orderId]
      );

      console.log('🔍 Duplicate check result:', {
        orderId,
        existingCount: existingTransaction.rows.length,
        isDuplicate: existingTransaction.rows.length > 0
      });

      if (existingTransaction.rows.length > 0) {
        console.warn('⚠️ Payment already processed, skipping:', orderId);
        client.release();
        return res.status(200).json({ message: 'Payment already processed' });
      }

      // Start transaction
      console.log('💾 Starting database transaction...');
      await client.query('BEGIN');

      try {
        // Record the transaction
        console.log('📝 Recording transaction in database...');
        const transactionResult = await client.query(`
          INSERT INTO transactions (
            user_id, paddle_order_id, amount, currency, tokens_purchased,
            package_id, email, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING id
        `, [userId, orderId, amountPaid, currency, tokensToAdd, packageId, email, 'completed']);

        console.log('📝 Transaction recorded:', {
          transactionId: transactionResult.rows[0]?.id,
          userId,
          orderId,
          amount: amountPaid,
          currency,
          tokens: tokensToAdd
        });

        // Add tokens to user account
        console.log('🪙 Adding tokens to user account...');
        const tokenResult = await client.query(`
          INSERT INTO user_tokens (user_id, tokens, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
          ON CONFLICT (user_id)
          DO UPDATE SET
            tokens = user_tokens.tokens + $2,
            updated_at = NOW()
          RETURNING tokens
        `, [userId, tokensToAdd]);

        const newTokenBalance = tokenResult.rows[0]?.tokens;
        console.log('🪙 Tokens updated:', {
          userId,
          tokensAdded: tokensToAdd,
          newBalance: newTokenBalance
        });

        // Commit transaction
        console.log('✅ Committing database transaction...');
        await client.query('COMMIT');

        const processingTime = Date.now() - webhookStartTime;
        console.log('🎉 === PAYMENT PROCESSED SUCCESSFULLY ===');
        console.log('🎉 Success summary:', {
          orderId,
          userId,
          email,
          tokensAdded: tokensToAdd,
          newTokenBalance,
          amountPaid,
          currency,
          packageId,
          processingTimeMs: processingTime,
          timestamp: new Date().toISOString()
        });

        res.status(200).json({ 
          message: 'Payment processed successfully',
          tokensAdded: tokensToAdd,
          newBalance: newTokenBalance
        });

      } catch (dbError) {
        // Rollback on error
        console.error('❌ DATABASE ERROR during transaction:', dbError);
        console.log('🔄 Rolling back database transaction...');
        await client.query('ROLLBACK');
        throw dbError;
      }

    } finally {
      console.log('🔚 Releasing database connection...');
      client.release();
    }

  } catch (error) {
    const processingTime = Date.now() - webhookStartTime;
    console.error('❌ === WEBHOOK PROCESSING FAILED ===');
    console.error('❌ Error details:', {
      error: error.message,
      stack: error.stack,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;