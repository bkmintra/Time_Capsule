import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
let instance;
export function db(){
 if(instance)return instance;
 const file=process.env.LOCAL_DB_PATH||resolve('.data/capsule.sqlite');mkdirSync(dirname(file),{recursive:true});
 instance=new DatabaseSync(file);instance.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password_hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS capsules(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,created_at TEXT NOT NULL,opens_at TEXT NOT NULL,opened_at TEXT);
 CREATE TABLE IF NOT EXISTS capsule_contents(capsule_id TEXT PRIMARY KEY REFERENCES capsules(id) ON DELETE CASCADE,message TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS capsule_secrets(capsule_id TEXT PRIMARY KEY REFERENCES capsules(id) ON DELETE CASCADE,password_hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS reflections(capsule_id TEXT PRIMARY KEY REFERENCES capsules(id) ON DELETE CASCADE,body TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS email_challenges(capsule_id TEXT NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,purpose TEXT NOT NULL,owner_id TEXT NOT NULL,code_hash TEXT NOT NULL,expires_at INTEGER NOT NULL,PRIMARY KEY(capsule_id,purpose));
 CREATE TABLE IF NOT EXISTS email_notices(capsule_id TEXT PRIMARY KEY REFERENCES capsules(id) ON DELETE CASCADE,email TEXT NOT NULL,sent INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset_at INTEGER NOT NULL);`);return instance;
}
export function transaction(fn){const d=db();d.exec('BEGIN IMMEDIATE');try{const result=fn(d);d.exec('COMMIT');return result;}catch(e){d.exec('ROLLBACK');throw e;}}
// Increment before verification: concurrent requests cannot bypass the limit.
export function reserveLocal(key,limit=5,windowMs=15*60*1000){return transaction(d=>{const now=Date.now(),row=d.prepare('SELECT * FROM attempts WHERE key=?').get(key);if(row&&row.reset_at>now&&row.count>=limit)return false;
 d.prepare('INSERT INTO attempts(key,count,reset_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,reset_at=excluded.reset_at').run(key,row&&row.reset_at>now?row.count+1:1,row&&row.reset_at>now?row.reset_at:now+windowMs);return true;});}
