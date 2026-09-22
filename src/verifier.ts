import { createHash, createPublicKey, verify as cryptoVerify, createDecipheriv } from 'node:crypto';
import { readFileSync } from 'node:fs';

export type J = null | boolean | number | string | J[] | { [k: string]: J };
export type Result = {
  schema: string; transaction_id: string; transaction_root_sha256: string;
  root_valid: boolean; signature_valid: boolean; required_sections_valid: boolean;
  cross_links_valid: boolean; ledger_valid: boolean; overall_valid: boolean; error_codes: string[];
};

export function canonical(x: J): string {
  if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']';
  if (x !== null && typeof x === 'object') {
    const o = x as Record<string, J>;
    return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
  }
  return JSON.stringify(x);
}
export const sha256 = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const req = ['transaction_record','manifests','asset_provenance','rights','licence','usage_receipt','license_settlement','value_record','digital_commodity','corporate_authorization','capital','share_settlement','event_ledger','external_trust_anchors'];
const eq = (a: unknown,b: unknown) => a === b;
function asObj(x: J | undefined): Record<string, any> { return (x && typeof x === 'object' && !Array.isArray(x)) ? x as any : {}; }
function add(errors: string[], code: string) { if (!errors.includes(code)) errors.push(code); }

function verifySignature(bundle: any): boolean {
  try {
    const sig = bundle.signature || {};
    if (sig.alg !== 'Ed25519') return false;
    const der = Buffer.from(sig.public_key_spki_der_b64, 'base64');
    const key = createPublicKey({key: der, format:'der', type:'spki'});
    const header: J = {schema:bundle.schema,transaction_id:bundle.transaction_id,issuer_entity_id:bundle.issuer_entity_id,transaction_root_sha256:bundle.transaction_root_sha256};
    return cryptoVerify(null, Buffer.from(canonical(header)), key, Buffer.from(sig.sig_b64,'base64'));
  } catch { return false; }
}

function verifyLedger(ledger: any, errors: string[]): boolean {
  const events = Array.isArray(ledger?.events) ? ledger.events : [];
  let prev = '0'.repeat(64);
  for (let i=0;i<events.length;i++) {
    const e=events[i];
    if (e.sequence !== i+1) { add(errors,'LEDGER_SEQUENCE_INVALID'); return false; }
    if (e.prev_hash !== prev) { add(errors,'LEDGER_PREV_HASH_INVALID'); return false; }
    const expected=sha256(prev+':'+canonical(e.payload as J));
    if (e.event_hash !== expected) { add(errors,'LEDGER_EVENT_HASH_INVALID'); return false; }
    prev=e.event_hash;
  }
  if (ledger?.checkpoint?.sequence !== events.length || ledger?.checkpoint?.head_hash !== prev) { add(errors,'LEDGER_CHECKPOINT_INVALID'); return false; }
  return true;
}
export function verifyBundle(bundle: any): Result {
  const errors: string[]=[]; const ev=asObj(bundle.evidence);
  const root=sha256(canonical(ev as J));
  const rootValid=root===bundle.transaction_root_sha256; if(!rootValid) add(errors,'ROOT_MISMATCH');
  const signatureValid=verifySignature(bundle); if(!signatureValid) add(errors,'SIGNATURE_INVALID');
  let required=true; for(const s of req){if(!(s in ev)){required=false;add(errors,'MISSING_SECTION:'+s);}}
  let cross=true;
  if(required){
    const tr=asObj(ev.transaction_record), p=asObj(ev.asset_provenance), r=asObj(ev.rights), l=asObj(ev.licence), u=asObj(ev.usage_receipt);
    const s=asObj(ev.license_settlement), v=asObj(ev.value_record), d=asObj(ev.digital_commodity), ca=asObj(ev.corporate_authorization), c=asObj(ev.capital), ss=asObj(ev.share_settlement);
    if(!eq(p.asset_id,tr.asset_id)){cross=false;add(errors,'PROVENANCE_ASSET_MISMATCH');}
    if(!eq(r.asset_id,tr.asset_id)){cross=false;add(errors,'RIGHTS_ASSET_MISMATCH');}
    if(!eq(r.claimant_entity_id,l.grantor_entity_id)){cross=false;add(errors,'RIGHTS_CLAIMANT_MISMATCH');}
    if(!eq(l.asset_id,tr.asset_id)||!eq(l.grantor_entity_id,tr.grantor_entity_id)||!eq(l.licensee_entity_id,tr.licensee_entity_id)||!eq(l.rights_claim_id,r.claim_id)){cross=false;add(errors,'LICENCE_LINK_MISMATCH');}
    if(!eq(u.licence_id,l.licence_id)||!eq(u.asset_id,tr.asset_id)||!eq(u.user_entity_id,l.licensee_entity_id)){cross=false;add(errors,'USAGE_LINK_MISMATCH');}
    if(!eq(u.purpose,l.authorized_purpose)){cross=false;add(errors,'USAGE_PURPOSE_UNAUTHORIZED');}
    if(!eq(s.licence_id,l.licence_id)){cross=false;add(errors,'SETTLEMENT_LINK_MISMATCH');}
    if(!eq(s.payer_entity_id,l.licensee_entity_id)||!eq(s.payee_entity_id,l.grantor_entity_id)){cross=false;add(errors,'SETTLEMENT_DIRECTION_INVALID');}
    if(v.realized_external===true && (!eq(v.settlement_id,s.settlement_id)||s.verified_external!==true||v.amount_minor>s.amount_minor)){cross=false;add(errors,'VALUE_EXCEEDS_SETTLEMENT');}
    if(!eq(d.asset_id,tr.asset_id)||!eq(d.usage_id,u.usage_id)||!eq(d.licence_id,l.licence_id)||!eq(d.settlement_id,s.settlement_id)){cross=false;add(errors,'COMMODITY_LINK_MISMATCH');}
    if(d.contribution_minor>s.amount_minor){cross=false;add(errors,'COMMODITY_EXCEEDS_SETTLEMENT');}
    if(!eq(ca.share_class_id,c.share_class_id)||!eq(ca.issuance_request_id,c.issuance_request_id)){cross=false;add(errors,'CAPITAL_AUTH_MISMATCH');}
    if(c.accounting?.debit_minor!==c.accounting?.credit_minor){cross=false;add(errors,'CAPITAL_ACCOUNTING_UNBALANCED');}
    const pos=Array.isArray(c.positions)?c.positions.reduce((n:number,x:any)=>n+Number(x.shares||0),0):0;
    if(c.outstanding_before+c.shares_issued!==c.outstanding_after||pos!==c.outstanding_after){cross=false;add(errors,'CAPITAL_SHARES_UNRECONCILED');}
    if(!eq(ss.capital_event_id,c.capital_event_id)){cross=false;add(errors,'SHARE_SETTLEMENT_LINK_MISMATCH');}
  } else cross=false;
  const ledgerValid=required ? verifyLedger(ev.event_ledger,errors) : false;
  errors.sort();
  const overall=rootValid&&signatureValid&&required&&cross&&ledgerValid&&errors.length===0;
  return {schema:'entity-cleanroom-verification-result-v1',transaction_id:String(bundle.transaction_id||''),transaction_root_sha256:String(bundle.transaction_root_sha256||''),root_valid:rootValid,signature_valid:signatureValid,required_sections_valid:required,cross_links_valid:cross,ledger_valid:ledgerValid,overall_valid:overall,error_codes:errors};
}

