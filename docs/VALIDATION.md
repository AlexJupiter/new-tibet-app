# Validation performed

- Twenty-six Node tests pass: contact and OTP protections; consent and matching contacts; all four book photos and video required; media format/size envelopes; age 18+ policy, strict face matching, session nonce binding, extra-disclosure rejection (including nationality), mock/failed proof rejection; duplicate-passport claims including submitted applications; manual-review authentication and finality; private Drive multipart/idempotency; message outbox retries; fresh BIP-39 Ethereum accounts; passkey PRF encryption/decryption and wrong-key/tamper rejection; removal of PRF secrets from credential payloads; petition eligibility/creation/support; and integer demo wallet accounting with quote, balance, and duplicate-transaction protections.
- Chromium at 390px and 1440px passed four actual browser camera captures using fake hardware, the six-digit code photo, 5-second browser video recording with microphone permission, preview/playback, wrong/correct OTPs, submission and review views without script errors or horizontal overflow.
- The real bundled ZKPassport SDK generated a non-dev, non-salted QR/deep link with a mocked WebSocket transport. Browser/live proof acceptance used mocked SDK callbacks and an injected verifier. No genuine physical-passport cryptographic verification was performed.
- A virtual browser WebAuthn authenticator created a resident, user-verified passkey. The real SimpleWebAuthn backend verified its challenge, origin, and RP ID.
- The original live browser flow with mocked providers recorded all five media objects, the matching code, and the passkey public key. The updated passport policy removes nationality disclosure and storage; backend tests reject additional disclosure fields and accept only age, nonce binding, and strict face-match results. The preview clearly shows an unverified passport and no actual submission.
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

Ethereum wallet and accepted-app validation (October 2026):

- Sixteen Node tests passed, including fresh twelve-word BIP-39 account recovery, PRF-encrypted wallet recovery, wrong-key and tampered-ciphertext rejection, and server payloads without PRF encryption outputs. Backend passport policy tests passed without nationality disclosure or storage.
- Chromium's PRF-enabled CTAP 2.1 virtual authenticator created a passkey-protected demo Ethereum wallet. The browser also generated twelve words, rejected an incorrect backup answer, accepted the correct answers, and removed the words from page state. No physical biometric sensor or password-manager recovery was exercised.
- At 320, 390, 430, 768, and 1440px, the footer/sample flow reached Tenzin Dolma's accepted profile with the generated portrait. Abandoning a phrase through Skip or switching to a passkey removed its words. App tabs supported keyboard navigation; local petition signatures and chat drafts/messages survived tab changes. HTML-like and long Tibetan chat text rendered safely without overflow. The footer remained visible above the bottom tabs. Restart cleared the local state.
- Live-mode checks ignored the demo profile URL, used initials instead of the synthetic face, exposed no demo wallet or sample petitions, and disabled chat and recovery-word creation. Programmatic live chat submission added no message. Demo browser runs made no application API requests and wrote no local/session storage.
- Both root and `dist/` static entry points completed the sample flow with module-relative images/video and the new app modules. Syntax, build, and whitespace checks passed. The rendered challenge image was visually inspected with the current six-digit code centered on its paper card.

Session feature checks are in `/private/tmp/new-tibet-feature-qa.cjs` and `/private/tmp/new-tibet-app-ui-check.cjs`; sample and mobile UI screenshots are in `/private/tmp/new-tibet-app-preview/`. The $TIBET contract remains unspecified; no token issuance, transfers, persistent wallet backup, actual Bluetooth mesh connection, or live petition publishing was tested or enabled. These remain integration work, separate from the interactive public demo.

Member app and media revision validation (8 October 2026):

- Twenty-one Node tests passed, including five new member-model tests covering Green Book eligibility, petition validation and one-time support, amount parsing, review quotes, integer swap/withdrawal accounting, insufficient balances, tampered quotes, and duplicate confirmation.
- Chromium at 320, 390, 430, 768, 900, 1024, and 1440px passed the four-tab layout, 52px header, desktop sidebar, sample supporter counts, local petition creation, HTML escaping, conversation search/separation, chat sending, swap review/back/cancel/confirmation, withdrawal confirmation, ledger activity, and reset. Final chat spacing checks at 320, 390, 900, and 1440px confirmed the composer stayed above the footer.
- Both Green and Blue Book sample sets used code 534216 and loaded matching 18-second narrated video clips. Chrome played and decoded their audio, loaded all four English caption cues, and removed sample labels/captions when a file was uploaded instead. Video frames and revised book covers/interiors were visually inspected against the public references documented in DEMO-MEDIA-V2.md. These are narrated photo montages, not live face-verification recordings.
- The footer-only demo passed at five widths. Existing uploads and contact values were preserved, sample download failures remained retryable, active recording could be replaced by a sample, and restart cleared state. The complete camera/recording/OTP flow, acceptance/decline, long Tibetan names, mocked live approval, recovery-word confirmation, and PRF-enabled virtual passkey wallet checks passed again.
- A mocked accepted live profile exposed no sample petition results, enabled petition creation, chat sending, demo ledger, swaps, or withdrawals. Direct demo shortcuts still could not bypass live contact/media/passport requirements. No real tokens, bank transfers, native mesh delivery, or provider integrations were exercised.
- Both repository-root and dist entry points completed the sample flow with module-relative assets. Syntax checks, build, and whitespace checks passed.

