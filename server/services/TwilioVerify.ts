import twilio from "twilio";

// Read Twilio configuration from environment
const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

let client: ReturnType<typeof twilio> | null = null;

if (sid && token) {
  client = twilio(sid, token);
} else {
  console.warn(
    "Twilio Verify not configured. OTP operations will use a mock implementation."
  );
}

export async function sendOtp(phone: string) {
  if (!client || !serviceSid) {
    console.log(`Mock sendOtp called for ${phone}`);
    return { sid: "mock", status: "pending" };
  }

  const res = await client.verify.v2.services(serviceSid).verifications.create({
    to: phone,
    channel: "sms",
  });
  return { sid: res.sid, status: res.status };
}

export async function checkOtp(phone: string, code: string): Promise<boolean> {
  if (!client || !serviceSid) {
    console.log(`Mock checkOtp called for ${phone} with code ${code}`);
    return true;
  }

  const res = await client.verify.v2.services(serviceSid).verificationChecks.create({
    to: phone,
    code,
  });
  return res.status === "approved";
}