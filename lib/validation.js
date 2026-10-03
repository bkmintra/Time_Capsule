import { z } from 'zod';
const password = z.string().min(8,'ใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร').max(128,'รหัสผ่านต้องไม่เกิน 128 ตัวอักษร');
export const loginSchema=z.object({email:z.string().trim().email('กรุณากรอกอีเมลให้ถูกต้อง').max(254).transform(s=>s.toLowerCase()),password});
export const registerSchema=loginSchema.extend({name:z.string().trim().min(2,'ชื่อเล่นต้องมีอย่างน้อย 2 ตัวอักษร').max(40,'ชื่อเล่นยาวได้ไม่เกิน 40 ตัวอักษร'),confirm:z.string()}).refine(d=>d.password===d.confirm,{path:['confirm'],message:'รหัสผ่านยืนยันไม่ตรงกัน'});
export const capsuleSchema=z.object({title:z.string().trim().min(2,'ตั้งชื่อแคปซูลอย่างน้อย 2 ตัวอักษร').max(80,'ชื่อยาวได้ไม่เกิน 80 ตัวอักษร'),message:z.string().trim().min(10,'เขียนถึงตัวเองอย่างน้อย 10 ตัวอักษร').max(10000,'ข้อความยาวได้ไม่เกิน 10,000 ตัวอักษร'),opensAt:z.string().datetime({offset:true,message:'กรุณาเลือกวันและเวลาเปิด'}),password,confirm:z.string(),ack:z.literal('yes',{error:'กรุณารับทราบเงื่อนไขก่อนปิดผนึก'})}).refine(d=>d.password===d.confirm,{path:['confirm'],message:'รหัสผ่านยืนยันไม่ตรงกัน'});
export const reflectionSchema=z.object({body:z.string().trim().min(5,'เขียนความรู้สึกอย่างน้อย 5 ตัวอักษร').max(5000,'เขียนได้ไม่เกิน 5,000 ตัวอักษร')});
export function fields(error){return Object.fromEntries(error.issues.map(i=>[i.path[0],i.message]));}
