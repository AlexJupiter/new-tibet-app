# New Tibet integration setup

The frontend is a static GitHub Pages app. The backend is a separate Node 24 service. The deployed frontend defaults to an explicit test mode: no uploads, messages, or identity approval. Selecting Blue Book identifies a supporter application; it must not be used as evidence of Tibetan nationality.

## GitHub Pages

The repository is `AlexJupiter/new-tibet-app`. The workflow builds the static app, runs backend tests, and deploys `dist`. If the workflow cannot enable Pages automatically, an administrator must open **Settings → Pages → Build and deployment → Source → GitHub Actions**, then rerun the workflow. The expected URL is `https://alexjupiter.github.io/new-tibet-app/`. Treat that URL as live only after the deployment succeeds. HTTPS is necessary for camera permissions and passkeys. Relative asset paths support the repository subpath.

## Private Google Drive and Sheets

1. Create a Google Cloud project; enable the Drive and Sheets APIs. Create a service account for this backend and supply its JSON credential file through your host's secret-file facility. Set `GOOGLE_APPLICATION_CREDENTIALS` to its path. Do not commit it.
2. Use a Workspace **Shared Drive** (recommended). Create a restricted `Identity photos` folder and a spreadsheet with an `Applications` tab. Add the service account as a contributor and only authorized reviewers as members. A service account cannot rely on personal Drive storage quota; use a Shared Drive or a separately implemented Workspace delegated identity.
3. Set the folder and spreadsheet IDs in the backend environment. Folder permissions must be restricted. The backend never makes uploaded files public. Reviewer links open Google's authenticated file viewer.
4. Initialize the header once: `node --env-file=.env backend/initialize-sheet.mjs`. This writes only `Applications!A1:R1`; back up an existing table first.
5. Connect this Sheet to AppSheet. Use `Reference` as its text key. Set `PhotoURL` to type URL so a signed-in reviewer can open the private Drive photo. Name, Email, WhatsApp, Book, passkey fields, consent, timestamps, and message fields are read-only. Hide passkey fields from reviewer views. **Do not turn private Drive photos into public image URLs.**

## AppSheet reviewer app

Create a queue view using the `Applications` table, and a pending slice `[Status] = "pending"`. Require sign-in, restrict users to the reviewer allowlist, and disable public access. Apply a security filter such as `IN(USEREMAIL(), LIST("reviewer1@example.org", "reviewer2@example.org"))`. Configure `ReviewedBy` as email and `ReviewedAt` as datetime.

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

## Hosting the backend and enabling live mode

Use a single Node 24 process on a host with an **encrypted persistent disk**, TLS, and a secrets facility. Build with `backend/Dockerfile` or run `npm ci --omit=dev` and `node backend/server.mjs`. Mount a persistent volume at `DATA_DIR`; the SQLite database contains sessions, application records, credentials, rate limits, and the message outbox. Do not use an ephemeral or autoscaling multi-instance deployment with this storage model. Set a backup and retention policy. Never expose the database directory as static files.

Copy `.env.example` into the host's secret configuration. Generate separate secrets of at least 32 random characters for session hashing and the review webhook. Configure `REVIEWER_EMAILS`. Set `FRONTEND_ORIGIN=https://alexjupiter.github.io` (an origin has no path) and `RP_ID=alexjupiter.github.io`. Enable `TRUST_PROXY=1` only when the host reliably overwrites `X-Forwarded-For`; otherwise leave it off. Set `APP_MODE=live` after all providers are configured. `/health` reports the mode.

Then change `public/config.js`:

```js
window.NEW_TIBET_CONFIG = {
  apiBase: 'https://YOUR_BACKEND',
  mode: 'live'
};
```

Commit and let Pages redeploy. The GitHub frontend origin is shared across all your Pages projects; use a dedicated custom domain and its RP ID before large-scale passkey enrollment. Passkeys registered for an RP ID do not automatically transfer to a new unrelated domain. The browser creates a resident credential with required user verification; the backend verifies the registration challenge, origin, RP ID, and attestation using SimpleWebAuthn. Only public key data and the credential ID are stored. PRF support is recorded when available; no PRF secret, wallet seed, private key, wallet address, token balance, or token issuance is created here. Future wallet design needs separate key derivation, recovery, chain, and distribution decisions.

Submission retries reuse the application reference and check existing Drive/Sheet records to reduce duplicates. An interrupted upload may leave a restricted document without a completed application; reconcile and remove abandoned records according to your retention policy.

Sessions last 24 hours and remain in page memory. Reloading clears the frontend session; applicants can contact support with their reference. Passkey sign-in and account recovery are future work, separate from the requested enrollment flow. Publish the final retention period, privacy notice, and reviewer operating procedures before collecting actual identity documents.

## Verification before launch

Run `npm test` and `npm run check`. Test camera access on an HTTPS phone browser; verify both real OTP channels; register a real passkey; confirm the private Drive image and Sheet row; accept and decline separate test applications in AppSheet; confirm both WhatsApp notifications. Try a duplicate webhook and a callback without its secret. Test a provider failure and retry, and back up the database.
