const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ======================
   OTP LOGIN SYSTEM
====================== */

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

/* ======================
   THREADED HEADLESS ENGINE
====================== */

let job={
  running:false,
  queue:[],
  success:0,
  failed:0,
  error:0,
  total:0,
  delay:2000,
  threads:1
};

let activeWorkers=0;

async function worker(browser){

  while(job.running && job.queue.length>0){

    const phone = job.queue.shift();
    if(!phone) return;

    job.total++;

    try{

      const page = await browser.newPage();

      await page.goto("https://your-own-site.com");

      await page.waitForSelector("#phoneInput");

      await page.click("#phoneInput",{clickCount:3});
      await page.keyboard.press("Backspace");

      await page.type("#phoneInput", phone);
      await page.click("#submitBtn");

      await page.waitForTimeout(2000);

      const text = await page.evaluate(()=>{
        return document.body.innerText;
      });

      if(text.includes("OTP Sent")){
        job.success++;
      }else{
        job.failed++;
      }

      await page.close();

    }catch(e){
      job.error++;
    }

    if(job.delay>0)
      await new Promise(r=>setTimeout(r,job.delay));
  }
}

app.post("/api/start-job", async (req,res)=>{

  const { numbers, delay, threads } = req.body;

  if(!numbers.length)
    return res.json({ok:false});

  job={
    running:true,
    queue:[...numbers],
    success:0,
    failed:0,
    error:0,
    total:0,
    delay:delay||2000,
    threads:threads||1
  };

  const browser = await puppeteer.launch({
    headless:true,
    args:["--no-sandbox","--disable-setuid-sandbox"]
  });

  const workers=[];

  for(let i=0;i<job.threads;i++){
    workers.push(worker(browser));
  }

  Promise.all(workers).then(async ()=>{
    await browser.close();
    job.running=false;
  });

  res.json({ok:true});
});

app.post("/api/stop-job",(req,res)=>{
  job.running=false;
  res.json({ok:true});
});

app.get("/api/status",(req,res)=>{
  res.json(job);
});

const PORT = process.env.PORT||3000;
app.listen(PORT,()=>console.log("Server running"));
