import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const KIT='reality-conformance-kit/ENTITY_V3_3_REALITY_CLEANROOM_KIT.min.json';
const KIT_SHA='e0d6ba26baa405557bc2990e39d3022ebb8cda00ae797fab0100773cf304a6fd';
const EXPECTED='82bd1f1fb328edd37a26d8ea60ede5a599c7d9af5027bffd73b9e52843b5a51d';
const P=['ENTITY','AUTHORITY','RIGHT','EVENT','VALUE'];
const STATES=new Set(['OBSERVED','ASSERTED','INFERRED','ATTESTED','EXTERNALLY_VERIFIED','ADJUDICATED','DISPUTED','REVOKED','UNKNOWN']);
const EVIDENCE=new Set(['SENSOR_OBSERVATION','DOCUMENT','REGISTRY_RECORD','LAB_RESULT','PAYMENT_RECORD','IMAGE','API_RESPONSE','CERTIFICATE','COURT_RECORD','OTHER']);
const ANCHORS=new Set(['GOVERNMENT_REGISTRY','SENSOR_NETWORK','BANK_SETTLEMENT','LAB_SYSTEM','SUPPLY_CHAIN_SYSTEM','CORPORATE_REGISTRY','COURT_RECORD','CERTIFICATE_AUTHORITY','OTHER']);
const NODES=new Set(['SOURCE_DATA','DCO','RIGHT','LICENSE','USAGE','DERIVED_ASSET','PRODUCT','TRANSACTION','REVENUE','SETTLEMENT','CONTRIBUTOR']);
const EDGES=new Set(['ORIGINATED_FROM','AUTHORIZED_BY','LICENSED_AS','USED_IN','DERIVED_FROM','PRODUCED','GENERATED','SETTLED_AS','CONTRIBUTED_TO']);
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const hex64=(v:any)=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
const refs=(v:any,nonempty=false)=>Array.isArray(v)&&(!nonempty||v.length>0)&&v.every((x:any)=>typeof x==='string'&&x.length>0)&&JSON.stringify(v)===JSON.stringify([...new Set(v)].sort());
const eq=(a:any,b:any)=>JSON.stringify(a)===JSON.stringify(b);
function canonical(v:any):string{if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v)}
function valid(r:any):boolean{switch(r?.schema){
case'entity-v3-evidence-object-v1':return EVIDENCE.has(r.evidence_type)&&hex64(r.content_sha256)&&r.signature_proves_attribution_not_objective_truth===true&&r.immutable_evidence_record===true;
case'entity-v3-evidence-bound-claim-v1':return STATES.has(r.state)&&hex64(r.value_sha256)&&refs(r.evidence_refs??[])&&r.claim_is_not_objective_truth===true&&r.state_is_typed_not_absolute===true;
case'entity-v3-claim-status-transition-v1':return STATES.has(r.from_state)&&STATES.has(r.to_state)&&r.from_state!==r.to_state&&refs(r.evidence_refs??[])&&r.history_rewrite_prohibited===true&&r.transition_does_not_establish_objective_truth===true;
case'entity-v3-attestation-authority-grant-v1':return refs(r.scopes,true)&&hex64(r.authority_evidence_sha256)&&r.attestation_authority_is_scope_limited===true&&r.attestation_does_not_create_legal_truth===true;
case'entity-v3-attestation-v1':return !!r.grant_id&&!!r.scope&&refs(r.evidence_refs,true)&&r.attestation_is_evidence_not_objective_truth===true;
case'entity-v3-external-reality-anchor-v1':return ANCHORS.has(r.anchor_type)&&hex64(r.endpoint_descriptor_sha256)&&r.credentials_included===false&&r.external_system_is_not_automatic_entity_authority===true;
case'entity-v3-external-reality-snapshot-v1':return hex64(r.record_sha256)&&refs(r.verifier_evidence_refs??[])&&r.external_record_is_evidence_not_protocol_truth===true&&r.record_may_be_contested_or_superseded===true;
case'entity-v3-causal-economic-node-v1':{const o=r.economic_observation??{};return NODES.has(r.node_type)&&refs(r.evidence_refs??[])&&refs(r.event_refs??[])&&(Object.keys(o).length===0||(o.market_observation_is_not_accounting_fair_value===true&&o.protocol_does_not_determine_legal_entitlement===true));}
case'entity-v3-causal-economic-edge-v1':return EDGES.has(r.edge_type)&&r.from_node_id!==r.to_node_id&&refs(r.evidence_refs,true)&&refs(r.authority_refs??[])&&refs(r.participation_rule_refs??[])&&r.causality_is_evidence_bound_not_assumed===true&&r.economic_attribution_is_not_accounting_fair_value===true;
case'entity-v3-verifiable-reality-status-v1':return eq(r.core_primitives,P)&&r.core_semantics_changed===false&&r.market_engine_preserved===true&&r.reality_claims_are_evidence_bound===true&&r.cryptographic_verification_is_not_objective_truth===true&&r.protocol_verification_is_not_objective_truth===true;
default:return false}}
const raw=readFileSync(KIT);if(sha(raw)!==KIT_SHA)throw new Error('sealed v3.3 kit SHA-256 mismatch');const kit=JSON.parse(raw.toString('utf8'));
const rows=kit.cases.map((c:any)=>{const actual=valid(c.record)?'VALID':'INVALID';return{id:c.id,actual,ok:actual===c.expect}}).sort((a:any,b:any)=>a.id.localeCompare(b.id));
const passed=rows.filter((x:any)=>x.ok).length;const transcript=rows.map(({id,actual}:any)=>({id,actual}));const result=sha(canonical(transcript));const overall=passed===20&&result===EXPECTED&&kit.expected_result_sha256===EXPECTED;
console.log(JSON.stringify({implementation:'typescript',kit_sha256:KIT_SHA,vectors_passed:passed,vectors_total:20,result_sha256:result,expected_result_sha256:EXPECTED,overall_valid:overall},null,2));if(!overall)process.exit(1);
