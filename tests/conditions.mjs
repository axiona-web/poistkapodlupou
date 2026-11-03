import test from 'node:test';
import assert from 'node:assert/strict';
import { conditionsRoute } from '../cloudflare/worker.mjs';
import { ReviewStore } from '../cloudflare/reviews.mjs';
function memoryStorage(){const map=new Map();const api={async get(k){return structuredClone(map.get(k));},async put(k,v){map.set(k,structuredClone(v));},async delete(k){map.delete(k);},async list({prefix}){return new Map([...map].filter(([k])=>k.startsWith(prefix)));},async transaction(fn){return fn(api);}};return api;}
const env=()=>{const s=new ReviewStore({storage:memoryStorage()});return{ANTHROPIC_API_KEY:'k',REVIEWS_ADMIN_TOKEN:'a'.repeat(40),REVIEWS:{idFromName:()=>'x',get:()=>({fetch:(_,init)=>s.fetch(new Request('https://i',init))})}};};
const auth={Authorization:'Bearer '+'a'.repeat(40)};
const pdf=new Uint8Array(500);pdf.set(new TextEncoder().encode('%PDF-1.7'));
function form(over={}){const f=new FormData();f.append('insurer','Allianz');f.append('type','pzp');f.append('title','VPP PZP');f.append('code','01/2022');f.append('validFrom','2022-01-01');f.append('file',new File([over.bytes||pdf],'x.pdf',{type:'application/pdf'}));for(const[k,v]of Object.entries(over))if(k!=='bytes')f.set(k,v);return f;}
const req=(path,init={})=>new Request('https://w'+path,init);
test('upload requires admin token',async()=>{assert.equal((await conditionsRoute(req('/admin/conditions',{method:'POST',body:form()}),env(),'/admin/conditions')).status,401);});
test('upload stores file id, public list hides it, delete removes',async()=>{
 const e=env();const calls=[];const fake=async(url,init)=>{calls.push([url,init.method]);return init.method==='DELETE'?new Response('{}'):Response.json({id:'file_123'});};
 const r=await conditionsRoute(req('/admin/conditions',{method:'POST',headers:auth,body:form()}),e,'/admin/conditions',fake);
 assert.equal(r.status,201);const entry=await r.json();assert.equal(entry.fileId,'file_123');
 const pub=await (await conditionsRoute(req('/conditions?insurer=Allianz&type=pzp'),e,'/conditions')).json();
 assert.equal(pub.length,1);assert.equal(pub[0].fileId,undefined);
 assert.equal((await conditionsRoute(req('/admin/conditions/delete',{method:'POST',headers:auth,body:JSON.stringify({id:entry.id})}),e,'/admin/conditions/delete',fake)).status,200);
 assert.deepEqual(calls.map(c=>c[1]),['POST','DELETE']);
 assert.equal((await (await conditionsRoute(req('/conditions'),e,'/conditions')).json()).length,0);
});
test('rejects non-PDF and bad meta',async()=>{
 const fake=async()=>Response.json({id:'f'});
 assert.equal((await conditionsRoute(req('/admin/conditions',{method:'POST',headers:auth,body:form({bytes:new Uint8Array(500)})}),env(),'/admin/conditions',fake)).status,400);
 assert.equal((await conditionsRoute(req('/admin/conditions',{method:'POST',headers:auth,body:form({insurer:'Iná'})}),env(),'/admin/conditions',fake)).status,400);
});
