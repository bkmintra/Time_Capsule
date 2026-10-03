import { randomUUID } from 'node:crypto';
import { capsuleSchema } from './validation.js';
import { hashPassword, checkPassword } from './crypto.js';
import * as store from './store.js';
export async function createFor(owner,input){
 const data=capsuleSchema.parse(input);
 if(new Date(data.opensAt).getTime()<=Date.now())throw new Error('วันเปิดต้องอยู่ในอนาคต ลองเลือกเวลาใหม่อีกครั้ง');
 const id=randomUUID();await store.createRecord({id,owner_id:owner,title:data.title,created_at:new Date().toISOString(),opens_at:data.opensAt},data.message,await hashPassword(data.password));return id;
}
export async function openFor(owner,id,password){
 const c=await store.getCapsule(owner,id);
 if(!c)throw new Error('ไม่พบแคปซูลนี้ หรือคุณไม่มีสิทธิ์เข้าถึง');
 if(Date.parse(c.opens_at)>Date.now())throw new Error('ยังไม่ถึงเวลาเปิด อดใจรออีกนิดนะ');
 if(typeof password!=='string'||password.length>128||password.length<1)throw new Error('กรุณากรอกรหัสผ่านแคปซูล');
 const key=`capsule:${owner}:${id}`;
 if(!await store.reserveAttempt(key))throw new Error('ลองรหัสผ่านครบ 5 ครั้งแล้ว กรุณารอให้ครบ 15 นาทีจากครั้งแรกก่อนลองใหม่');
 if(!await checkPassword(await store.secret(id),password))throw new Error('รหัสผ่านแคปซูลไม่ถูกต้อง ลองทบทวนอีกครั้งนะ');
 await store.resetAttempts(key);await store.markOpened(id);return await store.content(id);
}
