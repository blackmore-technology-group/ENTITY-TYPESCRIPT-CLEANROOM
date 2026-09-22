import { loadJson, verifyBundle, resultHash } from './verifier.js';
const file=process.argv[2];
if(!file){console.error('usage: entity-verify <bundle.json>');process.exit(2);}
const r=verifyBundle(loadJson(file));
console.log(JSON.stringify({...r,result_sha256:resultHash(r)}));
process.exit(r.overall_valid?0:1);
