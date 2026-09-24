import { readFileSync } from 'node:fs';
import { loadJson, verifyBundle, verifyRecovery, resultHash } from './verifier.js';
import { runGlobalCampaign } from './global.js';
const kit=new URL('../conformance-kit/',import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/,m=>m.slice(1));
const manifest=loadJson(kit+'vectors/VECTOR_MANIFEST.json');
let pass=0; const results:any[]=[];
for(const v of manifest.vectors){
  const r=verifyBundle(loadJson(kit+'vectors/'+v.file));
  const ok=r.overall_valid===v.expected.overall_valid && JSON.stringify(r.error_codes)===JSON.stringify(v.expected.error_codes);
  results.push({name:v.name,ok,result_sha256:resultHash(r),...r}); if(ok)pass++;
}
const recovery=verifyRecovery(kit+'vectors/recovery',kit+'vectors/test_inputs/recovery_key.hex');
if(!recovery.overall_valid) throw new Error('recovery failed '+JSON.stringify(recovery));
if(pass!==manifest.vectors.length) throw new Error('vector failures '+JSON.stringify(results.filter(x=>!x.ok)));
const global=runGlobalCampaign();
if(!global.overall_valid) throw new Error('global v3.1 campaign failed '+JSON.stringify(global));
console.log(JSON.stringify({implementation:'typescript',vectors_passed:pass,vectors_total:manifest.vectors.length,recovery_pass:true,golden_root:manifest.valid_transaction_root_sha256,results,recovery,global_v3_1:global},null,2));
