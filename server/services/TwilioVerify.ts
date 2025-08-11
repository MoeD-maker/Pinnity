import twilio from "twilio";

const sid = process.env.TWILIO_ACCOUNT_SID!;
const token = process.env.TWILIO_AUTH_TOKEN!;
const serviceSid = process.env.TWILIO_SERVICE_SID!;

if (!sid || !token || !serviceSid) {
  throw new Error("Twilio Verify not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SERVICE_SID.");
}

const client = twilio(sid, token);

export async function sendOtp(phone: string) {
  const res = await client.verify.v2.services(serviceSid).verifications.create({ to: phone, channel: "sms" });
  return { sid: res.sid, status: res.status };
}

export async function checkOtp(phone: string, code: string): Promise<boolean> {
  const res = await client.verify.v2.services(serviceSid).verificationChecks.create({ to: phone, code });
  return res.status === "approved";
}