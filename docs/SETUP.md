## Board update

Read [the 9 October iteration notes](BOARD-ITERATION.md) before deployment: registration is two stages, NFC is optional, post-submission passkeys and contacts are supported, and newly consented verification evidence has a 60-day deadline. The live retention worker requires Google storage deletion access and removes evidence from Drive, Sheets, SQLite and session copies. Backups and external reviewer copies require operator controls. Existing legacy applications are not automatically purged. Live token rewards remain unimplemented; this public site stays in demo mode.

# New Tibet integration setup

The frontend is a static GitHub Pages app. The backend is a separate Node 24 service. The deployed frontend defaults to an explicit test mode: no uploads, messages, or identity approval. The optional real ZKPassport request connects to its bridge, but the preview cannot verify the returned proof. Selecting Blue Book identifies a supporter application; it must not be used as evidence of Tibetan nationality.

## GitHub Pages

The repository is `AlexJupiter/new-tibet-app`. The workflow builds the static app, runs backend tests, and deploys `dist`. If the workflow cannot enable Pages automatically, an administrator must open **Settings → Pages → Build and deployment → Source → GitHub Actions**, then rerun the workflow. The expected URL is `https://alexjupiter.github.io/new-tibet-app/`. Treat that URL as live only after the deployment succeeds. HTTPS is necessary for camera permissions and passkeys. Relative asset paths support the repository subpath.

## Private Google Drive and Sheets

1. Create a Google Cloud project; enable the Drive and Sheets APIs. Create a service account for this backend and supply its JSON credential file through your host's secret-file facility. Set `GOOGLE_APPLICATION_CREDENTIALS` to its path. Do not commit it.
2. Use a Workspace **Shared Drive** (recommended). Create a restricted `Identity review media` folder and a spreadsheet with an `Applications` tab. Add the service account as a contributor and only authorized reviewers as members. A service account cannot rely on personal Drive storage quota; use a Shared Drive or a separately implemented Workspace delegated identity.
3. Set the folder and spreadsheet IDs in the backend environment. Folder permissions must be restricted. The backend never makes uploaded files public. Reviewer links open Google's authenticated file viewer.
4. Initialize the header once: `node --env-file=.env backend/initialize-sheet.mjs`. For an existing table, add the new S:Y columns and regenerate the AppSheet schema. This writes only `Applications!A1:Y1`; back up an existing table first.
5. Connect this Sheet to AppSheet. Use `Reference` as its text key. Set `PhotoURL`, `BookFrontURL`, `BookBackURL`, `ChallengePhotoURL`, and `VideoURL` to type URL so a signed-in reviewer can open the private Drive photos and video. Name, Email, WhatsApp, Book, all media URLs, ChallengeCode, PassportCountry, PassportVerified, passkey fields, consent, timestamps, and message fields are read-only. Hide passkey fields from reviewer views. **Do not turn private Drive photos into public image URLs.**

## AppSheet reviewer app

Create a queue view using the `Applications` table, and a pending slice `[Status] = "pending"`. Require sign-in, restrict users to the reviewer allowlist, and disable public access. Apply a security filter such as `IN(USEREMAIL(), LIST("reviewer1@example.org", "reviewer2@example.org"))`. Configure `ReviewedBy` as email and `ReviewedAt` as datetime.

The reviewer must check all four photos, ensure the handwritten number matches `ChallengeCode`, listen to the video message for the same code, and compare the visible face and book details. `PassportVerified` must be true. The random challenge is checked manually, not through OCR or automated face recognition in this app. Videos are bounded by size and format in the backend; duration and spoken content must also be checked by the reviewer.

Keep `Status`, `ReviewedBy`, and `ReviewedAt` non-editable directly; let controlled Accept and Decline actions change them only while `[Status] = "pending"`. Each action sets `Status` to `accepted` or `declined`, `ReviewedBy` to `USEREMAIL()`, and `ReviewedAt` to `NOW()`. Let reviewers supply `ReviewNote` before declining. AppSheet users must not have access to edit the app or its webhook secret. Restrict direct Sheet edit access to administrators where possible.

Add an automation bot triggered when `Status` changes from `pending` to `accepted` or `declined`. Add a POST webhook task:

- URL: `https://YOUR_BACKEND/api/reviews/decision`
- HTTP header: `Authorization: Bearer YOUR_REVIEW_WEBHOOK_SECRET`
- Content type: `application/json`
- Body:

```json
{
  "reference": "<<[Reference]>>",
  "status": "<<[Status]>>",
  "reviewedBy": "<<[ReviewedBy]>>"
}
```

