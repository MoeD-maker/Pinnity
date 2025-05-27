import { apiPost } from './api';

/**
 * Send SMS verification code to phone number
 * @param phoneNumber - Phone number (can be formatted or unformatted)
 * @returns Promise<boolean> - true if SMS sent successfully
 */
export async function sendSMSVerification(phoneNumber: string): Promise<boolean> {
  try {
    console.log('Sending SMS request for phone:', phoneNumber);
    const response = await apiPost('/api/v1/sms/send', {
      phoneNumber: phoneNumber.trim()
    }) as { success: boolean };

    console.log('SMS response:', response);
    return response.success;
  } catch (error) {
    console.error('SMS sending error:', error);
    return false;
  }
}

/**
 * Verify SMS code entered by user
 * @param phoneNumber - Phone number (can be formatted or unformatted)
 * @param code - 6-digit verification code
 * @returns Promise<boolean> - true if verification successful
 */
export async function verifySMSCode(phoneNumber: string, code: string): Promise<boolean> {
  try {
    const response = await apiPost('/api/v1/sms/verify', {
      phoneNumber: phoneNumber,
      code: code
    }) as { success: boolean };

    return response.success;
  } catch (error) {
    console.error('SMS verification error:', error);
    return false;
  }
}

/**
 * Format phone number for display
 * @param phoneNumber - Phone number string
 * @returns Formatted phone number
 */
export function formatPhoneForDisplay(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Format US/Canada numbers as (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // For international numbers, just add spacing
  return phoneNumber;
}