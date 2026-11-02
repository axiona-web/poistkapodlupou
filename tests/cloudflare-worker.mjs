import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{validateResult} from '../cloudflare/worker.mjs';
const req=(path,options={})=>new Request('https://example.test'+path,options);
test('health has no secrets and is not an enabled public upload',async()=>{assert.equal((await (await worker.fetch(req('/health'),{})).json()).public_uploads,false)});
test('fails closed before credentials exist',async()=>assert.equal((await worker.fetch(req('/extract',{method:'POST'}),{})).status,503));
test('rejects foreign origin',async()=>assert.equal((await worker.fetch(req('/extract',{method:'POST',headers:{Origin:'https://bad.test'}}),{})).status,403));
test('requires pilot authorization',async()=>assert.equal((await worker.fetch(req('/extract',{method:'POST'}),{ANTHROPIC_API_KEY:'fake',ANTHROPIC_MODEL:'test',TEST_ACCESS_TOKEN:'x'.repeat(32)})).status,401));
test('rejects incomplete or unsupported results',()=>{assert.throws(()=>validateResult({stop_reason:'max_tokens'}));assert.throws(()=>validateResult({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({fields:[{label:'x',value:'1',page:0,evidence:'x'}],missing:[]})}]}))});
test('extracted values always need human confirmation',()=>{assert.equal(validateResult({stop_reason:'end_turn',content:[{type:'text',text:'{"fields":[],"missing":["Nečitateľná strana"]}'}]}).requires_confirmation,true)});

test('sends a sample to the fixed Anthropic endpoint using Workers-compatible redirect handling', async t => {
 const token = 't'.repeat(48);
 const upstream = t.mock.method(globalThis, 'fetch', async (url, options) => {
  assert.equal(url, 'https://api.anthropic.com/v1/messages');
  assert.equal(options.redirect, 'manual');
  return Response.json({stop_reason:'end_turn',content:[{type:'text',text:'{"fields":[],"missing":["Limit"]}'}]});
 });
 const response = await worker.fetch(req('/extract', {
  method:'POST', headers:{'Content-Type':'application/json', Authorization:'Bearer '+token},
  body:JSON.stringify({type:'majetok', mime:'application/pdf', data:btoa('%PDF-1.4\nTest document')})
 }), {ANTHROPIC_API_KEY:'test', ANTHROPIC_MODEL:'test', TEST_ACCESS_TOKEN:token});
 assert.equal(response.status, 200);
 assert.equal(upstream.mock.callCount(), 1);
 assert.equal((await response.json()).requires_confirmation, true);
});
