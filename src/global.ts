import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, sha256, type J } from './verifier.js';

const KIT = fileURLToPath(new URL('../global-conformance-kit/', import.meta.url));
const kinds = new Set(['SCHEMA','RIGHT','EVENT','CAPABILITY','ASSET_CLASS','TRUST_FRAMEWORK','DISPUTE_AUTHORITY','ATTESTATION_CLASS']);
const topology = new Set(['CORE','REGIONAL','EDGE','SATELLITE','OFFLINE']);
const scarcity = new Set(['RIGHT','ENTITLEMENT','CAPACITY','DURATION','JURISDICTION','USAGE_QUANTITY','DERIVATION','PARTICIPATION','TRANSFERABILITY']);

function load(path:string): any { return JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')); }
function arr(x:any): any[] { return Array.isArray(x) ? x : []; }
function hex64(x:any): boolean { return typeof x==='string' && /^[0-9a-f]{64}$/.test(x); }
function sortedUnique(a:any[]): boolean {
  const s=a.map(String); return JSON.stringify(s)===JSON.stringify([...new Set(s)].sort());
}

function verifyChecksums(): boolean {
  for(const line of readFileSync(join(KIT,'SHA256SUMS.txt'),'utf8').replace(/^\uFEFF/,'').split(/\r?\n/)){
    if(!line.trim()) continue;
    const i=line.indexOf('  '); if(i<0) return false;
    const expected=line.slice(0,i), rel=line.slice(i+2);
    if(sha256(readFileSync(join(KIT,rel)))!==expected) return false;
  }
  return true;
}

function validRecord(r:any): boolean {
  switch(r?.schema){
    case 'entity-v3-jurisdiction-profile-v1':
      return r.legal_effect_is_deployment_specific===true && arr(r.rules).every((x:any)=>['ALLOW','REQUIRE','PROHIBIT'].includes(x?.effect)&&arr(x?.actions).length>0);
    case 'entity-v3-semantic-term-v1':
      return kinds.has(r.kind) && hex64(r.definition_sha256) && r.status==='ACTIVE';
    case 'entity-v3-topology-node-v1':
      return topology.has(r.topology_class) && r.infrastructure_membership_is_not_sovereign_authority===true;
    case 'entity-v3-purpose-bound-access-v1':
      return arr(r.purposes).length>0 && arr(r.actions).length>0 && Number.isInteger(r.max_uses) && r.max_uses>=0;
    case 'entity-v3-offline-envelope-v1':
      return hex64(r.payload_sha256) && Number.isInteger(r.sequence) && r.expires_at_ms>r.created_at_ms;
    case 'entity-v3-crypto-transition-v1':
      return r.downgrade_after_transition_prohibited===true && r.old_retire_at_ms>=r.dual_sign_from_ms;
    case 'entity-v3-data-economic-capital-v1':
      return r.information_bytes_are_not_declared_scarce===true && hex64(r.provenance_root) && hex64(r.content_sha256);
    case 'entity-v3-bounded-economic-interest-v1': {
      const a=arr(r.actions), s=arr(r.scarcity_sources);
      return a.length>0 && sortedUnique(a) && s.includes('RIGHT') && s.every((x:any)=>scarcity.has(String(x))) &&
        r.underlying_information_remains_nonrival===true && Number.isInteger(r.participation_bps) && r.participation_bps>=0 && r.participation_bps<=10000;
    }
    default: return false;
  }
}

export function runGlobalCampaign(){
  const checksums=verifyChecksums();
  const profile=load(join(KIT,'ENTITY_GLOBAL_CLEANROOM_PROFILE.json'));
  const manifest=load(join(KIT,'vectors','VECTOR_MANIFEST.json'));
  const rows:any[]=[];
  for(const e of manifest.vectors){
    const p=load(join(KIT,'vectors',e.file));
    const accepted=validRecord(p.record);
    const expected=String(p.expect);
    rows.push({name:String(e.file).replace(/\.json$/,''),accepted,expected,ok:accepted===(expected==='VALID')});
  }
  rows.sort((a,b)=>a.name.localeCompare(b.name));
  const summary:J={schema:'entity-v3.1-global-cleanroom-result-v1',profile:'ENTITY-GLOBAL-INFRASTRUCTURE',
    doctrine_invariants:profile.doctrine_invariants,vectors:rows as any};
  const result_sha256=sha256(canonical(summary));
  const allOk=checksums && rows.every(x=>x.ok) && result_sha256===profile.expected_result_sha256 &&
    rows.filter(x=>x.accepted).length===profile.valid_vectors && rows.filter(x=>!x.accepted).length===profile.invalid_vectors;
  return {implementation:'typescript',checksums_pass:checksums,vectors_passed:rows.filter(x=>x.ok).length,
    vectors_total:rows.length,result_sha256,expected_result_sha256:profile.expected_result_sha256,
    doctrine_invariants:profile.doctrine_invariants,overall_valid:allOk,results:rows};
}
