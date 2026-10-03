import { hash, verify, Algorithm } from '@node-rs/argon2';
export const hashPassword=(value)=>hash(value,{algorithm:Algorithm.Argon2id,memoryCost:19456,timeCost:2,parallelism:1});
export async function checkPassword(encoded,value){try{return await verify(encoded,value);}catch{return false;}}
