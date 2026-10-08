# Membership inbox and one-way announcements

A display name is required for new submissions; it can be a pseudonym and does not have to be a real name. Email and WhatsApp are optional. Blank contact details do not block submission, passport proof verification, or passkey enrollment. Supplied contacts must be verified and cannot be substituted after verification. Consent to book/video review, all four photos, the video, and the live adult passport proof remain required. These uploads may contain personally identifiable information; optional contacts do not make document review anonymous.

Application receipts are inserted atomically with successful membership submissions. A final review decision adds one private event atomically with the decision; repeated submissions and review callbacks do not duplicate events. Existing applications are backfilled on backend startup. Announcements and read state live in the encrypted persistent SQLite deployment described in SETUP.md; never serve its data directory publicly.

Members can read this channel and mark messages read. There is no reply or publishing endpoint for a member. Application events are scoped to the application owner, and read state is separate for each owner. Global announcements are shared. The authenticated feed returns up to the latest 200 messages plus the current application summary. It never returns uploaded media, raw passport proofs, passkey public keys, or reviewer-only notes.

## Member endpoints

- `GET /api/notifications`: session bearer required. Returns `items` and the owner's `application` summary, including its current status.
- `POST /api/notifications/read`: session bearer required; JSON `{"ids":["notification-id"]}`. IDs must belong to the member's private feed or the shared channel. Marking another member's event is rejected.
- `POST /api/auth/options`: create a fresh session first with `POST /api/session`. Generates a discoverable passkey authentication challenge with required user verification.
- `POST /api/auth/verify`: verifies the passkey assertion, one-use challenge, expected origin/RP ID, user verification, user handle, signature, and stored counter using SimpleWebAuthn. Opens the existing application and its original inbox ownership; it does not create a new application or copy another person's records.

The app refreshes while open, every 30 seconds and on returning to the foreground. Background refresh updates the badge without interrupting chat or a form. This is in-app notification delivery, not operating-system or background push. A passkey allows returning without an email/phone. A 12-word Ethereum wallet phrase does not sign into this membership inbox.

The temporary live session bearer is stored in the current tab's session storage. It expires after 24 hours; passkey sign-in can then reopen the persistent account. A member who does not enroll a passkey has no automatic account recovery after the browser session ends. Public demo wallets and phrases do not provide a live sign-in identity.

## Publishing a New Tibet announcement

`POST /api/admin/announcements` requires the server's review/publisher bearer secret and a `publishedBy` address included in `REVIEWER_EMAILS`. The secret stays on the backend/admin system; never place it in frontend configuration. Members' session bearers cannot publish.

Request body:

```json
{
  "id": "community-update-2026-10",
  "publishedBy": "reviewer@example.org",
  "title": "New Tibet community update",
  "body": "Write the announcement members should receive here."
}
```

The ID uses 8–80 letters, digits, hyphens, or underscores. The title uses 3–140 characters and the body 10–5,000. Repeating the same ID/content is idempotent; reusing its ID for different content is rejected. Messages are plain text and the client escapes them. Publishing is an operator action; no announcement was sent to real members during implementation tests.

Email and WhatsApp are optional transports. Configure Resend only to offer email verification, and Meta/template settings only to offer WhatsApp verification/application messages. Applicants without a WhatsApp number do not enqueue WhatsApp registration or decision jobs. The in-app receipt/decision is available independently of provider delivery. The existing Google book-review integration and passport settings remain required for live applications.

## GitHub Pages demo

GitHub Pages runs the static demo. Its New Tibet notices are labeled sample announcements, and its application decisions are simulations. A small local snapshot keeps only reference, book type, status events, timestamps, and read IDs. It excludes name, email, WhatsApp, photos/video, passport proofs, passkey material, and wallet keys. Reload restores Announcements with a member reference as its display name. Restart demo clears this snapshot.

Activating a real channel on the Pages frontend requires hosting the configured backend and changing `public/config.js` to live mode with its API URL. Do not add publishing credentials to the Pages repository.

New applications collect the required display name and book/video review consent on Document. The remaining order is Book photos, Video, Passport, Wallet security, then optional Contact details. Omitting contacts preserves the chosen display name. Existing accounts retain their inbox history, including legacy applications that have no name.
