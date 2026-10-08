# Membership cards in Apple Wallet and Google Wallet

The accepted profile shows a QR code and wallet options. A card can be presented at participating physical locations, where staff scan its QR to check current membership. This is a New Tibet membership card; it is not a government-issued identity document or an NFC payment pass.

GitHub Pages remains a static demo. Its Apple/Google previews are explicitly marked **PREVIEW ONLY** and cannot be imported into a device wallet. The demo can download a PNG card with a QR that opens an explicitly labeled demo check. It does not impersonate a signed `.pkpass` or a Google Wallet save link. Real saving requires the existing live backend plus issuer credentials; keep those secrets on the backend.

## QR membership checks

Set `MEMBERSHIP_CARD_SECRET` to a separate stable random secret of at least 32 characters, and set `CARD_FRONTEND_URL` to the full frontend base URL with a trailing slash, e.g. `https://alexjupiter.github.io/new-tibet-app/`. Its origin must match `FRONTEND_ORIGIN`. The frontend must use the configured live backend in `public/config.js`.

An authenticated member with an accepted application can call `GET /api/cards/profile`. It returns a stable verification URL, validity dates, and provider availability. The card token is an opaque HMAC derived from the member reference; it contains no identity attributes and is not an account login token. Only its SHA-256 hash is stored in the card table. QR links place the token in the URL fragment rather than a query string, so loading the check page does not send it in a URL to the web host. The page sends it to `POST /api/cards/verify` without a sign-in token or referrer.

The public check returns only acceptance status, book type, member reference, expiry, and check time. Names, contacts, media, passport data and passkey credentials are excluded. Every scan checks the current application status, token, expiration and revocation; invalid cards return `{ "valid": false }`. An issued card expires after one year. A copied barcode remains a copyable membership presentation, not proof of the presenter's identity. Use normal venue admission checks where necessary.

To revoke a card, set `membership_cards.revoked=1` for its reference using authorized backend administration. There is deliberately no public revocation endpoint. To renew an eligible card, update its expiry through an authorized operator procedure. Rotating the card secret invalidates all existing QR codes and requires an explicit migration of card records and reissue. Back up the secret securely. No OS wallet push-update service is included; online QR checks are authoritative even when an installed pass still displays older fields.

## Apple Wallet

Register a membership Pass Type ID and obtain its certificate through your Apple Developer account. Configure:

- `APPLE_PASS_TYPE_ID` and `APPLE_TEAM_ID`, matching the certificate's UID and OU.
- `APPLE_PASS_CERTIFICATE`: PEM pass-signing certificate.
- `APPLE_PASS_PRIVATE_KEY`: matching PEM private key.
- `APPLE_WWDR_CERTIFICATE`: the appropriate Apple WWDR intermediate PEM certificate.
- `APPLE_PASS_KEY_PASSWORD` if the key is encrypted.

The backend uses OpenSSL CMS signing and a stored ZIP archive. Its container installs OpenSSL; other hosts must provide `openssl` on PATH (or set `OPENSSL_PATH`). The server checks the signer identity and certificate validity. The pass includes the supplied New Tibet logo at 1×/2×/3×, membership fields, a QR barcode, expiry and New Tibet contact information. It contains an SHA-1 file manifest and a detached CMS signature with the intermediate certificate and signing time, as required by the pass format. SHA-1 is used for Apple's manifest format, not for the signing key or membership tokens.

`POST /api/cards/apple` creates a one-use download ticket valid for 60 seconds. The client follows the corresponding public download URL so Safari receives an actual `application/vnd.apple.pkpass` response. The issuance request signs the card; the download rechecks current acceptance, revocation and expiration before returning it. No session bearer token is placed in the download URL. Users follow their device's Add to Wallet instructions. Google signing credentials and application data are never embedded in a pass.

Tests verify generated package hashes and the detached signature using temporary test certificates. Those certificates are not trusted by Apple. Before enabling this provider, test a pass with the real certificate on iPhone and Apple Watch.

References: [Apple pass creation and signing](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Creating.html), [Apple Wallet setup and distribution](https://developer.apple.com/wallet/get-started/).

## Google Wallet

Create a Google Wallet issuer account, enable Wallet API access and authorize a dedicated service account in the issuer console. Create and approve a **Generic pass class** for New Tibet membership. Configure:

- `GOOGLE_WALLET_ISSUER_ID`: numeric issuer ID.
- `GOOGLE_WALLET_CLASS_ID`: the existing approved class ID, `issuerID.className`.
- `GOOGLE_WALLET_CREDENTIALS`: private JSON service-account key file. Use a dedicated wallet credential, not a frontend key or a Google Drive credential.

`POST /api/cards/google` returns a real `https://pay.google.com/gp/v/save/...` link with an RS256-signed `savetowallet` JWT. The class must already exist; the JWT creates the member's Generic object. The pass includes New Tibet branding, a member alias/reference, book type, acceptance, expiry and the same verification QR. It intentionally excludes names, portraits and other personally identifiable information; government identification and sensitive personal-data passes require a different Google product and approval.

Wallet issuance is separately gated by Google's publishing access. In Google's issuer demo mode, only registered test users can save passes and Google displays **[TEST ONLY]**. The app's profile preview alone does not grant publishing access. Test the configured issuer/class and actual Save to Wallet flow on an Android device before enabling this provider.

References: [Google web pass issuance](https://developers.google.com/wallet/generic/web), [Google signed JWTs](https://developers.google.com/wallet/generic/use-cases/jwt), [Generic object schema](https://developers.google.com/wallet/reference/rest/v1/genericobject).

## Fonts and sample-photo fix

The app uses the live website's Inter for interface text and IBM Plex Mono for technical references, including its `ss01` and `cv11` font features. Both are already self-hosted in `public/assets/fonts`; no external font request is needed. Confirmed against `https://newtibet.com/assets/index-CipfW5hg.css` on 2026-10-08.

Sample media is fetched relative to its module, revalidated, checked for its JPEG/MP4 byte signature, and retried once with cache reload. HTML error pages never reach an image decoder. Images use load/error events rather than requiring `Image.decode()`, including user-uploaded photos. Complete sample photo sets are applied atomically after loading, preserving any user-supplied photos. Temporary blob URLs are revoked. Browser checks cover both books in Chrome and WebKit, forced decode rejection, stale HTML responses, 404 failures and successful retry.
