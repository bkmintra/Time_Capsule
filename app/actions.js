"use server";
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { registerSchema,loginSchema,capsuleSchema,reflectionSchema,fields } from '@/lib/validation';
import { requireUser,registerAccount,loginAccount,logout } from '@/lib/auth';
import { createFor,openFor } from '@/lib/service';
import { getCapsule,writeReflection,removeRecord } from '@/lib/store';
function failure(e){return {error:e.issues?'ตรวจข้อมูลอีกครั้งนะ':e.message||'ทำรายการไม่สำเร็จ กรุณาลองใหม่',fields:e.issues?fields(e):{}};}
export async function registerUser(previous,form){let signedIn;try{signedIn=await registerAccount(registerSchema.parse(Object.fromEntries(form)));}catch(e){return failure(e);}if(signedIn)redirect('/capsules?welcome=1');return {success:'สมัครแล้ว! เปิดอีเมลเพื่อยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ'};}
export async function loginUser(previous,form){try{await loginAccount(loginSchema.parse(Object.fromEntries(form)));}catch(e){return failure(e);}redirect('/capsules');}
export async function logoutUser(){await logout();redirect('/');}
export async function createCapsule(previous,form){const current=await requireUser();let id;try{id=await createFor(current.id,capsuleSchema.parse(Object.fromEntries(form)));}catch(e){return failure(e);}revalidatePath('/capsules');redirect(`/capsules/${id}?sealed=1`);}
export async function openCapsule(id,previous,form){const current=await requireUser();try{return {message:await openFor(current.id,id,form.get('password')),opened:true};}catch(e){return failure(e);}}
export async function saveReflection(id,previous,form){const current=await requireUser();try{const c=await getCapsule(current.id,id);if(!c||!c.opened_at||Date.parse(c.opens_at)>Date.now())throw new Error('ต้องเปิดแคปซูลของตัวเองสำเร็จก่อนเขียนความรู้สึก');const {body}=reflectionSchema.parse(Object.fromEntries(form));await writeReflection(id,body);revalidatePath(`/capsules/${id}/reflection`);return {success:'เก็บความรู้สึกของวันนี้ไว้แล้ว ♡'};}catch(e){return failure(e);}}
export async function deleteCapsule(id,previous,form){const current=await requireUser();try{if(form.get('confirm')!=='DELETE')throw new Error('พิมพ์ DELETE เพื่อยืนยันการลบ');const c=await getCapsule(current.id,id);if(!c)throw new Error('ไม่พบแคปซูลนี้');await removeRecord(current.id,id);}catch(e){return failure(e);}revalidatePath('/capsules');redirect('/capsules?deleted=1');}

export async function emailRequest(id,purpose,previous,form){const current=await requireUser();try{const {requestCode}=await import('@/lib/email');const result=await requestCode(current,id,purpose);return {success:result?.devCode?`ส่งรหัสยืนยันแล้ว! [โหมดทดสอบ: รหัส OTP ของคุณคือ ${result.devCode}]`:'ส่งรหัสยืนยันไปยังอีเมลของบัญชีแล้ว ใช้ได้ภายใน 10 นาที'};}catch(e){return failure(e);}}
export async function emailConfirm(id,purpose,previous,form){const current=await requireUser();try{const {confirmCode}=await import('@/lib/email');await confirmCode(current,id,purpose,form.get('code'),form.get('password'),form.get('confirm'));return {success:purpose==='reset'?'ตั้งรหัสใหม่แล้ว ใช้รหัสใหม่เปิดเมื่อถึงเวลาได้เลย':'ยืนยันแล้ว! เราจะส่งอีเมลเมื่อถึงเวลาเปิด',done:true};}catch(e){return failure(e);}}