Session browser scripts: `/private/tmp/new-tibet-member-v2-qa.cjs`, `/private/tmp/new-tibet-media-v2-qa.cjs`, `/private/tmp/new-tibet-demo-qa.cjs`, `/private/tmp/new-tibet-profile-qa.cjs`, `/private/tmp/new-tibet-app-ui-check.cjs`, and `/private/tmp/new-tibet-static-branding-qa.cjs`. Member screenshots are in `/private/tmp/new-tibet-v2-preview/`. Permanent model tests are in `tests/member.test.mjs`.


Optional details and one-way inbox validation (8 October 2026):

- All 26 Node tests passed. New coverage accepts blank name/contact fields while retaining consent, book/video, and passport requirements; rejects supplied unverified contacts; isolates private application events and per-owner read state; blocks member publishing/replies; rejects conflicting announcement IDs; and verifies persistence and legacy-event backfill after a real SQLite restart.
- Chromium at 320, 390, 430, 768, 900, 1024, and 1440px completed the optional-details application flow, opened Announcements by default, retained the application receipt/read state after reload, added acceptance history, filtered/read notifications, and cleared the saved receipt on restart. Announcements, Petitions, Chat, Wallet, Profile appeared in that order. Names, contacts, media, proofs, and wallet material were absent from the demo's local snapshot.
- Chat occupied the full viewport beside the 224px desktop sidebar and the full mobile area above navigation/footer, with no outer margins or header. Messages sent locally, the Bluetooth info dialog opened, the composer remained visible, and no horizontal overflow occurred. The final receipt/header adjustments passed at 320, 390, and 1440px.
- Real SimpleWebAuthn registration and discoverable authentication passed with Chromium's user-verified virtual authenticator and no name/email/phone. The live inbox recovered the same application and read state after clearing the browser session, received an authenticated shared announcement, and survived reload. The application record was seeded for this sign-in test; it did not perform a physical passport or provider review. Background refresh preserved the chat search DOM and its value.
- The recovery-word wallet and PRF-enabled passkey wallet regression passed. Adding an account passkey after confirming a recovery phrase preserved the original wallet address/method instead of replacing it.
- Root and dist static entry points loaded the inbox modules and completed sample signup to Announcements. Syntax, build, and whitespace checks passed. No actual members were messaged or announcements published outside local tests.

Session scripts are `/private/tmp/new-tibet-inbox-ui-qa.cjs`, `/private/tmp/new-tibet-inbox-live-qa.mjs`, `/private/tmp/new-tibet-app-ui-check.cjs`, and `/private/tmp/new-tibet-static-branding-qa.cjs`; screenshots are in `/private/tmp/new-tibet-inbox-preview/`. The public Pages app remains a demo. Live channel operation requires the configured backend described in INBOX.md, and background/OS push is not implemented.

## Wallet verification reward (2026-10-08)

- All 39 application tests passed, including acceptance-only reward eligibility for Green/Blue Book members, one-time credit after repeated renders and decisions, no replenishment after spending, and backward-compatible receipt/reward read-state restoration.
- Chrome at 390px and 1440px, and WebKit at 320px passed `/private/tmp/new-tibet-wallet-reward-qa.cjs`. Pending/declined applications had no reward or badge. Acceptance created a 100.00 $TIBET balance, a Wallet “1” badge independent of Announcements, and a dated incoming entry. Opening Wallet cleared the badge and preserved that read state on reload.
- The accepted receipt reconstructed the same reward and original acceptance timestamp after reload. The local ledger did not credit it twice during repeated decisions, tab changes or spending. Sends reserved gas, swaps/withdrawals updated the dated timeline, and the welcome showcase reused the new wallet screen without changing the parent's reward read flag.
- No Ethereum transfer or mint was submitted. Live mode continued to show wallet activation unavailable, without simulated rewards, balances or financial actions. Outgoing demo activity and balances remain ephemeral; receipts and inbox/reward read state persist without wallet keys or identity media.
