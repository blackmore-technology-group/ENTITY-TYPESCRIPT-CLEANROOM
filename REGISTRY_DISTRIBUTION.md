# Registry distribution boundary

This npm package is a BTG-controlled verifier/clean-room conformance baseline for ENTITY. Registry publication exists to make a useful verifier easier to discover and run; it is not independent third-party validation.

`entity-verify <bundle.json>` exposes the existing verifier as a CLI. Registry packaging must not change the sealed campaign inputs, expected classifications, hashes, or fail-closed semantics.

For independent evidence, use an independently controlled repository and document the exact public specification/test material consulted.
