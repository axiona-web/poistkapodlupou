import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyRoute, useSession, usageAdminRoute } from '../cloudflare/worker.mjs';
import { ReviewStore } from '../cloudflare/reviews.mjs';
function memoryStorage(){const map=new Map();const api={async get(k){return structuredClone(map.get(k));},async put(k,v){map.set(k,structuredClone(v));},async delete(k){map.delete(k);},async list({prefix}){return new Map([...map].filter(([k])=>k.startsWith(prefix)).map(([k,v])=>[k,structuredClone(v)]));},async transaction(fn){return fn(api);}};return api;}
function env(extra={}){const s=new ReviewStore({storage:memoryStorage()});return{SMTP_HOST:'h',SMTP_USER:'ahoj@poistkapodlupou.sk',SMTP_PASS:'p',REVIEWS_ADMIN_TOKEN:'a'.repeat(40),REVIEWS:{idFromName:()=>'x',get:()=>({fetch:(_,init)=>s.fetch(new Request('https://i',init))})},...extra};}
function smtp(log){return()=>{const responses=['220 hi','250-mx\r\n250 AUTH PLAIN LOGIN','235 ok','250 ok','250 ok','354 go','250 queued','221 bye'];let n=0;return{writable:new WritableStream({write(c){log.push(new TextDecoder().decode(c));}}),readable:{getReader:()=>({read:async()=>n>=responses.length?{done:true}:{value:new TextEncoder().encode(responses[n++]+'\r\n'),done:false}})},close:async()=>{}};};}
const post=(path,body)=>new Request('https://w'+path,{method:'POST',headers:{Origin:'https://poistkapodlupou.sk'},body:JSON.stringify(body)});
const codeFrom=log=>{const all=log.join('');const subj=all.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/);return Buffer.from(subj[1],'base64').toString().match(/(\d{6})/)[1];};
test('code by e-mail, then session allows two extracts per day',async()=>{
 const e=env();const log=[];
 assert.equal((await verifyRoute(post('/public/verify/start',{email:'Jan@Example.sk'}),e,'/public/verify/start',{connect:smtp(log)})).status,200);
 const code=codeFrom(log);
 assert.equal((await verifyRoute(post('/public/verify/check',{email:'jan@example.sk',code:'000000'===code?'111111':'000000'}),e,'/public/verify/check')).status,400);
 const ok=await verifyRoute(post('/public/verify/check',{email:'jan@example.sk',code}),e,'/public/verify/check');
 assert.equal(ok.status,200);const {token}=await ok.json();
 assert.equal((await useSession(e,token,'extract')).ok,true);
 assert.equal((await useSession(e,token,'extract')).ok,true);
 assert.equal((await useSession(e,token,'extract')).status,429);
 assert.equal((await useSession(e,'f'.repeat(64),'extract')).status,401);
 assert.equal((await verifyRoute(post('/public/verify/check',{email:'jan@example.sk',code}),e,'/public/verify/check')).status,400,'code is single-use');
});
test('blocked domain cannot get a code and existing session stops working',async()=>{
 const e=env();const log=[];const auth={Authorization:'Bearer '+'a'.repeat(40),Origin:'https://poistkapodlupou.sk'};
 await verifyRoute(post('/public/verify/start',{email:'x@konkurencia.sk'}),e,'/public/verify/start',{connect:smtp(log)});
 const {token}=await (await verifyRoute(post('/public/verify/check',{email:'x@konkurencia.sk',code:codeFrom(log)}),e,'/public/verify/check')).json();
 assert.equal((await usageAdminRoute(new Request('https://w/admin/block',{method:'POST',headers:auth,body:JSON.stringify({value:'@konkurencia.sk'})}),e,'/admin/block')).status,200);
 assert.equal((await useSession(e,token,'ask')).status,403);
 assert.equal((await verifyRoute(post('/public/verify/start',{email:'y@konkurencia.sk'}),e,'/public/verify/start',{connect:smtp([])})).status,403);
 const u=await (await usageAdminRoute(new Request('https://w/admin/usage',{headers:auth}),e,'/admin/usage')).json();
 assert.equal(u.usage[0].email,'x@konkurencia.sk');assert.equal(u.usage[0].blocked,true);assert.deepEqual(u.blocks,['@konkurencia.sk']);
});
test('turnstile is enforced when configured, and code requests are rate limited',async()=>{
 const e=env({TURNSTILE_SECRET:'s'});
 const fail=async()=>Response.json({success:false});const pass=async()=>Response.json({success:true});
 assert.equal((await verifyRoute(post('/public/verify/start',{email:'a@b.sk',turnstile:'t'}),e,'/public/verify/start',{fetch:fail,connect:smtp([])})).status,400);
 for(let i=0;i<3;i++)assert.equal((await verifyRoute(post('/public/verify/start',{email:'a@b.sk',turnstile:'t'}),e,'/public/verify/start',{fetch:pass,connect:smtp([])})).status,200);
 assert.equal((await verifyRoute(post('/public/verify/start',{email:'a@b.sk',turnstile:'t'}),e,'/public/verify/start',{fetch:pass,connect:smtp([])})).status,429);
});
