import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyRoute, claimRoute, compareRoute, validateClaim, validateCompare } from '../cloudflare/worker.mjs';
import { ReviewStore } from '../cloudflare/reviews.mjs';
function memoryStorage(){const map=new Map();const api={async get(k){return structuredClone(map.get(k));},async put(k,v){map.set(k,structuredClone(v));},async delete(k){map.delete(k);},async list({prefix}){return new Map([...map].filter(([k])=>k.startsWith(prefix)).map(([k,v])=>[k,structuredClone(v)]));},async transaction(fn){return fn(api);}};return api;}
function env(extra={}){const s=new ReviewStore({storage:memoryStorage()});return{SMTP_HOST:'h',SMTP_USER:'ahoj@poistkapodlupou.sk',SMTP_PASS:'p',REVIEWS_ADMIN_TOKEN:'a'.repeat(40),REVIEWS:{idFromName:()=>'x',get:()=>({fetch:(_,init)=>s.fetch(new Request('https://i',init))})},...extra};}
function smtp(log){return()=>{const responses=['220 hi','250-mx\r\n250 AUTH PLAIN LOGIN','235 ok','250 ok','250 ok','354 go','250 queued','221 bye'];let n=0;return{writable:new WritableStream({write(c){log.push(new TextDecoder().decode(c));}}),readable:{getReader:()=>({read:async()=>n>=responses.length?{done:true}:{value:new TextEncoder().encode(responses[n++]+'\r\n'),done:false}})},close:async()=>{}};};}
const post=(path,body)=>new Request('https://w'+path,{method:'POST',headers:{Origin:'https://poistkapodlupou.sk'},body:JSON.stringify(body)});
const codeFrom=log=>{const all=log.join('');const subj=all.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/);return Buffer.from(subj[1],'base64').toString().match(/(\d{6})/)[1];};
async function session(e){const log=[];await verifyRoute(post('/public/verify/start',{email:'jan@example.sk'}),e,'/public/verify/start',{connect:smtp(log)});const r=await verifyRoute(post('/public/verify/check',{email:'jan@example.sk',code:codeFrom(log)}),e,'/public/verify/check');return (await r.json()).token;}
const ai=out=>{const calls=[];const f=async(url,init)=>{calls.push(JSON.parse(init.body));return Response.json({stop_reason:'end_turn',usage:{input_tokens:2000,output_tokens:500},content:[{type:'text',text:JSON.stringify(out)}]});};f.calls=calls;return f;};
const fields=[{label:'Limit',value:'5 000 000 €',page:1},{label:'Poistné',value:'120 € ročne',page:1}];
test('claim helper needs verified e-mail, returns structured steps and never promises a payout field',async()=>{
 const e={...env(),ANTHROPIC_API_KEY:'k',ANTHROPIC_MODEL:'m'};
 const body={type:'majetok',insurer:'Allianz',event:'Vytopenie od suseda',description:'Sused nás vytopil, mokrý strop v kúpeľni.',fields,consent:true};
 assert.equal((await claimRoute(post('/public/claim',body),e,ai({}))).status,401);
 const token=await session(e);
 const f=ai({assessment:'pravdepodobne_kryte',assessmentText:'Vytopenie je v zmluve kryté (str. 1).',limits:['Limit 5 000 000 €'],deadline:'Bez zbytočného odkladu.',steps:['Odfoťte škodu','Nahláste poisťovni'],documents:['Fotky'],watch:['Neopravujte pred obhliadkou'],report:'Dňa [dátum] ...',sources:['zmluva str. 1'],handoff:false});
 const r=await claimRoute(post('/public/claim',{...body,session:token}),e,f);
 assert.equal(r.status,200);const d=await r.json();
 assert.equal(d.assessment,'pravdepodobne_kryte');assert.equal(d.steps.length,2);assert.equal(d.withContract,true);
 assert.match(f.calls[0].messages[0].content.at(-1).text,/Sused nás vytopil/);
 assert.throws(()=>validateClaim({...body,consent:false}));assert.throws(()=>validateClaim({...body,description:'krátke'}));
});
test('comparison works from extracted fields only and validates both sides',async()=>{
 const e={...env(),ANTHROPIC_API_KEY:'k',ANTHROPIC_MODEL:'m'};const token=await session(e);
 const f=ai({summary:'Ponuka má vyšší limit.',rows:[{topic:'Limit',current:'5 mil. €',offer:'10 mil. €',difference:'vyssie_v_ponuke'},{topic:'X',current:'a',offer:'b',difference:'zle'}],gains:['vyšší limit'],losses:[],check:['výpovedná lehota'],handoff:false});
 const r=await compareRoute(post('/public/compare',{type:'pzp',current:{insurer:'Allianz',fields},offer:{insurer:'Generali',fields},consent:true,session:token}),e,f);
 assert.equal(r.status,200);const d=await r.json();
 assert.equal(d.rows[0].difference,'vyssie_v_ponuke');assert.equal(d.rows[1].difference,'nejasne');assert.equal(d.handoff,true);
 assert.equal(f.calls[0].messages[0].content.length,1);assert.equal(f.calls[0].messages[0].content[0].type,'text');
 assert.throws(()=>validateCompare({type:'pzp',current:{fields:[]},offer:{fields},consent:true}));
});
