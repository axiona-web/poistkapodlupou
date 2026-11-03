import test from 'node:test';
import assert from 'node:assert/strict';
import { conditionsRoute } from '../cloudflare/worker.mjs';
import { ReviewStore } from '../cloudflare/reviews.mjs';
function memoryStorage(){const map=new Map();const api={async get(k){return structuredClone(map.get(k));},async put(k,v){map.set(k,structuredClone(v));},async delete(k){map.delete(k);},async list({prefix}){return new Map([...map].filter(([k])=>k.startsWith(prefix)));},async transaction(fn){return fn(api);}};return api;}
const env=()=>{const s=new ReviewStore({storage:memoryStorage()});return{ANTHROPIC_API_KEY:'k',ANTHROPIC_MODEL:'m',REVIEWS_ADMIN_TOKEN:'a'.repeat(40),REVIEWS:{idFromName:()=>'x',get:()=>({fetch:(_,init)=>s.fetch(new Request('https://i',init))})}};};
const auth={Authorization:'Bearer '+'a'.repeat(40)};
const pdf=new Uint8Array(500);pdf.set(new TextEncoder().encode('%PDF-1.7'));
function form(over={}){const f=new FormData();f.append('insurer','Allianz');f.append('type','pzp');f.append('title','VPP PZP');f.append('code','01/2022');f.append('validFrom','2022-01-01');f.append('file',new File([over.bytes||pdf],'x.pdf',{type:'application/pdf'}));for(const[k,v]of Object.entries(over))if(k!=='bytes')f.set(k,v);return f;}
const req=(path,init={})=>new Request('https://w'+path,init);
test('upload requires admin token',async()=>{assert.equal((await conditionsRoute(req('/admin/conditions',{method:'POST',body:form()}),env(),'/admin/conditions')).status,401);});
test('upload stores file id, public list hides it, delete removes',async()=>{
 const e=env();const calls=[];const fake=async(url,init)=>{calls.push([url,init.method]);if(init.method==='DELETE')return new Response('{}');if(url.endsWith('/messages'))return Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({insurer:'Allianz',type:'pzp',title:'Všeobecné poistné podmienky PZP',code:'VPP PZP 01/2022',validFrom:'2022-01-01'})}]});return Response.json({id:'file_123'});};
 const r=await conditionsRoute(req('/admin/conditions',{method:'POST',headers:auth,body:form()}),e,'/admin/conditions',fake);
 assert.equal(r.status,201);const entry=await r.json();assert.equal(entry.fileId,'file_123');assert.equal(entry.code,'VPP PZP 01/2022');assert.equal(entry.detected,true);
 const pub=await (await conditionsRoute(req('/conditions?insurer=Allianz&type=pzp'),e,'/conditions')).json();
 assert.equal(pub.length,1);assert.equal(pub[0].fileId,undefined);
 assert.equal((await conditionsRoute(req('/admin/conditions/delete',{method:'POST',headers:auth,body:JSON.stringify({id:entry.id})}),e,'/admin/conditions/delete',fake)).status,200);
 assert.deepEqual(calls.map(c=>c[1]),['POST','POST','DELETE']);
 assert.equal((await (await conditionsRoute(req('/conditions'),e,'/conditions')).json()).length,0);
});
test('rejects non-PDF; failed detection deletes the uploaded file',async()=>{
 const calls=[];const fake=async(url,init)=>{calls.push(init.method);if(url.endsWith('/messages'))return Response.json({stop_reason:'max_tokens',content:[]});return Response.json({id:'f'});};
 assert.equal((await conditionsRoute(req('/admin/conditions',{method:'POST',headers:auth,body:form({bytes:new Uint8Array(500)})}),env(),'/admin/conditions',fake)).status,400);
 assert.equal((await conditionsRoute(req('/admin/conditions',{method:'POST',headers:auth,body:form()}),env(),'/admin/conditions',fake)).status,502);
 assert.deepEqual(calls,['POST','POST','DELETE']);
});

test('same file twice is rejected before upload; same document under another file is rejected after detection',async()=>{
 const e=env();const calls=[];const meta={insurer:'Allianz',type:'pzp',title:'VPP PZP',code:'01/2022',validFrom:'2022-01-01'};
 const fake=async(url,init)=>{calls.push(url.split('/').pop()+':'+init.method);if(init.method==='DELETE')return new Response('{}');if(url.endsWith('/messages'))return Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(meta)}]});return Response.json({id:'file_'+calls.length});};
 assert.equal((await conditionsRoute(req('/admin/conditions',{method:'POST',headers:auth,body:form()}),e,'/admin/conditions',fake)).status,201);
 const n=calls.length;
 const dup=await conditionsRoute(req('/admin/conditions',{method:'POST',headers:auth,body:form()}),e,'/admin/conditions',fake);
 assert.equal(dup.status,409);assert.equal((await dup.json()).reason,'same_file');assert.equal(calls.length,n);
 const other=new Uint8Array(600);other.set(new TextEncoder().encode('%PDF-1.4 other'));
 const dup2=await conditionsRoute(req('/admin/conditions',{method:'POST',headers:auth,body:form({bytes:other})}),e,'/admin/conditions',fake);
 assert.equal(dup2.status,409);assert.equal((await dup2.json()).reason,'same_document');assert.ok(calls.at(-1).endsWith(':DELETE'));
 assert.equal((await (await conditionsRoute(req('/conditions'),e,'/conditions')).json()).length,1);
});
test('detection reads only the preview pages when the browser sends them',async()=>{
 const e=env();let body;const fake=async(url,init)=>{if(url.endsWith('/messages')){body=JSON.parse(init.body);return Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({insurer:'Allianz',type:'pzp',title:'VPP PZP',code:'X1',validFrom:''})}]});}return Response.json({id:'file_9'});};
 const f=form();const pv=new Uint8Array(300);pv.set(new TextEncoder().encode('%PDF-1.7 preview'));f.append('preview',new File([pv],'nahlad.pdf',{type:'application/pdf'}));
 const r=await conditionsRoute(req('/admin/conditions',{method:'POST',headers:auth,body:f}),e,'/admin/conditions',fake);
 assert.equal(r.status,201);assert.equal((await r.json()).fileId,'file_9');
 const src=body.messages[0].content[0].source;assert.equal(src.type,'base64');assert.ok(Buffer.from(src.data,'base64').toString().startsWith('%PDF-1.7 preview'));
});