export function resultHash(r: Result): string { return sha256(canonical(r as unknown as J)); }
export function loadJson(file: string): any { return JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,'')); }
export function verifyRecovery(recoveryDir:string,keyFile:string): any {
  const m=loadJson(recoveryDir+'/RECOVERY_MANIFEST.json');
  const bundleBytes=readFileSync(recoveryDir+'/TRANSACTION_BUNDLE.json');
  const enc=readFileSync(recoveryDir+'/STATE_BACKUP.enc');
  const key=Buffer.from(readFileSync(keyFile,'utf8').trim(),'hex');
  const u={...m}; delete u.signature;
  let sigOk=false;
  try{
    const pub=createPublicKey({key:Buffer.from(m.signature.public_key_spki_der_b64,'base64'),format:'der',type:'spki'});
    sigOk=cryptoVerify(null,Buffer.from(canonical(u as J)),pub,Buffer.from(m.signature.sig_b64,'base64'));
  }catch{}
  const hashesOk=sha256(bundleBytes)===m.transaction_bundle_sha256 && sha256(enc)===m.encrypted_state_sha256 && sha256(key)===m.recovery_key_fingerprint_sha256;
  const nonce=Buffer.from(m.nonce_b64,'base64'); const tag=enc.subarray(enc.length-m.tag_bytes); const ct=enc.subarray(0,enc.length-m.tag_bytes);
  let restoredRoot=''; let decryptOk=false;
  try{const d=createDecipheriv('aes-256-gcm',key,nonce);d.setAuthTag(tag);const plain=Buffer.concat([d.update(ct),d.final()]);const state=JSON.parse(plain.toString('utf8'));restoredRoot=sha256(canonical(state.evidence));decryptOk=true;}catch{}
  const pass=sigOk&&hashesOk&&decryptOk&&restoredRoot===m.transaction_root_sha256;
  return {schema:'entity-cleanroom-recovery-result-v1',signature_valid:sigOk,hashes_valid:hashesOk,decrypt_valid:decryptOk,restored_transaction_root_sha256:restoredRoot,expected_transaction_root_sha256:m.transaction_root_sha256,overall_valid:pass};
}
