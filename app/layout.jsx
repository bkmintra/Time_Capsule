import './globals.css';import PageTools from '@/components/PageTools';import Nav from '@/components/Nav';import { user } from '@/lib/auth';import { Heart } from 'lucide-react';import Toast from '@/components/Toast';
export const metadata={title:{default:'Campus Time Capsule — ฝากถึงฉันในวันข้างหน้า',template:'%s · Campus Time Capsule'},description:'เขียนถึงตัวเอง ปิดผนึกความทรงจำ แล้วกลับมาเปิดอ่านเมื่อถึงเวลาของมัน',icons:{icon:'/favicon.svg'}};
// เจตนาใช้ SSR (force-dynamic) เพื่อไม่ให้ทำ Cache และตรวจสอบ Session กับสถานะเวลาของแคปซูลใหม่จากเซิร์ฟเวอร์ทุกครั้ง
// เพื่อป้องกันผู้ใช้งานเห็นข้อมูลที่ Stale หรือพยายามเข้าถึงแคปซูลก่อนเวลา
export const dynamic='force-dynamic';
export default async function Layout({children}){const current=await user();return <html lang="th"><body><PageTools/><Toast/><a className="skip-link" href="#main">ข้ามไปเนื้อหา</a><Nav current={current}/><main id="main">{children}</main><footer className="footer wrap"><span className="footer-brand">timecapsule <Heart size={14}/></span><span>เก็บวันนี้ไว้ให้ตัวเองในวันข้างหน้า</span><span>กลุ่มโตมาชิกูรู · Campus Project</span></footer></body></html>;}
