# New Tibet identity

A focused Green Book / Blue Book signup app with four book photos, a random-code challenge, a short video message, private ZKPassport age/duplicate-passport checks, email + WhatsApp verification, optional passkey enrollment, and a manual-review submission screen. After acceptance, three bottom tabs open Petitions, Chat, and the digital ID profile. The mobile-first interface uses a single-column flow, system typography, white backgrounds, and large touch targets. Lapis navy actions and the supplied orange-knot logos retain the newtibet.com branding. The supplied blue and white New Tibet SVG logos live in `public/assets/`, with their unused export padding trimmed; the knot symbol also serves as the favicon. Fonts are self-hosted with their licenses in `public/assets/fonts/`.

The public demo keeps documents and contacts in page memory. It simulates verification codes and review messages with explicit labels. The separate backend implements private Google Drive uploads, Google Sheets records, AppSheet review callbacks, Resend email codes, Meta WhatsApp templates, server-verified WebAuthn registration, and a persistent notification outbox.

Each demo step has a footer shortcut. Upload sample photos adds realistic fictional booklets for Tenzin Dolma, including the current challenge code; upload sample video adds a six-second MP4. The synthetic media is labeled for demo use. The generated portrait and booklets, with their exact prompts, are documented in [demo asset notes](docs/DEMO-ASSETS.md). Skip advances ordinary steps, supplies sample contact values when blank, bypasses demo verification and wallet setup, and previews acceptance after review. The final profile has Restart demo. Skipped contact and passport checks stay unverified and are labeled as skipped on the profile. These shortcuts are hidden and inactive in live mode.

The wallet step illustrates biometric/passkey protection for an Ethereum wallet and New Tibet Coin ($TIBET). In the demo, a compatible passkey's client-side PRF encrypts an Ethereum wallet backup; the alternative generates twelve BIP-39 recovery words and checks three words before clearing them from the page. Wallet material remains in page memory and disappears on reload. This is not a funded wallet product: the $TIBET contract is unspecified, transfers and token issuance are unavailable, and persistent encrypted backup/recovery are not implemented. Live mode registers an account passkey only.

Demo petitions can be signed locally and chat messages stay in the page. The Chat tab explains BitChat Bluetooth mesh and links to the native app; this website does not connect to a mesh or broadcast messages. Live petitions remain empty and live chat requires the native app.

```sh
npm ci
npm run dev
npm test
npm run build
```

Open `http://localhost:4173`. The tracked passport and wallet SDK bundles support the static app in `public/`; `npm run build` regenerates them from the pinned dependencies. The GitHub Actions workflow publishes `dist/` to Pages. See [integration setup](docs/SETUP.md) for provider accounts, templates, AppSheet configuration, backend hosting, and switching to live mode. No secrets belong in the frontend or repository. The preview can generate a ZKPassport request but cannot verify it or enforce global uniqueness without the configured backend. Passport requests disclose no nationality, name, birth date, or passport number; New Tibet receives proofs and a scoped duplicate-registration identifier.

In demo mode, `?preview=review` opens a sample review screen and `?preview=profile` opens the accepted identity profile. Simulated decisions move to the top of a distinct result screen. The selected decision is disabled, WhatsApp previews remain clearly labeled, and accepted profiles retain the actual passport/contact verification state. These entry points and review controls are disabled in live mode; only the backend's accepted status opens the live profile. Profiles use the applicant's name, book type, application reference, and initials. Tenzin's fictional demo profile uses her generated portrait; live profiles use initials. No birth date, citizenship, or verification data is invented. Demo profiles are labeled as previews.
