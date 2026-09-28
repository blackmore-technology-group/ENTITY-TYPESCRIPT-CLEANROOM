# npm publication

This repository is prepared for npm trusted publishing through `.github/workflows/publish-npm.yml`.

## One-time registry setup

npm trusted publishing requires the package to already exist on npm before the trust relationship can be configured. The package owner must therefore complete the **first publication interactively** after confirming that the package name `entity-typescript-cleanroom` is available and that the npm account has the required security controls.

After the first release exists:

1. Open the package settings on npmjs.com.
2. Add a GitHub Actions trusted publisher.
3. Set organization/user to `blackmore-technology-group`.
4. Set repository to `ENTITY-TYPESCRIPT-CLEANROOM`.
5. Set workflow filename to `publish-npm.yml`.
6. Permit direct `npm publish` for that trusted publisher.
7. Prefer trusted-publisher-only/token-restricted publishing once the OIDC path has been proven.

## Release gate

A release tag must be exactly `v<package.json version>`. The workflow:

- requests GitHub OIDC with `id-token: write`;
- uses Node 24 and npm 11.15+;
- verifies the tag equals the package version;
- runs the existing test campaign;
- inspects the npm tarball and requires `dist/cli.js`;
- publishes using npm's short-lived trusted-publisher credentials.

No long-lived npm publish token is stored in this repository.

## Evidence boundary

Registry publication makes the BTG-controlled verifier easier to discover and install. It does not turn the baseline into unrelated third-party validation or an independently authored ENTITY implementation.
