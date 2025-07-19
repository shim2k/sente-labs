import express, { Request, Response } from 'express';
import { pool } from '../db/connection';
import { z } from 'zod';

const router = express.Router();

// Validation schema for waitlist signup
const waitlistSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  source: z.string().optional().default('landing_page')
});

interface WaitlistRequest extends Request {
  body: {
    email: string;
    source?: string;
  };
}

// POST /api/v1/waitlist - Add email to waitlist
router.post('/waitlist', async (req: WaitlistRequest, res: Response) => {
  try {
    // Validate request body
    const validation = waitlistSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const { email, source } = validation.data;
    
    // Get client IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress || null;
    const userAgent = req.get('User-Agent') || null;

    const client = await pool().connect();
    
    try {
      // Check if email already exists
      const existingResult = await client.query(
        'SELECT id FROM waitlist WHERE email = $1',
        [email]
      );

      if (existingResult.rows.length > 0) {
        return res.status(409).json({
          error: 'Email already exists in waitlist',
          message: 'This email is already subscribed to our waitlist.'
        });
      }

      // Insert new email into waitlist
      const result = await client.query(
        `INSERT INTO waitlist (email, source, ip_address, user_agent) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, email, subscribed_at`,
        [email, source, ipAddress, userAgent]
      );

      const newEntry = result.rows[0];

      console.log(`[WAITLIST] New signup: ${email} from ${source}`);

      res.status(201).json({
        message: 'Successfully added to waitlist',
        id: newEntry.id,
        email: newEntry.email,
        subscribed_at: newEntry.subscribed_at
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[WAITLIST] Error adding email to waitlist:', error);
    
    // Check if it's a unique constraint violation (duplicate email)
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json({
        error: 'Email already exists in waitlist',
        message: 'This email is already subscribed to our waitlist.'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add email to waitlist. Please try again later.'
    });
  }
});

// GET /api/v1/waitlist/stats - Get waitlist statistics (optional, for admin use)
router.get('/waitlist/stats', async (_req: Request, res: Response) => {
  try {
    const client = await pool().connect();
    
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_subscribers,
          COUNT(CASE WHEN subscribed_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
          COUNT(CASE WHEN subscribed_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
          COUNT(CASE WHEN subscribed_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30d
        FROM waitlist
      `);

      const stats = result.rows[0];

      res.json({
        total_subscribers: parseInt(stats.total_subscribers),
        signups: {
          last_24h: parseInt(stats.last_24h),
          last_7d: parseInt(stats.last_7d),
          last_30d: parseInt(stats.last_30d)
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[WAITLIST] Error getting waitlist stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get waitlist statistics.'
    });
  }
});

export default router;