The backend checks the shared secret, the reviewer allowlist, and the state transition. It commits the final status and queues a WhatsApp decision message. Repeated identical callbacks do not queue duplicate jobs. A final decision cannot be changed through this endpoint. `ReviewNote` stays in the Sheet; the bot omits free text from its JSON template to avoid broken escaping. If you add it, configure proper JSON escaping. Configure AppSheet retries and failure alerts; test automation availability on your subscription.

## Email verification

Create a Resend account, verify a sender domain, and set `RESEND_API_KEY` and `EMAIL_FROM`. Codes expire after 10 minutes, allow 5 attempts, and bind to the exact normalized contact value. Requests are limited to 5 codes per recipient per hour and at least one minute between sends for the same session. No code is returned by a live API.

## WhatsApp Business Cloud API

1. Create a Meta Business app, connect a WhatsApp Business Account, and register the sending phone number. Use a production system-user access token with `whatsapp_business_messaging`, not a temporary dashboard token. Set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and the supported `META_GRAPH_VERSION` shown in the dashboard.
2. Create approved templates with the exact names and language configured in `.env`. Utility templates use **two body variables**, first the applicant's name, then the application reference. Keep all four template languages aligned.
3. Authentication template `new_tibet_verification`: use Meta's **authentication** category with a **copy-code** button. The backend sends the OTP as body variable 1 and button URL parameter 1. If your approved template uses a different button format, adjust `Messages.sendTemplate` and test it before launch.
4. Utility template `new_tibet_registration`: `Hello {{1}}, we received your New Tibet identity application {{2}}. It is awaiting manual review. We will send the result here.`
5. Utility template `new_tibet_accepted`: `Hello {{1}}, your New Tibet identity application {{2}} has been accepted. Welcome to New Tibet. Wallet and token access will be announced separately.`
6. Utility template `new_tibet_declined`: `Hello {{1}}, your New Tibet identity application {{2}} could not be approved. Contact hello@newtibet.com for support.`
7. Template category approval is determined by Meta. Test with your own opted-in number before collecting real documents. The app captures explicit consent for codes and status updates.

Registration messages are queued after documents and records are stored. Decision messages are queued after a valid AppSheet callback. The persistent outbox retries failures with backoff (8 attempts). Accepted API responses are recorded as `sent`: this means provider acceptance, not proven delivery to the phone. Delivery/read receipts and incoming WhatsApp conversations are outside this MVP. A provider timeout or a crash after provider acceptance can result in a duplicate message on retry; the outbox provides at-least-once delivery attempts, not exactly-once delivery.

For failed jobs, an administrator can POST `{"reference":"NT-..."}` to `/api/reviews/retry` using the review authorization header. Monitor backend error logs and the Sheet's RegistrationMessage/DecisionMessage columns. A successful message can be sent on the next worker tick (15 seconds).

## ZKPassport

For accepted profile QR checks and signed Apple/Google membership passes, see [Wallet pass setup](WALLET-PASSES.md). Issuer keys are optional backend integrations; the static Pages site shows explicit wallet previews until a live issuer is configured.

The SDK is pinned to 0.18.2. The browser requests a real (non-dev) proof with age `gte 18`, no disclosed passport attributes, a session nonce bound as `custom_data`, and strict ZKPassport face matching. It uses the fixed scope `new-tibet-identity-v1` and a non-salted scoped identifier. Do not change the domain or scope after enrollment without migrating duplicate detection. The SDK's identifier is per document, domain, and scope: it detects reuse of the same passport, not one unique human across multiple passports.

The live backend rebuilds the expected query and verifies cryptographically with the full SDK in `verifierMode: 'local'`. Browser callbacks and browser-provided verification flags are never trusted. It rejects dev/mock identifiers, age below 18, failed face checks, wrong session bindings, extra personal disclosures, missing identifiers, and duplicate identifiers. Optional `ZKPASSPORT_RPC_URL` should be an Ethereum mainnet RPC. No API/dashboard secret is needed for this self-served request flow. Verification artifacts are cached under `DATA_DIR/passport-artifacts`; use an encrypted persistent disk with room for SDK circuit artifacts. Supply outbound HTTPS access to the registry/circuit/IPFS services configured by the SDK (`certificates.zkpassport.id`, `circuits2.zkpassport.id`, `ipfs.zkpassport.id`) and your mainnet RPC; the browser connects to `wss://bridge.zkpassport.id`. This backend does not forward proofs to the verifier API.

The database stores cryptographic proofs, an HMAC of the SDK's scoped identifier, and proof timestamps. No raw passport, passport name, passport number, nationality, birth date, or passport face image is accepted or stored by New Tibet through this check. The Sheet receives only `PassportVerified` from the passport result. Its legacy `PassportCountry` column stays blank for new applications; previously stored nationality is not automatically deleted. The book photos, name, contacts, challenge code, and video remain separate personal information used for manual review; do not describe the entire application as storing no personal information.

