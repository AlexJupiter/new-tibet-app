# Validation performed

- Thirteen Node tests pass: contact and OTP protections; consent and matching contacts; all four book photos and video required; media format/size envelopes; age 18+ policy, strict face matching, session nonce binding, extra-disclosure rejection, mock/failed proof rejection; duplicate-passport claims including submitted applications; manual-review authentication and finality; private Drive multipart/idempotency; and message outbox retries.
- Chromium at 390px and 1440px passed four actual browser camera captures using fake hardware, the six-digit code photo, 5-second browser video recording with microphone permission, preview/playback, wrong/correct OTPs, submission and review views without script errors or horizontal overflow.
- The real bundled ZKPassport SDK generated a non-dev, non-salted QR/deep link with a mocked WebSocket transport. Browser/live proof acceptance used mocked SDK callbacks and an injected verifier. No genuine physical-passport cryptographic verification was performed.
- A virtual browser WebAuthn authenticator created a resident, user-verified passkey. The real SimpleWebAuthn backend verified its challenge, origin, and RP ID.
- The live browser flow with mocked providers recorded all five media objects, the matching code, country-only passport data, and the passkey public key. The preview clearly showed an unverified passport and no actual submission.
- Syntax checks and static build passed. Browser verification runs are available as local test scripts in `/tmp/new-tibet-expanded-browser.py` and `/tmp/new-tibet-expanded-live.mjs` for this workspace session.

Google Drive/Sheets, Resend, Meta WhatsApp, AppSheet, and cryptographic verifier responses were mocked for automated tests. The production backend uses the complete ZKPassport SDK for local verification. Real provider accounts, approved templates, a physical NFC phone/passport with strict face checking, delivery to a phone, actual AppSheet automation, and mobile Safari recording still require the launch checks in SETUP.md.

The exact current New Tibet logo is pending because direct access to newtibet.com and its asset host is blocked in this environment. The existing mountain symbol is a placeholder, not an official logo.
