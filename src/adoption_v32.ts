import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const KIT='adoption-conformance-kit/ENTITY_V3_2_ADOPTION_CLEANROOM_KIT.min.json';
const KIT_SHA256='44e7a00f910c89aced3b3c1b5e9cba486809ca313e9bfb4b7bc9266095c10c14';
const EXPECTED_RESULT='1eb59e09ab08da86bfd8584df4a64ba331f7bbbce3d236b9b94f351606c90e18';
const PRIMITIVES=['ENTITY','AUTHORITY','RIGHT','EVENT','VALUE'];
const LIFECYCLE=['DCO','INSTRUMENT','LISTING','DISCLOSURE','ORDER_RFQ_AUCTION','PRICE_DISCOVERY','TRADE','CLEARING','SETTLEMENT','ENTITLEMENT','USAGE','DERIVED_OUTPUT','ECONOMIC_CONSEQUENCE'];
const PROVIDERS=new Set(['AWS_S3','AZURE_BLOB','GOOGLE_CLOUD_STORAGE','SNOWFLAKE','DATABRICKS','POSTGRESQL','SQL_SERVER','LOCAL_FILESYSTEM','HTTP_API']);
const STANDARDS=new Set(['ODRL','W3C_VC','DID','GAIA_X','IDS']);
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const hex64=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
const eq=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function canonical(v:any):string{if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v)}
function rules(v:any):boolean{return Array.isArray(v)&&v.length>0&&v.every((q:any)=>['ALLOW','REQUIRE','PROHIBIT'].includes(q?.effect)&&Array.isArray(q.actions)&&q.actions.length>0&&eq(q.actions,[...new Set(q.actions)].sort())&&q.actions.every((x:any)=>typeof x==='string'&&x.length>0&&x===x.toUpperCase()))}
function valid(r:any):boolean{switch(r?.schema){
case'entity-v3-rights-passport-v1':return eq(r.core_primitives,PRIMITIVES)&&rules(r.rights)&&r.provider_custody_is_not_authority===true&&r.underlying_data_not_silently_transferred===true&&r.legal_effect_is_deployment_specific===true;
case'entity-v3-custody-locator-v1':return PROVIDERS.has(r.provider)&&hex64(r.content_sha256)&&r.provider_is_authority===false&&r.credentials_included===false&&r.entity_identity_changes_with_provider===false;
case'entity-v3-standards-mapping-v1':return STANDARDS.has(r.source_standard)&&hex64(r.source_sha256)&&r.silent_semantic_equivalence===false&&r.external_standard_is_not_entity_authority===true;
case'entity-v3-external-credential-evidence-v1':return r.source_standard==='W3C_VC'&&hex64(r.credential_sha256)&&r.credential_is_evidence_not_entity_authority===true;
case'entity-v3-resolver-deployment-v1':return r.mode==='FEDERATED'&&Number.isInteger(r.minimum_resolvers)&&r.minimum_resolvers>=2&&r.resolver_is_not_authority===true&&r.single_provider_dependency_prohibited===true&&r.fail_closed===true;
case'entity-v3-exchange-adoption-profile-v1':return r.market_engine_preserved===true&&r.rights_are_traded_not_bytes===true&&eq(r.market_lifecycle,LIFECYCLE);
case'entity-v3-adoption-profile-status-v1':return eq(r.core_primitives,PRIMITIVES)&&r.core_semantics_changed===false&&r.market_engine_preserved===true;
case'entity-v3-legal-classification-assertion-v1':return typeof r.asserted_by==='string'&&r.asserted_by.length>0&&typeof r.classification==='string'&&r.classification.length>0&&r.classification_is_assertion_not_protocol_legal_truth===true;
default:return false}}
const raw=readFileSync(KIT);if(sha(raw)!==KIT_SHA256)throw new Error('sealed kit SHA-256 mismatch');const kit=JSON.parse(raw.toString('utf8'));
const rows=kit.vectors.map((v:any)=>{const accepted=valid(v.record);const ok=accepted===(v.expect==='VALID');return{name:v.name,accepted,expected:v.expect,ok}}).sort((a:any,b:any)=>a.name.localeCompare(b.name));
const passed=rows.filter((x:any)=>x.ok).length;const summary={schema:'entity-v3.2-adoption-cleanroom-result-v1',profile:'ENTITY-ADOPTION-LAYER',adoption_invariants:kit.profile.adoption_invariants,vectors:rows};const result=sha(canonical(summary));const overall=passed===16&&result===EXPECTED_RESULT;
console.log(JSON.stringify({implementation:'typescript',kit_sha256:KIT_SHA256,vectors_passed:passed,vectors_total:16,result_sha256:result,expected_result_sha256:EXPECTED_RESULT,overall_valid:overall},null,2));if(!overall)process.exit(1);
