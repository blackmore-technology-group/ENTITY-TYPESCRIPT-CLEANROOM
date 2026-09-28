# ENTITY-TYPESCRIPT-CLEANROOM

[![Clean-room verification](https://github.com/blackmore-technology-group/ENTITY-TYPESCRIPT-CLEANROOM/actions/workflows/cleanroom-verify.yml/badge.svg)](https://github.com/blackmore-technology-group/ENTITY-TYPESCRIPT-CLEANROOM/actions/workflows/cleanroom-verify.yml)
[![License](https://img.shields.io/github/license/blackmore-technology-group/ENTITY-TYPESCRIPT-CLEANROOM)](LICENSE)

**Document class:** BTG-controlled reproducibility baseline  
**Frozen campaign target:** ENTITY v3.4.2 Global Passport  
**Current supported ENTITY runtime:** v3.4.3  
**BTDU component in v3.4.3:** Blackmore Technology Data Universe (BTDU) 3.4.2 unchanged

> This repository is maintained and controlled by Blackmore Technology Group Limited (BTG). It is cross-language reproducibility evidence, **not** an unrelated third-party implementation or independent external validation.

[ENTITY](https://github.com/blackmore-technology-group/ENTITY) · [Current v3.4.3 release](https://github.com/blackmore-technology-group/ENTITY/releases/tag/v3.4.3) · [Documentation model](https://blackmore-technology-group.github.io/ENTITY-DOCS/reference/documentation-model.html) · [External verification challenge](https://github.com/blackmore-technology-group/ENTITY/issues/55)

## What this repository verifies

This TypeScript implementation exercises BTG-controlled published campaigns, including earlier clean-room material, v3.2 adoption, v3.3 Verifiable Reality and the frozen **v3.4.2 Global Passport campaign**.

The v3.4.2 label identifies the exact sealed campaign target. It does **not** mean v3.4.2 is the current supported runtime.

## Frozen v3.4.2 campaign

Exact commitments remain unchanged:

- sealed vectors: **26/26 PASS**;
- sealed-kit SHA-256: `ced70113f1d153627eb972b11adbf20e502ed086e0b13e8abf1dc5adc4c2e716`;
- canonical campaign result SHA-256: `45af773554a7191c1b49a75c636a1106afb1de36d788bb00d7af56097b8d1b0e`;
- required `overall_valid: true`.

Run the frozen campaign:

```bash
npm ci
npm run build
node dist/passport_v34.js
```

## Other controlled campaigns

```bash
node dist/test.js
node dist/adoption_v32.js
node dist/reality_v33.js
```

See [`.github/workflows/cleanroom-verify.yml`](.github/workflows/cleanroom-verify.yml) for CI/checksum/evidence capture.

## Where this fits now

ENTITY v3.4.3 is the current supported runtime; BTDU remains component 3.4.2 unchanged. The frozen ENTITY Protocol 1.0 external clean-room target is separate. BTDU, ADAM and NIKI are not additional Protocol 1.0 requirements unless the sealed Protocol 1.0 material explicitly says so.

## Verification boundary

A PASS here means this **BTG-controlled TypeScript baseline** matches its frozen v3.4.2 campaign. It does not by itself establish an independently authored implementation, full external interoperability/recovery, objective external-world truth, legal title, regulatory compliance, accounting fair value, upstream ownership or automatic economic entitlement.

## Contributing

Reproducible failures, portability fixes, language-idiomatic improvements, test corrections, specification ambiguities and counterexamples are welcome. Independent conformance evidence should live in a repository controlled outside BTG.

## License

Apache License 2.0. See [LICENSE](LICENSE).
