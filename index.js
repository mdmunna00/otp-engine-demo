const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

let job = {
  running:false,
  numbers:[],
  delay:2000,
  threads:1,
  headless:true,
  success:0,
  failed:0,
  error:0,
  total:0
};

app.post("/api/start-job",(req,res)=>{
  job.running = true;
  job.numbers = req.body.numbers || [];
  job.delay = req.body.delay || 2000;
  job.threads = req.body.threads || 1;
  job.headless = req.body.headless ?? true;
  job.success = 0;
  job.failed = 0;
  job.error = 0;
  job.total = 0;
  res.json({ok:true});
});

app.post("/api/stop-job",(req,res)=>{
  job.running = false;
  res.json({ok:true});
});

app.post("/api/update",(req,res)=>{
  const { success, failed, error } = req.body;
  if(success) job.success++;
  if(failed) job.failed++;
  if(error) job.error++;
  job.total++;
  res.json({ok:true});
});

app.get("/api/status",(req,res)=>{
  res.json(job);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log("Server running"));
