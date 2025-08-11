export async function checkOtp(phone: string, code: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const serviceSid = process.env.TWILIO_SERVICE_SID;
  
  // Development mode: accept specific test codes or fallback to our SMS service
  if (!serviceSid || process.env.NODE_ENV === 'development') {
    console.log(`[DEV] checkOtp called with phone: ${phone}, code: ${code}`);
    
    // Accept test codes for development
    if (code === '123456' || code === '111111') {
      console.log('[DEV] Test OTP code accepted');
      return true;
    }
    
    // Fall back to our existing SMS verification service
    const { verifySMSCode } = await import('../smsService.js');
    return verifySMSCode(phone, code);
  }
  
  const twilio = (await import("twilio")).default(sid, token);
  const res = await twilio.verify.v2.services(serviceSid).verificationChecks.create({ to: phone, code });
  return res.status === "approved";
}