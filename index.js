const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

/* =========================
   GLOBAL JOB STATE
========================= */

let job = {
  running: false,
  numbers: [],
  current: null,
  delay: 2000,
  threads: 1,
  headless: true,
  success: 0,
  failed: 0,
  error: 0,
  total: 0,
  logs: [],
  lastPing: null
};

/* =========================
   LOG FUNCTION
========================= */

function addLog(msg) {
  const time = new Date().toLocaleTimeString();
  job.logs.unshift(`[${time}] ${msg}`);
  if (job.logs.length > 200) job.logs.pop();
}

/* =========================
   ADD NUMBERS (SAVE SERVER SIDE)
========================= */

app.post("/api/add-numbers", (req, res) => {
  const { numbers } = req.body;

  if (!numbers || !numbers.length)
    return res.json({ ok: false });

  numbers.forEach(n => {
    if (n && !job.numbers.includes(n)) {
      job.numbers.push(n);
    }
  });

  addLog(`Added ${numbers.length} numbers`);
  res.json({ ok: true });
});

/* =========================
   START JOB
========================= */

app.post("/api/start-job", (req, res) => {

  job.running = true;
  job.delay = req.body.delay || 2000;
  job.threads = req.body.threads || 1;
  job.headless = req.body.headless ?? true;

  job.success = 0;
  job.failed = 0;
  job.error = 0;
  job.total = 0;

  addLog("Engine Started");

  res.json({ ok: true });
});

/* =========================
   STOP JOB
========================= */

app.post("/api/stop-job", (req, res) => {
  job.running = false;
  job.current = null;
  addLog("Engine Stopped");
  res.json({ ok: true });
});

/* =========================
   ENGINE UPDATE (LOCAL PC)
========================= */

app.post("/api/update", (req, res) => {

  const { success, failed, error, current } = req.body;

  if (current) job.current = current;

  if (success) {
    job.success++;
    addLog(`SUCCESS: ${job.current}`);
  }

  if (failed) {
    job.failed++;
    addLog(`FAILED: ${job.current}`);
  }

  if (error) {
    job.error++;
    addLog(`ERROR: ${job.current}`);
  }

  if (success || failed || error) {
    job.total++;
    job.numbers.shift(); // auto remove used number
  }

  res.json({ ok: true });
});

/* =========================
   PC HEARTBEAT
========================= */

app.post("/api/ping", (req, res) => {
  job.lastPing = Date.now();
  res.json({ ok: true });
});

/* =========================
   STATUS API
========================= */

app.get("/api/status", (req, res) => {
  res.json(job);
});

/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
