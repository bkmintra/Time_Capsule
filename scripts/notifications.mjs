// Run alongside the web server; no browser needs to remain open.
const url=process.env.APP_URL||'http://localhost:3000';
const secret=process.env.CRON_SECRET||'dev_cron_secret_campus_time_capsule_32chars';
console.log('🚀 เริ่มต้นระบบตรวจจับเวลาการแจ้งเตือน (Campus Time Capsule Notification Worker)');
console.log(`📡 ตรวจสอบที่: ${url}/api/cron/notifications ทุก 1 นาที`);
async function tick(){try{const r=await fetch(new URL('/api/cron/notifications',url),{method:'POST',headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(60000)});const data=await r.json();if(data.sent>0){console.log(`[${new Date().toLocaleTimeString('th-TH')}] ✅ ตรวจสอบสำเร็จ: ส่งการแจ้งเตือนแล้ว ${data.sent} รายการ`);}else{console.log(`[${new Date().toLocaleTimeString('th-TH')}] ⏳ ตรวจสอบสำเร็จ: ยังไม่มีแคปซูลถึงกำหนดส่ง`);}}catch(err){console.log(`[${new Date().toLocaleTimeString('th-TH')}] ⚠️ ตรวจสอบไม่สำเร็จ (ระบบจะลองใหม่ใน 1 นาที):`,err.message);}}
while(true){await tick();await new Promise(resolve=>setTimeout(resolve,60000));}
