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
    
    // Store code with 10 minute expiration BEFORE sending SMS
    const expiresAt = Date.now() + (10 * 60 * 1000);
    verificationCodes.set(phoneNumber, { code, expiresAt });
    console.log(`Stored verification code ${code} for ${phoneNumber}, expires at ${new Date(expiresAt)}`);

    // Send SMS via Twilio
    const message = await client.messages.create({
      body: `Your Pinnity verification code is: ${code}. This code expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log('SMS sent successfully:', message.sid);
    console.log(`Code ${code} is ready for verification for ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    // Clean up stored code if SMS sending failed
    verificationCodes.delete(phoneNumber);
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
  console.log('Verifying code:', code, 'for phone:', phoneNumber);
  console.log('Stored codes:', Array.from(verificationCodes.entries()));
  
  const stored = verificationCodes.get(phoneNumber);
  
  if (!stored) {
    console.log('No verification code found for phone:', phoneNumber);
    return false;
  }

  console.log('Found stored code:', stored.code, 'expires at:', new Date(stored.expiresAt));

  // Check if code has expired
  if (Date.now() > stored.expiresAt) {
    console.log('Verification code expired for phone:', phoneNumber);
    verificationCodes.delete(phoneNumber);
    return false;
  }

  // Check if code has already been used - but allow recent successful verifications
  if (stored.code.startsWith('USED_')) {
    console.log('Verification code already used for phone:', phoneNumber, '- allowing within grace period');
    // Extract the original code and compare
    const originalStoredCode = stored.code.substring(5); // Remove 'USED_' prefix
    const inputCode = String(code).trim();
    
    if (originalStoredCode === inputCode) {
      console.log('Allowing duplicate verification within grace period for phone:', phoneNumber);
      return true;
    } else {
      console.log('Different code provided for already-used verification:', phoneNumber);
      return false;
    }
  }

  // Check if code matches (convert both to strings and trim)
  const inputCode = String(code).trim();
  const storedCode = String(stored.code).trim();
  
  console.log('Comparing codes - Input:', inputCode, 'Stored:', storedCode);
  
  if (storedCode !== inputCode) {
    console.log('Invalid verification code for phone:', phoneNumber, 'Expected:', storedCode, 'Got:', inputCode);
    return false;
  }

  // Code is valid, mark it as used but keep it for a grace period
  const originalCode = stored.code;
  stored.code = 'USED_' + stored.code;
  // Extend expiration by 30 seconds to handle duplicate requests gracefully
  stored.expiresAt = Date.now() + (30 * 1000);
  console.log('Verification successful for phone:', phoneNumber, 'Original code:', originalCode);
  
  // Clean up used codes after grace period to prevent memory leaks
  // But don't delete immediately to handle legitimate duplicate requests
  setTimeout(() => {
    const currentStored = verificationCodes.get(phoneNumber);
    // Only delete if it's still the same used code
    if (currentStored && currentStored.code.startsWith('USED_')) {
      verificationCodes.delete(phoneNumber);
      console.log('Cleaned up used verification code for:', phoneNumber);
    }
  }, 60000); // 60 second grace period
  
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