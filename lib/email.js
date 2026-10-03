import { randomInt, createHash } from 'node:crypto';
import { remote, supabase, getCapsule, reserveAttempt } from './store.js';
import { db, transaction } from './local.js';
import { hashPassword } from './crypto.js';
export const codeDigest = (id,purpose,code) => createHash('sha256').update(`${id}:${purpose}:${code}`).digest('hex');
export function configured(){return Boolean(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM&&process.env.APP_URL);}
function base(){
 const appUrl = process.env.APP_URL || 'http://localhost:3000';
 const url=new URL(appUrl);
 if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('APP_URL ต้องใช้ HTTPS');
 return url.origin;
}
export async function sendMail(to,subject,text,key){
 if(!configured())throw new Error('ยังไม่ได้ตั้งค่าบริการอีเมล กรุณาติดต่อผู้ดูแล');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[to],subject,text}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่ภายหลัง');
}
function checked(result){if(result.error)throw new Error('บันทึกข้อมูลไม่สำเร็จ');return result.data;}
export async function requestCode(current,id,purpose){
 if(!['reset','notify'].includes(purpose)||!await getCapsule(current.id,id))throw new Error('ไม่พบแคปซูลของคุณ');
 const isTest = process.env.NODE_ENV === 'test';
 if(!configured() && isTest)throw new Error('ยังไม่ได้ตั้งค่าบริการอีเมล กรุณาติดต่อผู้ดูแล');
 if(!await reserveAttempt(`email-send:${current.id}`,5))throw new Error('ขออีเมลครบ 5 ครั้ง กรุณารอ 15 นาที');
 const code=String(randomInt(0,100000000)).padStart(8,'0');
 const row={capsule_id:id,purpose,owner_id:current.id,code_hash:codeDigest(id,purpose,code),expires_at:Date.now()+10*60000};
 if(remote())checked(await supabase().from('email_challenges').upsert(row));else db().prepare('INSERT INTO email_challenges VALUES(?,?,?,?,?) ON CONFLICT(capsule_id,purpose) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,owner_id=excluded.owner_id').run(id,purpose,current.id,row.code_hash,row.expires_at);
 if(configured()){
  await sendMail(current.email,purpose==='reset'?'ยืนยันการตั้งรหัสผ่านแคปซูลใหม่':'ยืนยันรับอีเมลแจ้งเตือนแคปซูล',`รหัสยืนยันของคุณ: ${code}\nใช้ภายใน 10 นาที สำหรับแคปซูล ${id}\nกลับไปกรอกในหน้าแคปซูลที่ ${base()}/capsules/${id}\nอย่าให้รหัสนี้กับใคร หากไม่ได้ขอให้เพิกเฉยต่ออีเมลนี้`);
  return {};
 } else {
  console.log(`\n======================================================`);
  console.log(`📧 [Campus Time Capsule - จำลองการส่งอีเมลสำหรับทดสอบ]`);
  console.log(`ส่งถึง: ${current.email}`);
  console.log(`หัวข้อ: ${purpose==='reset'?'ยืนยันการตั้งรหัสผ่านแคปซูลใหม่':'ยืนยันรับอีเมลแจ้งเตือนแคปซูล'}`);
  console.log(`🔑 รหัสยืนยัน OTP: ${code}`);
  console.log(`======================================================\n`);
  return { devCode: code };
 }
}
// Consume challenge and mutation in one transaction; duplicate/concurrent use fails.
export async function confirmCode(current,id,purpose,code,password,confirm){
 if(!['reset','notify'].includes(purpose)||!await getCapsule(current.id,id))throw new Error('ไม่พบแคปซูลของคุณ');
 if(!/^\d{8}$/.test(code||''))throw new Error('กรอกรหัสยืนยัน 8 หลัก');
 if(!await reserveAttempt(`email-check:${current.id}:${id}`,5))throw new Error('ลองครบ 5 ครั้ง กรุณารอ 15 นาที');
 let encoded=null;
 if(purpose==='reset'){if(typeof password!=='string'||password.length<8||password.length>128||password!==confirm)throw new Error('รหัสใหม่ต้องยาว 8–128 ตัวอักษรและยืนยันตรงกัน');encoded=await hashPassword(password);}
 const digest=codeDigest(id,purpose,code);
 if(remote()){const ok=checked(await supabase().rpc('consume_email_code',{p_owner:current.id,p_id:id,p_purpose:purpose,p_digest:digest,p_hash:encoded,p_email:current.email}));if(!ok)throw new Error('รหัสยืนยันไม่ถูกต้อง หมดอายุ หรือใช้แล้ว');}
 else transaction(d=>{const result=d.prepare('DELETE FROM email_challenges WHERE capsule_id=? AND purpose=? AND owner_id=? AND code_hash=? AND expires_at>?').run(id,purpose,current.id,digest,Date.now());if(!result.changes)throw new Error('รหัสยืนยันไม่ถูกต้อง หมดอายุ หรือใช้แล้ว');if(purpose==='reset')d.prepare('UPDATE capsule_secrets SET password_hash=? WHERE capsule_id=?').run(encoded,id);else d.prepare('INSERT INTO email_notices(capsule_id,email) VALUES(?,?) ON CONFLICT(capsule_id) DO UPDATE SET email=excluded.email').run(id,current.email);});
}
export async function sendDue(){
 const isTest = process.env.NODE_ENV === 'test';
 if(!configured() && isTest)throw new Error('ยังไม่ได้ตั้งค่าบริการอีเมล');
 let rows;
 if(remote())rows=checked(await supabase().from('email_notices').select('capsule_id,email,capsules!inner(opens_at)').eq('sent',0).lte('capsules.opens_at',new Date().toISOString()).limit(50));
 else rows=db().prepare('SELECT n.capsule_id,n.email FROM email_notices n JOIN capsules c ON n.capsule_id=c.id WHERE n.sent=0 AND c.opens_at<=? LIMIT 50').all(new Date().toISOString());
 let sent=0,failed=0;
 for(const row of rows){
  try{
   if(configured()){
    await sendMail(row.email,'แคปซูลของคุณพร้อมเปิดแล้ว',`ถึงเวลาพบข้อความจากตัวเองในอดีตแล้ว\nเปิดที่ ${base()}/capsules/${row.capsule_id}\nกรุณาเข้าสู่ระบบและกรอกรหัสผ่านแคปซูลเพื่ออ่าน ไม่มีข้อความส่วนตัวอยู่ในอีเมลนี้`, `capsule-ready-${row.capsule_id}`);
   } else {
    console.log(`\n======================================================`);
    console.log(`🔔 [Campus Time Capsule - แจ้งเตือนเมื่อถึงเวลาเปิด]`);
    console.log(`ส่งถึง: ${row.email}`);
    console.log(`แคปซูล ID: ${row.capsule_id} ถึงเวลาเปิดแล้ว!`);
    console.log(`======================================================\n`);
   }
   if(remote())checked(await supabase().from('email_notices').update({sent:1}).eq('capsule_id',row.capsule_id));
   else db().prepare('UPDATE email_notices SET sent=1 WHERE capsule_id=?').run(row.capsule_id);
   sent++;
  }catch{
   failed++;
  }
 }
 return {sent,failed};
}

