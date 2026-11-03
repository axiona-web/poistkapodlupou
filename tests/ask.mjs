import test from 'node:test';
import assert from 'node:assert/strict';
import { askRoute, validateAsk } from '../cloudflare/worker.mjs';
import { ReviewStore } from '../cloudflare/reviews.mjs';
function memoryStorage(){const map=new Map();const api={async get(k){return structuredClone(map.get(k));},async put(k,v){map.set(k,structuredClone(v));},async delete(k){map.delete(k);},async list({prefix}){return new Map([...map].filter(([k])=>k.startsWith(prefix)));},async transaction(fn){return fn(api);}};return api;}
function env(){const storage=memoryStorage();storage.put('cond:11111111-1111-1111-1111-111111111111',{id:'11111111-1111-1111-1111-111111111111',fileId:'file_abc',title:'VPP PZP',code:'13'});const s=new ReviewStore({storage});return{ANTHROPIC_API_KEY:'k',ANTHROPIC_MODEL:'m',REVIEWS_ADMIN_TOKEN:'a'.repeat(40),REVIEWS:{idFromName:()=>'x',get:()=>({fetch:(_,init)=>s.fetch(new Request('https://i',init))})}};}
const body={type:'pzp',insurer:'Generali',question:'Aký mám limit na zdravie?',fields:[{label:'Limit zdravie',value:'6 450 000 EUR',page:1}],history:[],conditionsId:'11111111-1111-1111-1111-111111111111',consent:true};
const req=b=>new Request('https://w/public/ask',{method:'POST',headers:{Origin:'https://poistkapodlupou.sk','Content-Type':'application/json'},body:JSON.stringify(b)});
test('validation requires consent and sane input',()=>{assert.throws(()=>validateAsk({...body,consent:false}));assert.throws(()=>validateAsk({...body,question:'x'.repeat(501)}));assert.throws(()=>validateAsk({...body,conditionsId:'../x'}));});
test('sends conditions as cached file document and returns answer',async()=>{
 let sent;const fake=async(url,init)=>{sent=JSON.parse(init.body);return Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({answer:'6 450 000 EUR (zmluva, str. 1).',sources:['zmluva str. 1'],handoff:false})}]});};
 const r=await askRoute(req(body),env(),fake);assert.equal(r.status,200);const d=await r.json();
 assert.match(d.answer,/6 450 000/);assert.equal(d.withConditions,true);
 const doc=sent.messages[0].content[0];assert.equal(doc.source.file_id,'file_abc');assert.deepEqual(doc.cache_control,{type:'ephemeral'});
 assert.equal(sent.messages.at(-1).content,body.question);
});
test('works without conditions and enforces daily limit',async()=>{
 const e=env();const fake=async()=>Response.json({stop_reason:'end_turn',content:[{type:'text',text:'{"answer":"Bez podmienok neviem.","sources":[],"handoff":false}'}]});
 for(let i=0;i<20;i++)assert.equal((await askRoute(req({...body,conditionsId:''}),e,fake)).status,200);
 assert.equal((await askRoute(req({...body,conditionsId:''}),e,fake)).status,429);
});
test('foreign origin rejected',async()=>{assert.equal((await askRoute(new Request('https://w/public/ask',{method:'POST',headers:{Origin:'https://evil.test'},body:'{}'}),env())).status,403);});
