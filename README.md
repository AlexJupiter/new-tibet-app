# New Tibet identity

A focused Green Book / Blue Book signup app with four book photos, a random-code challenge, a short video message, private ZKPassport age/duplicate-passport checks, email + WhatsApp verification, optional passkey enrollment, and a manual-review submission screen. Uses the supplied design archive as a reference. Exact current New Tibet logo assets are still pending; the existing mountain symbol is a placeholder.

The public demo keeps documents and contacts in page memory. It simulates verification codes and review messages with explicit labels. The separate backend implements private Google Drive uploads, Google Sheets records, AppSheet review callbacks, Resend email codes, Meta WhatsApp templates, server-verified WebAuthn registration, and a persistent notification outbox.

```sh
npm ci
npm run dev
npm test
npm run build
```

Open `http://localhost:4173`. The tracked browser SDK bundle supports the static app in `public/`; `npm run build` regenerates it from the pinned dependencies. The GitHub Actions workflow publishes `dist/` to Pages. See [integration setup](docs/SETUP.md) for provider accounts, templates, AppSheet configuration, backend hosting, and switching to live mode. No secrets belong in the frontend or repository. The preview can generate a ZKPassport request but cannot verify it or enforce global uniqueness without the configured backend. No wallet or tokens are created by this version.
