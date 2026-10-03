import {timingSafeEqual} from 'node:crypto';
import {sendDue} from '@/lib/email';
export const runtime='nodejs';
export async function POST(request){
 const secret=process.env.CRON_SECRET||(process.env.NODE_ENV!=='production'?'dev_cron_secret_campus_time_capsule_32chars':'');
 const actual=Buffer.from(request.headers.get('authorization')||'');
 const expected=Buffer.from(`Bearer ${secret}`);
 if(!secret||secret.length<32||actual.length!==expected.length||!timingSafeEqual(actual,expected))return Response.json({error:'Unauthorized'},{status:401});
 try{return Response.json(await sendDue());}catch{return Response.json({error:'Email service unavailable'},{status:503});}
}
