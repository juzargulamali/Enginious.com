# Privacy, retention and consent (PROVISIONAL, owner decisions needed)

The public notice at `/privacy` is marked **provisional** until you approve it (set *Privacy notice status* to "Approved" in Site settings). It describes what the site actually does today; it is not legal advice.

## What is stored
Enquiry: name, work email, company, project country, project type, date, budget, message, selected experiences, optional attachments (private), plus a reference and timestamps. Internal staff notes. Rate-limit counters hold only salted hashes and are deleted after two days. No analytics or advertising trackers are loaded.

## Retention (decision needed)
Nothing is deleted automatically. Proposal for you to confirm or change: keep **closed and spam** enquiries **24 months**, then delete them with their notes and attachments. Administrators can do this in **/admin -> Enquiries -> Retention** ("Delete closed and spam enquiries older than N days", minimum 30). Deleting a single enquiry is also available to administrators. Decide: the period, whether open enquiries are reviewed, who is the data controller, and the lawful basis wording for the notice.

## Deletion requests
Search the enquiry by email or reference in the inbox, then delete it (administrators). Attachments are removed with it. The deletion is recorded in the audit log without personal details.

## Consent
Optional analytics are off. The integration point (`src/components/ConsentGate.tsx`) shows a choice and loads nothing until the visitor accepts (verified: `scripts/test/consent-check.sh`). Events are stripped of personal data (`src/lib/consent.ts`). Required functions (the enquiry form, shortlist stored in the visitor's own browser) do not need consent.
