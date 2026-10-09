# Board iteration — 9 October 2026

The member navigation is Profile, Wallet, Chat, Petitions, Ecosystem, Announcements. Petitions follows Chat, and remains readable by all members; creating/supporting requires accepted Green Book membership. The welcome slideshow uses all six actual read-only app renderers.

Registration has two stages: book + pseudonymous display name, then verification evidence (four book photographs, challenge code, short video and consent). Photos/video are sections of the same second stage. Passport NFC is optional, both in the interface and backend submission validation. After submission, Profile exposes optional account security and contacts; accepted members can add the passport tier. Contact-free membership is supported. A passkey should be set up after submission so the member can recover account access when the initial session expires.

Demo book acceptance credits 100 $TIBET. Simulating the optional NFC upgrade credits another 100, once, and records a separate dated wallet entry. The minimal demo receipt includes only the fictional tier marker/date in addition to the existing receipt/read metadata, so reload restores the two rewards without storing proofs. The real backend still verifies real NFC proofs; no browser success flag is trusted and duplicate document claims remain enforced. Submitted applications can add an account passkey, verified contacts, and a server-verified NFC check through authenticated routes. Live token issuance is not implemented.

Wallet and Ecosystem show proposed Monlam/Dzongsar seven-day learning campaigns. Buttons simulate days; the seventh day credits 100 to the local demo ledger once per campaign, with an activity entry. This does not observe partner usage, check an actual calendar streak or send real tokens. Campaign days/spending are cleared on reload. No partner agreements are claimed. Possible Monlam premium access, smartvote SSO, Tibet House and yoga-course payments are described as future uses.

Chat includes an accessible, responsive SVG diagram of two Bluetooth relay paths, explanatory copy, and a button in the compact mesh notice. The existing full-height messenger remains. The explanation distinguishes offline multi-hop transport without a central intermediary from delivery limitations, device restrictions and distribution risk. The website remains a local interface demo. The upstream [BitChat README](https://github.com/permissionlesstech/bitchat) documents Bluetooth mesh plus internet-based Nostr fallback; this diagram specifically illustrates its offline mesh. Historical claims about disasters or app bans are not repeated as verified facts.

## Retention and privacy

The user confirmed the UI wording: personal information used for verification is deleted after 60 days. New applications consent under `2026-10-09` and receive a deadline 60 days after submission. The live backend's retention worker runs hourly, removes private verification media and spreadsheet copies through GoogleStore, then redacts application/session evidence and review notes. It retries failed deletion and preserves concurrent account/security changes. New media includes an application reference property so cleanup can find retakes as well as the currently attached files. Pending applications past their evidence deadline cannot be accepted. Legacy submissions have no new retention deadline and are not silently purged.

Background integration updates finish before retention cleanup so an in-flight spreadsheet sync cannot restore erased evidence. Notification jobs reload the account after external delivery to preserve newly added passkeys and contacts. Later setup changes requeue completed spreadsheet jobs; a change made during a sync schedules a fresh sync.

Chosen display name, optional contacts used for ongoing updates, membership status, public passkey credentials and duplicate-passport HMAC records are account data, with a separate account/deletion purpose. They are explained separately from 60-day verification evidence. The operator must apply the policy to backups, external exports and reviewer copies as well; code cannot erase copies outside its storage control. A live operator must define controller/lawful-basis details, processor agreements, reviewer access, backup retention, and a data-protection assessment before collecting real documents. This is not a GDPR certification.

Optional country statistics use a voluntary country-of-residence selection with explicit consent in final contact preferences. The backend keeps only a country tally and an account-level already-contributed marker; no per-member country is stored. The authenticated reporting endpoint suppresses counts under 10. Passport nationality is not used to infer residence. The Ecosystem page's counts are labelled illustrative. Operators must exclude these selections from request logs.

The welcome email-interest form is separate from identity registration. In demo mode it clears the input and explicitly saves/sends nothing. The live backend can record a normalized email and explicit consent with a duplicate-safe key and rate limit; it does not send marketing email or enrol in an external provider. Removal requests go to the existing New Tibet contact. Do not enable a mailing provider until its consent/unsubscribe arrangements are set up.

## Product and investor materials

- `public/roadmap.html`: printable product sheet with the three requested phases and date windows; all phases are planned.
- `public/privacy.html`: public retention/privacy policy and explanation of demo versus live data handling.
- `public/walkthrough.html`: narrated 2–3 minute recording of the actual revised mobile prototype, download, captions, transcript and chapter controls.

No investor emails, social posts, endorsements, partnership claims, scheduling or messages to board members have been sent. The meeting notes' assigned actions are tracked below for their human owners.

## Follow-up decisions and assigned work

- Alex / Namri: confirm minimum inputs and storage/controller/processor arrangements. Prototype now uses two stages; production still needs the reviewed privacy notice, encrypted persistent storage, backup policy, reviewers and deletion operations. Contact settings and NFC are optional.
- Christoph: physically test a current Tibetan Identity Certificate for a chip and actual ZKPassport support. [Passport Seva](https://www.passportindia.gov.in/psp/Faqs) distinguishes Identity Certificates from ePassports, but official evidence found did not establish IC chip compatibility. A chip symbol alone is not sufficient to establish SDK support.
- Christoph / Ingmar: review the product roadmap with phases Q4 2026–Q1 2027, Q1–Q2 2027, and H2 2027+. The public product sheet is ready for feedback.
- Alex / Namri: share the walkthrough for the Tuesday 13 October investor discussion after human review. No emails are sent automatically.
- Ingmar: obtain permission for any Prime Minister photographs, videos or endorsement wording before posting. The prototype makes no endorsement claim.
- Foundation board: moral-support letter review by the end of November remains a separate governance task.
- Treasury group: arrange the Namri/Stefan/Dirk/Alex/Ema 3-of-5 hardware-wallet call after the expected hardware delivery. The app does not change treasury signing policy or create keys.
- Marketing group: confirm the correct Foundation LinkedIn profile and access with its administrators. The app does not modify social accounts.
- Partnerships: confirm the Dzongsar URL, terms, usage verification and reward budget. The reported 5,000-user audience is internal meeting context, not a verified public metric. Confirm whether “Tibet Zamzo” refers to the already supplied Tibet Zomsa site.
- Collect informal WhatsApp feedback from the group; no phone number/group link was provided, so no destination is invented and no message is sent.
