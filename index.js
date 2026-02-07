const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const otps = {}; // phone -> { otp, exp }

// ---- OTP (own website, mock) ----
app.post("/api/send-otp", (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.json({ ok:false });
  const otp = Math.floor(100000 + Math.random()*900000).toString();
  otps[phone] = { otp, exp: Date.now()+2*60*1000 };
  console.log("MOCK OTP:", phone, otp); // learning only
  res.json({ ok:true, mockOtp: otp });
});

app.post("/api/verify-otp", (req, res) => {
  const { phone, otp } = req.body;
  const row = otps[phone];
  if (!row || Date.now()>row.exp) return res.json({ ok:false });
  res.json({ ok: row.otp === otp });
});

// ---- Mock Engine Task ----
app.get("/api/mock-task", (req, res) => {
  // controlled random result
  const r = Math.random();
  if (r < 0.6) return res.json({ status:"success" });
  if (r < 0.85) return res.json({ status:"failed" });
  return res.json({ status:"error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log("Running on", PORT));
