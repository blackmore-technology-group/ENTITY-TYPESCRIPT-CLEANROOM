import { createHash } from "crypto";
import { readFileSync } from "fs";
const KIT="passport-conformance-kit-v341/ENTITY_V3_4_GLOBAL_PASSPORT_CLEANROOM_KIT.min.json";
const KIT_SHA="f95c2b347da97742fed3f20611f0eec2fd3df48694fed9494fb07163c537cfb7";
const EXPECTED="ac7504cce70576008cff069607619660a4b9bf0cad43b3f3de81078f1e80d9ba";
const CORE=["ENTITY","AUTHORITY","RIGHT","EVENT","VALUE"];
const sha=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
const hex64=(v:any)=>typeof v==="string"&&/^[0-9a-f]{64}$/.test(v);
const bool=(r:any,k:string,v:boolean)=>r?.[k]===v;
const stack=(r:any)=>Array.isArray(r?.profile_refs)&&r.profile_refs.length>0&&r.profile_refs.includes("entity-profile:global@1.0")&&Array.isArray(r.profile_hashes)&&r.profile_hashes.length===r.profile_refs.length&&r.profile_hashes.every(hex64)&&bool(r,"fail_closed",true)&&bool(r,"profile_composition_does_not_create_authority",true)&&bool(r,"standards_mapping_is_not_normative_equivalence",true);
function valid(r:any):boolean{switch(r?.schema){
case "entity-v3-global-passport-profile-status-v1":return JSON.stringify(r.core_primitives)===JSON.stringify(CORE)&&r.core_semantics_changed===false&&r.market_engine_preserved===true&&r.one_passport_many_profiles===true&&r.evidence_truth_boundary_preserved===true;
case "entity-v3-global-profile-v1":return typeof r.profile_ref==="string"&&r.profile_ref.length>0&&["GLOBAL","JURISDICTION","INDUSTRY","DOMAIN","PRIVACY","TRUST","DISCLOSURE"].includes(r.kind)&&hex64(r.schema_sha256)&&r.profile_is_not_authority===true&&r.standards_mapping_is_not_normative_equivalence===true&&(!String(r.profile_id||"").toUpperCase().includes("DEFENCE")||r.public_unclassified===true);
case "entity-v3-profile-stack-resolution-v1":return stack(r);
case "entity-v3-global-passport-v1":return JSON.stringify(r.core_primitives)===JSON.stringify(CORE)&&typeof r.rights_passport_id==="string"&&r.rights_passport_id.length>0&&hex64(r.rights_passport_sha256)&&stack(r.profile_stack)&&r.one_passport_many_profiles===true&&r.profile_composition_does_not_create_authority===true&&r.standards_mapping_is_not_normative_equivalence===true&&r.evidence_does_not_establish_objective_truth===true&&r.legal_effect_is_deployment_specific===true&&r.underlying_information_remains_nonrival===true&&Number.isInteger(r.economic_state?.amount_units)&&r.economic_state.amount_units>=0&&r.economic_state.market_observation_is_not_accounting_fair_value===true&&Array.isArray(r.standards_mappings)&&r.standards_mappings.every((m:any)=>m.normative_equivalence_claimed===false);
case "entity-v3-continuous-ingest-result-v1":return Number.isInteger(r.files)&&r.files>=0&&hex64(r.inventory_sha256)&&r.content_addressed===true&&r.custody_is_not_authority===true&&r.economic_value_invented===false;
default:return false}}
function canonical(v:any):string{if(Array.isArray(v))return`[${v.map(canonical).join(",")}]`;if(v&&typeof v==="object"){return`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`};return JSON.stringify(v)}
const raw=readFileSync(KIT);if(sha(raw)!==KIT_SHA)throw new Error("sealed kit SHA-256 mismatch");const kit=JSON.parse(raw.toString("utf8"));const cases=[...kit.cases].sort((a:any,b:any)=>a.id.localeCompare(b.id));let passed=0;const rows=cases.map((c:any)=>{const actual=valid(c.record)?"VALID":"INVALID";if(actual===c.expect)passed++;return{id:c.id,actual}});const result=sha(canonical(rows));const overall=passed===24&&result===EXPECTED&&kit.expected_result_sha256===EXPECTED;console.log(JSON.stringify({implementation:"typescript",kit_sha256:KIT_SHA,vectors_passed:passed,vectors_total:24,result_sha256:result,expected_result_sha256:EXPECTED,overall_valid:overall},null,2));if(!overall)process.exit(1);