An unsubmitted proof reserves its identifier for one hour. A submitted application permanently claims it, including declined applications; changes need an explicit operator recovery procedure, not removal through public endpoints. The nonce-bound proof must be verified and submitted within one hour. The session and handwritten-code challenge last 24 hours. Requests are rate-limited. The live session token survives reload in this tab, but unfinished media and proof UI state do not. Closing the tab without submission can leave a reservation that must expire before a new session reuses the document.

Test the QR link using a physical NFC phone, a supported biometric passport, and the ZKPassport app. Confirm a genuine proof verifies with the backend, face checking works, age disclosure is absent, and a second session with the same passport is rejected. Cryptographic verification tests use injected verifier responses; they cannot replace this physical-passport launch check.

## Book photos and video

Four JPEGs are required: front cover, back cover, photo/identity page, and open book with a paper showing the server-generated six-digit code. Capture requests browser camera permission; photos are resized and re-encoded without EXIF. A 5–30 second video asks for camera and microphone access. The applicant holds the book and code and says: “I am applying for New Tibet. My verification code is [code].” A file picker supports phones/browsers where direct recording is unavailable.

Live submission uploads media separately to bounded authenticated endpoints after explicit consent and verification of any optional contacts provided. Each photo is at most 3 MB and video at most 20 MB (WebM or MP4/QuickTime container). Configure any reverse proxy to accept at least 20 MB binary bodies and 4.5 MB JSON proof bodies. All five private Drive files must exist before a Sheet row or registration message is created. Content-based upload keys make retries idempotent and allow retakes; reconcile abandoned/replaced private files through your retention procedure. No media is stored on a blockchain.

## Hosting the backend and enabling live mode

Use a single Node 24 process on a host with an **encrypted persistent disk**, TLS, and a secrets facility. Build with `backend/Dockerfile` or run `npm ci --omit=dev` and `node backend/server.mjs`. Mount a persistent volume at `DATA_DIR`; the SQLite database contains sessions, application records, credentials, rate limits, and the message outbox. Do not use an ephemeral or autoscaling multi-instance deployment with this storage model. Set a backup and retention policy. Never expose the database directory as static files.

Copy `.env.example` into the host's secret configuration. Generate separate secrets of at least 32 random characters for session hashing, the review webhook, and passport uniqueness. Back up `PASSPORT_UNIQUENESS_SECRET` securely and keep it stable: changing it breaks detection against existing HMAC identifiers and requires an explicit migration. Configure `REVIEWER_EMAILS`. Set `FRONTEND_ORIGIN=https://alexjupiter.github.io` (an origin has no path) and `RP_ID=alexjupiter.github.io`. Enable `TRUST_PROXY=1` only when the host reliably overwrites `X-Forwarded-For`; otherwise leave it off. Set `APP_MODE=live` after private Google storage and review are configured; test the optional passport integration before offering its upgrade. Email and WhatsApp providers are needed only if those optional contacts are offered. `/health` reports the mode.

Then change `public/config.js`:

```js
window.NEW_TIBET_CONFIG = {
  apiBase: 'https://YOUR_BACKEND',
  mode: 'live'
};
```

Commit and let Pages redeploy. The GitHub frontend origin is shared across all your Pages projects; use a dedicated custom domain and its RP ID before large-scale passkey enrollment. Passkeys registered for an RP ID do not automatically transfer to a new unrelated domain. The browser creates a resident credential with required user verification; the backend verifies the registration challenge, origin, RP ID, and attestation using SimpleWebAuthn. Only public key data and the credential ID are stored. PRF support is recorded when available; PRF output is stripped from the server-bound payload. Live mode creates no wallet, wallet address, balance, or token issuance.

The demo wallet uses Ethereum. The pinned viem bundle creates a random 128-bit BIP-39 mnemonic and derives its default Ethereum account. A compatible passkey's PRF output is used as a local AES-GCM key to encrypt the mnemonic. The alternative displays twelve fresh words and requires confirmation of words 3, 7, and 11 before discarding them. An account passkey can also sign back into the membership inbox without contact details. The 12-word wallet phrase does not sign into the membership account. No mnemonic or PRF secret is sent to New Tibet or persisted in browser storage. The encrypted passkey backup, credential reference, salt, and demo address remain only in page memory. Reloading destroys that state; do not fund a demo address.

Real wallet activation still requires the $TIBET token contract, deployment configuration, a durable encrypted-backup service, tested wallet unlocking/recovery, and an audited signing and transaction flow. Synced passkeys can reduce dependence on paper recovery phrases, but passkey availability alone does not recover a missing encrypted wallet backup. The demo does not issue tokens or send transactions.

