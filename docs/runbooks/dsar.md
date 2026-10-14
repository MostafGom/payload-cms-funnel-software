# Data-subject requests (FR-CNS-4)

1. Create a _Data request_ (Settings → Data requests): type, regime (sets the 30/45-day due date),
   subject email.
2. Verify identity (e.g. reply from the address, or a logged-in session), record how in
   _Verification method_, set status _Identity verified_, save.
3. Click **Execute export** or **Execute erasure**.
   - Export: everything we hold (contact, submissions, notes, events, consent, emails, platform
     identifiers) is stored as JSON on the request. Send it to the person through a secure channel.
   - Erasure: CMS rows are deleted in one transaction; the worker purges `cdp` (events, sessions,
     journeys, identity links, identifiers, emails, enrollments, segments), pseudonymises consent
     proof, keeps a hashes-only tombstone and an `erasure` email suppression. Verified by the e2e
     test `privacy.spec.ts` ("zero PII").
4. The scheduler logs a warning 5 days before the due date and an error when overdue.
5. Ad platforms: we do not re-send erased people; deletion of data already sent to Meta/TikTok/Snap
   follows each platform's own process (document the request in the notes).
