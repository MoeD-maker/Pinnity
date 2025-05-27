import twilio from 'twilio';

// Initialize Twilio client
console.log('Initializing Twilio with credentials...');
console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID ? 'Present' : 'Missing');
console.log('Auth Token:', process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing');
console.log('Phone Number:', process.env.TWILIO_PHONE_NUMBER ? 'Present' : 'Missing');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Store verification codes temporarily (in production, use Redis or database)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send SMS verification code to phone number
 * @param phoneNumber - Phone number in E.164 format
 * @returns Promise<boolean> - true if SMS sent successfully
 */
export async function sendSMSVerification(phoneNumber: string): Promise<boolean> {
  try {
    // Generate verification code
    const code = generateVerificationCode();
    
    // Store code with 10 minute expiration
    const expiresAt = Date.now() + (10 * 60 * 1000);
    verificationCodes.set(phoneNumber, { code, expiresAt });

    // Send SMS via Twilio
    const message = await client.messages.create({
      body: `Your Pinnity verification code is: ${code}. This code expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log('SMS sent successfully:', message.sid);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

/**
 * Verify SMS code entered by user
 * @param phoneNumber - Phone number in E.164 format
 * @param code - 6-digit verification code
 * @returns boolean - true if code is valid
 */
export function verifySMSCode(phoneNumber: string, code: string): boolean {
  const stored = verificationCodes.get(phoneNumber);
  
  if (!stored) {
    console.log('No verification code found for phone:', phoneNumber);
    return false;
  }

  // Check if code has expired
  if (Date.now() > stored.expiresAt) {
    console.log('Verification code expired for phone:', phoneNumber);
    verificationCodes.delete(phoneNumber);
    return false;
  }

  // Check if code matches
  if (stored.code !== code) {
    console.log('Invalid verification code for phone:', phoneNumber);
    return false;
  }

  // Code is valid, remove it from storage
  verificationCodes.delete(phoneNumber);
  console.log('Verification successful for phone:', phoneNumber);
  return true;
}

/**
 * Clean up expired verification codes
 */
function cleanupExpiredCodes() {
  const now = Date.now();
  verificationCodes.forEach((data, phoneNumber) => {
    if (now > data.expiresAt) {
      verificationCodes.delete(phoneNumber);
    }
  });
}

// Clean up expired codes every 5 minutes
setInterval(cleanupExpiredCodes, 5 * 60 * 1000);