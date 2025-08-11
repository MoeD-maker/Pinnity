import { Router } from "express";
import { sendOtp } from "../services/TwilioVerify";

const r = Router();

r.post("/send", async (req, res) => {
  const raw = String(req.body.phone || "");
  const phone = raw.replace(/[^\d+]/g, "");
  if (!phone.startsWith("+")) return res.status(400).json({ message: "Phone must be E.164 like +14165551234" });
  try {
    const out = await sendOtp(phone);
    return res.status(200).json({ status: out.status });
  } catch (e: any) {
    return res.status(500).json({ message: "Failed to send OTP", detail: String(e.message || e) });
  }
});

export default r;