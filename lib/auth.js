import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { db } from './local.js';
import { remote, supabase, reserveAttempt, resetAttempts } from './store.js';
import { hashPassword, checkPassword } from './crypto.js';
const digest=value=>createHash('sha256').update(value).digest('hex');
const cookieName='ctc_session';
const options={httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'};
export async function user(){const token=(await cookies()).get(cookieName)?.value;if(!token)return null;
 if(remote()){const {data,error}=await supabase(false).auth.getUser(token);if(error||!data.user)return null;return{id:data.user.id,name:data.user.user_metadata?.name||'เพื่อนจากอนาคต',email:data.user.email};}
 const row=db().prepare('SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').get(digest(token),Date.now());return row?{...row}:null;
}
export async function requireUser(){const current=await user();if(!current)redirect('/login');return current;}
async function localSession(id){const token=randomBytes(32).toString('base64url');db().prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());db().prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),id,Date.now()+7*86400000);(await cookies()).set(cookieName,token,{...options,maxAge:7*86400});}
export async function registerAccount(data){
 if(remote()){const {data:result,error}=await supabase(false).auth.signUp({email:data.email,password:data.password,options:{data:{name:data.name}}});if(error)throw new Error('สมัครสมาชิกไม่สำเร็จ ลองใช้อีเมลอื่นหรือตรวจสอบอีกครั้ง');if(result.session){(await cookies()).set(cookieName,result.session.access_token,{...options,maxAge:result.session.expires_in});return true;}return false;}
 const id=randomUUID(),encoded=await hashPassword(data.password);try{db().prepare('INSERT INTO users VALUES(?,?,?,?)').run(id,data.email,data.name,encoded);}catch{throw new Error('อีเมลนี้ไม่สามารถใช้สมัครได้ ลองเข้าสู่ระบบหรือใช้อีเมลอื่น');}await localSession(id);return true;
}
export async function loginAccount(data){
 const key=`login:${digest(data.email)}`;if(!await reserveAttempt(key,10))throw new Error('ลองเข้าสู่ระบบหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่');
 if(remote()){const {data:result,error}=await supabase(false).auth.signInWithPassword(data);if(error||!result.session)throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ยืนยันอีเมล');(await cookies()).set(cookieName,result.session.access_token,{...options,maxAge:result.session.expires_in});}
 else{const u=db().prepare('SELECT * FROM users WHERE email=?').get(data.email);if(!u||!await checkPassword(u.password_hash,data.password))throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');await localSession(u.id);}
 await resetAttempts(key);
}
export async function logout(){const jar=await cookies(),token=jar.get(cookieName)?.value;if(token&&!remote())db().prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));jar.delete(cookieName);}
