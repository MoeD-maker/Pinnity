import { Router } from 'express';
import { sendSMSVerification, verifySMSCode } from '../smsService';
import { z } from 'zod';

const router = Router();

// Remove the alias routes - they were creating incorrect double paths

// Validation schemas
const sendSMSSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits')
});

const verifySMSSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  code: z.string().length(6, 'Verification code must be 6 digits')
});

/**
 * Send SMS verification code
 * POST /api/sms/send
 */
router.post('/send', async (req, res) => {
  try {
    console.log('SMS send request received');
    console.log('Raw body:', req.body);
    console.log('Body type:', typeof req.body);
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body format'
      });
    }
    
    const { phoneNumber } = sendSMSSchema.parse(req.body);
    
    // Format phone number to E.164 format if needed
    let formattedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      // Add +1 for US/Canada numbers if no country code
      formattedPhone = phoneNumber.startsWith('1') ? `+${phoneNumber}` : `+1${phoneNumber}`;
    }

    console.log('Attempting to send SMS to:', formattedPhone);
    const success = await sendSMSVerification(formattedPhone);
    console.log('SMS send result:', success);
    
    if (success) {
      return res.status(200).json({
        success: true,
        message: 'Verification code sent successfully',
        phoneNumber: formattedPhone
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code'
      });
    }
  } catch (error) {
    console.error('SMS send error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
        errors: error.errors
      });
    } else if (error instanceof SyntaxError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request format'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * Verify SMS code
 * POST /api/sms/verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { phoneNumber, code } = verifySMSSchema.parse(req.body);
    
    // Format phone number to E.164 format if needed
    let formattedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedPhone = phoneNumber.startsWith('1') ? `+${phoneNumber}` : `+1${phoneNumber}`;
    }

    const isValid = verifySMSCode(formattedPhone, code);
    
    if (isValid) {
      res.json({
        success: true,
        message: 'Phone number verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }
  } catch (error) {
    console.error('SMS verify error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request format',
        errors: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
});

export default router;