Submitted applications have six tabs: Profile, Wallet, Chat, Petitions, Ecosystem, and Announcements, with a desktop sidebar at 900px and wider. Announcements remains the default on entry. Petitions appears immediately after Chat. A display name is required (a pseudonym is welcome), contacts are optional, and only supplied contacts require verification. Book photos, video and review consent remain required; the live passport proof is optional. Everyone can browse petitions and results; only accepted Green Book holders can create or support them. Eligible demo users can create a local petition and support once; these actions need a verified backend, persistence, authorization, and abuse controls before real publishing. In live mode no petitions are populated and the chat composer is disabled.

The planned native chat is a direct BitChat fork. Its web preview has conversation search, message bubbles, local drafts, and a Bluetooth/relay explanation; this deployment does not connect to a mesh, encrypt private messages, or simulate delivery receipts. [BitChat's native implementation](https://github.com/permissionlesstech/bitchat) supports Bluetooth mesh and queues messages until transport becomes available. Avoid an absolute guarantee of uncensorability or immediate delivery.

The Wallet tab's balances, sends, swaps, and withdrawals are local simulations. It starts empty and credits a single 100.00 $TIBET verification reward after demo application acceptance. The Wallet tab shows one unread transaction until it is opened; this read state survives a reload. The reward is reconstructed from the accepted application receipt with its original review date; local spending activity is still cleared on reload. Activity entries are dated. The wallet uses an illustrative $0.12 USD price, checks balances in integer units, and requires review/confirmation before updating its ledger. Sends search a fictional username directory, credit a local recipient ledger and deduct an illustrative 0.25 $TIBET gas fee in addition to the amount. Max reserves the fee; confirmation checks the recipient, fee, total, available balance and transaction replay. No actual registered members are searched, wallet addresses resolved, or Ethereum transfers submitted. Withdrawals use a masked fictional bank; no bank details or payout requests are collected. Live mode has no financial actions. Connecting this flow requires the Ethereum token contract, liquidity/exchange integration, a bank payout provider, applicable account eligibility, durable wallet recovery, and an audited transaction implementation.

Real username sends additionally require a member-controlled public username registry bound to the member’s wallet, authenticated lookup and unique username registration, token/network/address resolution, and transaction confirmation. Keep identity evidence and contact details out of that directory. [Ethereum gas is paid in ETH](https://ethereum.org/en/developers/docs/gas/); supporting user fees in $TIBET requires a configured [token-paying paymaster](https://docs.erc4337.io/paymasters/index.html) or equivalent relayer with an actual network-derived quote, fee conversion and settlement. The demo’s fixed fee models the intended UX, rather than implementing that infrastructure. The current passkey/recovery demo creates an EOA; a smart-account/bundler/paymaster flow still needs implementation.

Sample uploads are synthetic photos of Tenzin Dolma and narrated 18-second photo montages for each book. Complete sample sets share code 534216; actual applicant uploads retain their random challenge. Sample shortcuts and balances are restricted to demo mode and reset on reload. See [media production notes](DEMO-MEDIA-V2.md) for sources, exact image prompts, and the reproducible video script.

Technical references: [ZKPassport documentation](https://docs.zkpassport.id/), [WebAuthn PRF extension](https://www.w3.org/TR/webauthn-3/#prf-extension), [viem mnemonic accounts](https://viem.sh/docs/accounts/local/mnemonicToAccount), [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki), and [BitChat's native implementation](https://github.com/permissionlesstech/bitchat).

Submission retries reuse the application reference and check existing Drive/Sheet records to reduce duplicates. An interrupted upload may leave a restricted document without a completed application; reconcile and remove abandoned records according to your retention policy.

Sessions last 24 hours. A live bearer token stays in this tab’s session storage to survive reload; closing the tab or expiry requires passkey sign-in to recover the inbox. Discoverable passkey sign-in verifies the challenge, origin, RP ID, signature, user verification, and user handle, then opens the same application history. Users without a registered passkey have no automatic account recovery after the browser session ends. A wallet recovery phrase does not recover an inbox account. See [inbox endpoints and publishing](INBOX.md). Publish the final retention period, privacy notice, and reviewer operating procedures before collecting actual identity documents.

## Verification before launch

Run `npm test` and `npm run check`. Test camera access on an HTTPS phone browser; verify both real OTP channels; register a real passkey; confirm all five private Drive media files and the Sheet row; accept and decline separate test applications in AppSheet; confirm both WhatsApp notifications. Try a duplicate webhook and a callback without its secret. Test a provider failure and retry, and back up the database.
