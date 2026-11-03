import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { suggestRoute, conditionsRoute, askRoute } from '../cloudflare/worker.mjs';
import { ReviewStore } from '../cloudflare/reviews.mjs';
function memoryStorage(){const map=new Map();const api={async get(k){return structuredClone(map.get(k));},async put(k,v){map.set(k,structuredClone(v));},async delete(k){map.delete(k);},async list({prefix}){return new Map([...map].filter(([k])=>k.startsWith(prefix)).map(([k,v])=>[k,structuredClone(v)]));},async transaction(fn){return fn(api);}};return api;}
const TOK=i=>String(i).padStart(64,'a');
function env(){const storage=memoryStorage();for(let i=0;i<3;i++)storage.put('sess:'+createHash('sha256').update(TOK(i)).digest('hex'),{email:`u${i}@example.sk`,expires:Date.now()+3600000});const s=new ReviewStore({storage});return{ANTHROPIC_API_KEY:'k',ANTHROPIC_MODEL:'m',REVIEWS_ADMIN_TOKEN:'a'.repeat(40),REVIEWS:{idFromName:()=>'x',get:()=>({fetch:(_,init)=>s.fetch(new Request('https://i',init))})}};}
const meta={insurer:'Allianz',type:'majetok',title:'VPP M',code:'VPP M 2023',validFrom:'2023-01-01'};
const fake=calls=>async(url,init)=>{calls.push(url.split('/').pop()+':'+init.method);if(init.method==='DELETE')return new Response('{}');if(url.endsWith('/messages'))return Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(meta)}]});return Response.json({id:'file_'+calls.length});};
function pdf(tag){const b=new Uint8Array(400);b.set(new TextEncoder().encode('%PDF-1.4 '+tag));return b;}
function req(session,bytes,consent='true'){const f=new FormData();f.append('session',session);f.append('consent',consent);f.append('file',new File([bytes],'x.pdf',{type:'application/pdf'}));return new Request('https://w/public/conditions/suggest',{method:'POST',headers:{Origin:'https://poistkapodlupou.sk'},body:f});}
const admin={Authorization:'Bearer '+'a'.repeat(40)};
test('suggestion is stored as pending, hidden publicly, approvable',async()=>{
 const e=env();const calls=[];
 const r=await suggestRoute(req(TOK(0),pdf('a')),e,fake(calls));assert.equal(r.status,201);assert.equal((await r.json()).result,'pending');
 assert.equal((await (await conditionsRoute(new Request('https://w/conditions'),e,'/conditions')).json()).length,0);
 const all=await (await conditionsRoute(new Request('https://w/admin/conditions',{headers:admin}),e,'/admin/conditions')).json();
 assert.equal(all[0].status,'pending');assert.equal(all[0].suggestedBy,'u0@example.sk');
 const ap=await conditionsRoute(new Request('https://w/admin/conditions/approve',{method:'POST',headers:admin,body:JSON.stringify({id:all[0].id})}),e,'/admin/conditions/approve');
 assert.equal(ap.status,200);const ok=await ap.json();assert.equal(ok.status,'approved');assert.equal(ok.suggestedBy,undefined);
 assert.equal((await (await conditionsRoute(new Request('https://w/conditions'),e,'/conditions')).json()).length,1);
});
test('consent required, one per e-mail per day, duplicates skipped without using quota',async()=>{
 const e=env();const calls=[];
 assert.equal((await suggestRoute(req(TOK(0),pdf('a'),'false'),e,fake(calls))).status,400);
 assert.equal((await suggestRoute(req(TOK(0),pdf('a')),e,fake(calls))).status,201);
 assert.equal((await (await suggestRoute(req(TOK(1),pdf('a')),e,fake(calls))).json()).result,'duplicate');
 assert.equal((await suggestRoute(req(TOK(0),pdf('b')),e,fake(calls))).status,429);
 const d=await (await suggestRoute(req(TOK(1),pdf('c')),e,fake(calls))).json();assert.equal(d.result,'duplicate','same document identity');
 assert.ok(calls.at(-1).endsWith(':DELETE'));
 assert.equal((await suggestRoute(req('b'.repeat(64),pdf('d')),e,fake(calls))).status,401);
});
