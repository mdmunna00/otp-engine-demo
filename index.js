const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* =====================
   OTP SYSTEM (existing)
===================== */

const otps = {};

app.post("/api/send-otp",(req,res)=>{
  const { phone } = req.body;
  if(!phone) return res.json({ok:false});
  const otp = Math.floor(100000 + Math.random()*900000).toString();
  otps[phone] = { otp, exp: Date.now()+2*60*1000 };
  res.json({ ok:true, mockOtp:otp });
});

app.post("/api/verify-otp",(req,res)=>{
  const { phone, otp } = req.body;
  const row = otps[phone];
  if(!row || Date.now()>row.exp) return res.json({ok:false});
  res.json({ ok: row.otp === otp });
});

/* =====================
   BACKGROUND ENGINE
===================== */

let job={
  running:false,
  queue:[],
  success:0,
  failed:0,
  error:0,
  total:0,
  delay:2000
};

let apis=[];
let apiIndex=0;

function getNextApi(){
  const api = apis[apiIndex % apis.length];
  apiIndex++;
  return api;
}

async function processQueue(){

  if(!job.running) return;

  if(job.queue.length===0){
    job.running=false;
    return;
  }

  const phone = job.queue.shift();
  job.total++;

  try{
    const api = getNextApi();
    const r = await fetch(api,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({phone})
    });

    const d = await r.json();

    if(d.status==="success") job.success++;
    else job.failed++;

  }catch(e){
    job.error++;
  }

  if(job.running){
    setTimeout(processQueue, job.delay);
  }
}

app.post("/api/start-job",(req,res)=>{
  const { numbers, apiList, delay } = req.body;

  if(!numbers.length || !apiList.length)
    return res.json({ok:false});

  job={
    running:true,
    queue:[...numbers],
    success:0,
    failed:0,
    error:0,
    total:0,
    delay:delay||2000
  };

  apis = apiList;
  apiIndex=0;

  processQueue();

  res.json({ok:true});
});

app.post("/api/stop-job",(req,res)=>{
  job.running=false;
  res.json({ok:true});
});

app.get("/api/status",(req,res)=>{
  res.json(job);
});

/* =====================
   HEADLESS TEST SYSTEM
===================== */

let lastReport=null;

app.post("/api/run-tests", async (req,res)=>{

  const { testCases } = req.body;

  const browser = await puppeteer.launch({
    headless:true,
    args:["--no-sandbox","--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  const results=[];

  for(const test of testCases){

    let status="PASS";
    let message="";
    const startTime=Date.now();

    try{
      await page.goto("https://your-own-site.com");

      await page.waitForSelector("#phoneInput");
      await page.type("#phoneInput", test.phone);
      await page.click("#submitBtn");

      await page.waitForTimeout(2000);

      const text = await page.evaluate(()=>document.body.innerText);

      if(!text.includes(test.expectedText)){
        status="FAIL";
        message="Expected text not found";
      }

    }catch(e){
      status="ERROR";
      message=e.message;
    }

    results.push({
      phone:test.phone,
      status,
      message,
      duration:Date.now()-startTime
    });
  }

  await browser.close();

  lastReport={
    total:results.length,
    pass:results.filter(r=>r.status==="PASS").length,
    fail:results.filter(r=>r.status==="FAIL").length,
    error:results.filter(r=>r.status==="ERROR").length,
    results
  };

  res.json(lastReport);
});

app.get("/api/report",(req,res)=>{
  res.json(lastReport||{message:"No report yet"});
});

const PORT = process.env.PORT||3000;
app.listen(PORT,()=>console.log("Running on",PORT));
