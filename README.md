# New Tibet identity

A focused Green Book / Blue Book signup app with browser camera capture, email + WhatsApp verification, optional passkey enrollment, and a manual-review submission screen. Styled around New Tibet's gold identity and Tibetan landscape, using the supplied design archive as a reference.

The public demo keeps documents and contacts in page memory. It simulates verification codes and review messages with explicit labels. The separate backend implements private Google Drive uploads, Google Sheets records, AppSheet review callbacks, Resend email codes, Meta WhatsApp templates, server-verified WebAuthn registration, and a persistent notification outbox.

```sh
npm ci
npm run dev
npm test
npm run build
```

Open `http://localhost:4173`. The static app in `public/` also works without installing dependencies. The GitHub Actions workflow publishes `dist/` to Pages. See [integration setup](docs/SETUP.md) for provider accounts, templates, AppSheet configuration, backend hosting, and switching to live mode. No secrets belong in the frontend or repository. No wallet or tokens are created by this version.
