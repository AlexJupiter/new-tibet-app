# New Tibet identity

A focused Green Book / Blue Book signup app with four book photos, a random-code challenge, a short video message, private ZKPassport age/duplicate-passport checks, email + WhatsApp verification, optional passkey enrollment, and a manual-review submission screen. The mobile-first interface uses a single-column flow, system typography, white backgrounds, and large touch targets. Lapis navy actions and the supplied orange-knot logos retain the newtibet.com branding. The supplied blue and white New Tibet SVG logos live in `public/assets/`, with their unused export padding trimmed; the knot symbol also serves as the favicon. Fonts are self-hosted with their licenses in `public/assets/fonts/`.

The public demo keeps documents and contacts in page memory. It simulates verification codes and review messages with explicit labels. The separate backend implements private Google Drive uploads, Google Sheets records, AppSheet review callbacks, Resend email codes, Meta WhatsApp templates, server-verified WebAuthn registration, and a persistent notification outbox.

```sh
npm ci
npm run dev
npm test
npm run build
```

Open `http://localhost:4173`. The tracked browser SDK bundle supports the static app in `public/`; `npm run build` regenerates it from the pinned dependencies. The GitHub Actions workflow publishes `dist/` to Pages. See [integration setup](docs/SETUP.md) for provider accounts, templates, AppSheet configuration, backend hosting, and switching to live mode. No secrets belong in the frontend or repository. The preview can generate a ZKPassport request but cannot verify it or enforce global uniqueness without the configured backend. No wallet or tokens are created by this version.

In demo mode, `?preview=review` opens a sample review screen and `?preview=profile` opens the accepted identity profile. Simulated decisions move to the top of a distinct result screen. The selected decision is disabled, WhatsApp previews remain clearly labeled, and accepted profiles retain the actual passport/contact verification state. These entry points and review controls are disabled in live mode; only the backend's accepted status opens the live profile. Profiles use the applicant's name, book type, application reference, and initials, with no invented birth date, citizenship, portrait, or verification data. Demo profiles are labeled as previews.
