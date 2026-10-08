# New Tibet ID developer guide

`public/developers.html` is a standalone, mobile-first guide linked from the Ecosystem developer CTA. The CTA uses a relative module URL and opens a separate tab so the current application session, demo uploads and wallet state remain in the original tab. The page uses the existing New Tibet SVGs and locally served Inter / IBM Plex Mono fonts. It has a compact header, desktop contents sidebar, collapsible mobile contents, a three-stage sign-in diagram, button preview, downloadable assets and copyable examples. Static prose and download links work without JavaScript; `developers.js` loads example code as text from the same files offered for download and provides clipboard feedback with selection fallback.

Build copies everything into `dist` and synchronizes a repository-root `developers.html` fallback for branch-based Pages, with asset URLs pointing to `public/`. The CTA resolves beside `ecosystem.js`, so it works with both the normal Pages artifact and the existing branch fallback. The local backend serves `public/developers.html` directly.

## Availability and implementation scope

There is no partner authentication service in this repository. Existing member passkey sign-in and public membership card checks do not constitute an OIDC provider. The guide prominently labels the integration as a preview and describes intended issuer registration, consent, minimal disclosure and pairwise subjects. Membership scope `membership` and namespaced claim `https://newtibet.com/claims/membership` are proposed, not implemented or promised API contracts. The `.example` domains are reserved placeholders, not real services.

The guide does not launch sign-in, create tokens, request passkeys, call the app backend, restore receipts or read member storage. The button preview is a non-interactive image representation. Downloads provide a real HTML link to a partner's own `/auth/new-tibet` route and reusable CSS/SVG. The downloadable server module is an implementation template that needs a provisioned provider and the partner's framework/session adapters. It uses `openid-client` v6 APIs verified against the library's official example and reference. It is not bundled into or executed by the app. The environment example contains placeholders only.

The template demonstrates issuer discovery, explicit client-secret-basic authentication, exact HTTPS callback configuration, fresh PKCE S256/state/nonce per attempt, a five-minute server-side transaction, one-time consumption, validated OIDC response, issuer/subject account mapping and strict Green Book gating. Partners must persist the session before redirects and after callback consumption, handle provider errors and rotate authenticated sessions. No tokens are logged or stored in the browser. The illustrative claims file is an unsigned shape, deliberately not a JWT; expiry and other token claims are the provider's responsibility and are validated through the client library.

## References

- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth security best current practice (RFC 9700)](https://www.rfc-editor.org/rfc/rfc9700.html)
- [openid-client OIDC example](https://github.com/panva/openid-client/blob/main/examples/oidc.ts)
- [openid-client authorizationCodeGrant reference](https://github.com/panva/openid-client/blob/main/docs/functions/authorizationCodeGrant.md)
- [openid-client client-secret-basic reference](https://github.com/panva/openid-client/blob/main/docs/functions/ClientSecretBasic.md)
