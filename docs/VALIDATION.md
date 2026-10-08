# Validation performed

- Thirteen Node tests pass: contact and OTP protections; consent and matching contacts; all four book photos and video required; media format/size envelopes; age 18+ policy, strict face matching, session nonce binding, extra-disclosure rejection, mock/failed proof rejection; duplicate-passport claims including submitted applications; manual-review authentication and finality; private Drive multipart/idempotency; and message outbox retries.
- Chromium at 390px and 1440px passed four actual browser camera captures using fake hardware, the six-digit code photo, 5-second browser video recording with microphone permission, preview/playback, wrong/correct OTPs, submission and review views without script errors or horizontal overflow.
- The real bundled ZKPassport SDK generated a non-dev, non-salted QR/deep link with a mocked WebSocket transport. Browser/live proof acceptance used mocked SDK callbacks and an injected verifier. No genuine physical-passport cryptographic verification was performed.
- A virtual browser WebAuthn authenticator created a resident, user-verified passkey. The real SimpleWebAuthn backend verified its challenge, origin, and RP ID.
- The live browser flow with mocked providers recorded all five media objects, the matching code, country-only passport data, and the passkey public key. The preview clearly showed an unverified passport and no actual submission.
- Syntax checks and static build passed. Browser verification runs are available as local test scripts in `/tmp/new-tibet-expanded-browser.py` and `/tmp/new-tibet-expanded-live.mjs` for this workspace session.

Google Drive/Sheets, Resend, Meta WhatsApp, AppSheet, and cryptographic verifier responses were mocked for automated tests. The production backend uses the complete ZKPassport SDK for local verification. Real provider accounts, approved templates, a physical NFC phone/passport with strict face checking, delivery to a phone, actual AppSheet automation, and mobile Safari recording still require the launch checks in SETUP.md.

The interface now uses the supplied blue/white New Tibet SVG logos and a mobile-first, single-column design. The accepted state shows an identity profile with the applicant’s name, book type, actual application reference, initials, contacts, and their existing verification state. Demo profiles are explicitly labeled as previews.

Additional profile validation (October 2026):

- Chromium at 320, 390, 430, 768, and 1440px: acceptance, decline, return to review, and acceptance again show distinct screens, reset scroll to the top, and focus the result heading. The selected preview outcome is disabled. No horizontal overflow or failed asset requests occurred.
- The complete 390px demo used four actual browser camera captures with fake hardware, a five-second recording, both displayed demo OTPs, submission, and acceptance to reach a Blue Book supporter profile.
- Long Tibetan names, HTML-like user input, long email addresses, and a full UUID reference rendered without HTML execution or horizontal overflow at 320px.
- A mocked live status response opened the accepted profile. Live mode ignores the demo preview URL and exposes no simulation controls; calling the client simulation function cannot change live status. No actual provider approval was exercised.
- Both the repository-root static fallback and `dist/` loaded the profile, brand assets, and fonts. Syntax checks, static build, and whitespace checks passed.

Session browser checks are in `/private/tmp/new-tibet-profile-qa.cjs`; profile screenshots are in `/private/tmp/new-tibet-profile-preview/`. These tests do not replace the live provider and physical-passport launch checks described above.

Demo shortcut validation (October 2026):

- Chromium at 320, 390, 430, 768, and 1440px completed the application using footer shortcuts and sample media. Footer controls stayed visible, with touch targets at least 44px tall and no horizontal overflow. The final profile showed skipped contact and passport checks and no passkey.
- All four synthetic book photos loaded, including the current challenge code; the six-second sample MP4 passed duration validation and played. Existing uploaded photos and entered contact details were preserved. An active recording could be cancelled for a sample without its callback replacing the sample.
- A failed sample download kept the user on the video step with a working retry control. Restart cleared media, contacts, verification, consent, and review state, and removed the preview shortcut from the URL.
- Live mode hid the demo footer and ignored direct calls to both demo shortcut functions. Contact, media, and passport requirements still rejected incomplete live submissions, including when demo skip flags were set.
- The complete camera/recording/OTP demo and mocked live approval checks passed again, along with all thirteen Node tests, syntax checks, and the static build.

Session demo browser checks are in `/private/tmp/new-tibet-demo-qa.cjs`; screenshots are in `/private/tmp/new-tibet-demo-preview/`.
