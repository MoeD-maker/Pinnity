import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: `${(import.meta as any).env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${(import.meta as any).env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// SMS verification utilities
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Initialize reCAPTCHA verifier for SMS authentication
 * @param containerId - ID of the container element for reCAPTCHA
 */
export function initializeRecaptcha(containerId: string): RecaptchaVerifier {
  // Clear any existing verifier first
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (e) {
      console.log('Previous reCAPTCHA already cleared');
    }
    recaptchaVerifier = null;
  }
  
  // Clear the container element completely
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }
  
  // Create a new verifier
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      console.log('reCAPTCHA solved successfully');
    },
    'expired-callback': () => {
      console.log('reCAPTCHA expired, please try again');
    }
  });
  
  return recaptchaVerifier;
}

/**
 * Send SMS verification code to phone number
 * @param phoneNumber - Phone number in E.164 format (e.g., +1234567890)
 * @param recaptchaVerifier - reCAPTCHA verifier instance
 * @returns Promise<ConfirmationResult>
 */
export async function sendSMSVerification(
  phoneNumber: string, 
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  try {
    console.log('Sending SMS verification to:', phoneNumber);
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    console.log('SMS sent successfully');
    return confirmationResult;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
}

/**
 * Verify SMS code entered by user
 * @param confirmationResult - Result from sendSMSVerification
 * @param verificationCode - 6-digit code entered by user
 * @returns Promise<boolean> - true if verification successful
 */
export async function verifySMSCode(
  confirmationResult: ConfirmationResult, 
  verificationCode: string
): Promise<boolean> {
  try {
    console.log('Verifying SMS code:', verificationCode);
    const result = await confirmationResult.confirm(verificationCode);
    console.log('SMS verification successful:', result.user?.phoneNumber);
    
    // Sign out from Firebase immediately since we're using our own auth system
    await auth.signOut();
    
    return true;
  } catch (error) {
    console.error('Error verifying SMS code:', error);
    return false;
  }
}

/**
 * Clean up reCAPTCHA verifier
 */
export function cleanupRecaptcha(): void {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (e) {
      console.log('reCAPTCHA already cleared');
    }
    recaptchaVerifier = null;
  }
  
  // Also clear any remaining reCAPTCHA DOM elements
  const container = document.getElementById('recaptcha-container');
  if (container) {
    container.innerHTML = '';
  }
}

/**
 * Format phone number to E.164 format
 * @param phoneNumber - Phone number string
 * @param countryCode - Country code (default: +1 for US)
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string, countryCode: string = '+1'): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If it already starts with country code, return as is
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Add country code if not present
  return `${countryCode}${digits}`;
}

export default app;