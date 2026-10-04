# Content requiring confirmation (nothing here is assumed)

## Sources
- **Technical Proposal Q2 2026** was not attached: not reviewed.
- **https://www.enginious.ae** could not be opened from the build environment: not reviewed. Please send screenshots or a PDF export if its content/URLs should inform the migration inventory.
- The Company Profile is marked confidential; everything used from it needs your approval before launch.

## Approvals needed
- Client names/attribution for each project (empty "Client" lines were not named in the profile: Games of the Future, Chronicles of Ahmed Al Maghribi, Umrah & Ziyarah Forum, Hajj & Umrah Exhibition, Invest Qatar, Restatex).
- Client logos: none are used.
- Photography and video: **none** approved. The profile contains "click to watch" links that were not accessible; please supply the videos/photos per project.
- Team: names/roles were taken from the profile (23 people); consent, portraits (real photos), personal introductions, and optional work.
- Leadership: portraits, bios, responsibilities and personal messages for Juzar Gulamali (Founder & CEO) and Rafi Ullah (Co-founder & CTO). The messages on the page are DRAFTS.
- Technologies: specifications, real demo videos, equipment imagery, "how visitors interact", availability. Only Tri-Helix has a detail page; no specs are published.
- Europe/Poland: city, address, contacts, staff, stock, which services are local vs supported from Dubai, any Europe-delivered projects.
- Contacts: KSA contact (Lubna) and numbers come from the profile; confirm they are the right public routing. Poland has none.
- Outlined logo files (see docs/brand.md).

## Internal review notes (previously shown on public pages; now internal only)
- **Home:** the featured reel and stats are drawn from the profile: "16 activations across 9 booths" (Global Health Exhibition, Riyadh 2025) and "5 countries" (FIFA Arab Cup Roadshow 2025). Confirm both figures and the right to publish them. Project cards carry no photography yet; they are typographic cards.
- **Home map:** offices are Dubai (HQ), Riyadh (Saudi Arabia branch city per the profile's KSA contact), and Poland (country-level marker only: no city). Project locations shown hollow: Jeddah, Madinah, Qatar, Oman, Bahrain; Belém (Brazil) is off-map and mentioned in text.
- **Home story evidence:** The Chronicles of Ahmed Al Maghribi (client not named in the profile), Tri-Helix description, Global Health Exhibition.
- **Technologies:** list drawn from the profile; specifications, demo videos and equipment imagery outstanding; forms are illustrations, not renders.
- **People:** names/roles unconfirmed (profile); no portraits; leadership responsibilities and personal messages not yet supplied (the earlier draft messages are not shown publicly).
- **Work:** all projects require client approval; blank client = not named in the profile.
- **Contact:** KSA contact (Lubna) and numbers from the profile; Poland has none (falls back to the general contact); attachments and email notification not yet live.
- **Europe:** no Europe-delivered project is listed; Poland city, address, staff, stock and local capabilities are unconfirmed and not claimed.

## Showreel revision notes (internal)
- Showreel `https://www.youtube.com/watch?v=OtAjMig32ZE` and second film `YYEiNgZXd3w` could NOT be opened from the build environment (YouTube is blocked): neither the footage nor its titles were reviewed. Confirm they are the intended, approved videos and that the embed is permitted.
- The second film is labelled generically ("Watch more from Enginious") until its content is confirmed.
- Embedded YouTube (privacy-enhanced domain) loads third-party player code after first paint when motion is acceptable; decide on a consent approach before enabling analytics.
- The People stage shows disciplines, not people; the two leaders appear by initials only. Leadership portraits/messages are still outstanding.
- `juzargulamali.com` (private repo) was read for interaction patterns only; none of its preview renders are used.

## Round 4 internal notes
- **Photography:** five photos were attached in chat (immersive installations, interactive technology, events and exhibitions, a male and a female portrait) but arrived as inline images only, not files, so they could not be saved. Send them as file attachments (or place them in `incoming/` and run `bash scripts/images/ingest-supplied.sh`). Their licence must be confirmed by the owner per image; the events photo shows other companies' branded booths (illustrative only, label stays).
- **Juzar's portrait** is the supplied photograph, used as supplied (cropped by focal point only).
- **Preview portraits** (when added) appear on two team cards by ROLE only, labelled "Preview", never with an employee's name.
- **Mission / Vision (DRAFT for approval):** Mission: "To help organisations captivate their audiences with experiential technology that is engineered, built and supported by one team." Vision: "To lead the way in innovative, immersive experiences: pioneering customisable technology for events, automation and robotics around the world." Source wording: Company Profile 2026 Q2.
- **Leadership responsibilities** are derived only from the role titles (draft). **Leadership messages** are not published until approved (`approved: false` in `src/content/leaders.ts`).
- **Project locations** are the 19 supplied by the owner. Related work is attached only where the profile records the place (Qatar for Doha, Oman for Muscat, Bahrain, Belém for Brazil are noted as such). Kuwait, Baku, Hannover, Vienna, Amsterdam, Miami, Barcelona, Paris, London, Las Vegas, Shanghai have no recorded work, so the panel says "Project details are being added." Bahrain, Kuwait, Brazil and Poland are country-level markers; Poland's office city is not shown.
- **Company page lifecycle** (seven steps) is an explanation of how the supplied services connect, not a claim about internal process or tooling.
- **Brief uploads** are not offered: storage, validation and failure handling are not built.

## Round 5 approvals needed
- Clients: confirm which names may be shown and whether each is a direct or agency relationship (all currently unconfirmed; no logos used).
- Testimonials: samples are fictional and unpublished (visible only with `?samples=1` off production). Supply real, approved quotes.
- CEO / CTO messages: drafts in `docs/leadership-drafts.md`, hidden until approved.
- Company Mission / Vision: drafts, to confirm.
- Contact: Poland has no supplied email/phone; enquiries fall back to the general contact. Brief file uploads are not built (needs storage and validation).
- Imagery: **no image generation capability is available in this environment, so no images were generated.** The slots (Contact scene, Events, Experience centres, Permanent installation, preview portraits) are ready in `src/content/images.ts` with focal point, alt and status; the designed CSS stages are fallbacks, not photographs. Supply or approve real/licensed images to fill them.

## Round 6
- Testimonials: samples are not shipped at all by production builds (`VERCEL_ENV=production` or `ALLOW_INDEXING=true`); with none published the section is omitted. Verified in both modes.
- Image slots and exact specs: `docs/asset-handoff.md`. Still no images generated.
- Spacing: Clients, Testimonials and People use a tighter section rhythm (about 140px between Clients and People at 1440 wide, 64px on phones), same with or without Testimonials.

## Milestone 2 (CMS) additions
- **Import the starter content** into the CMS (each type's list page -> "Import starter content"). Until you do, the public site serves the built-in copy for that type. The fictional sample testimonials and unapproved leadership messages are never imported.
- **Client relationships:** all 35 clients are "not confirmed" (names only). To say "direct client" or "delivered through an agency" you must confirm each and enter the approved wording; the CMS blocks publishing otherwise.
- **Testimonials:** none published. A testimonial can be published only with written permission ticked and cannot be a fictional sample. The Testimonials section stays hidden until one is published.
- **Leadership messages / bios / responsibilities:** private until written and approved; the approval tick is internal and never public.
- **Verified outcomes and confirmed specifications:** the CMS refuses to publish an outcome or specification not marked verified/confirmed. None are entered.
- **Poland:** city, address, email and phone are still empty; enquiries for Europe go to the general contact (or the recipients you set on the Europe region).
- **Notification recipients** per region (internal field on each Region) and the email provider are not set up.
- **Privacy notice** is provisional; retention period undecided (`docs/privacy-retention.md`).
- **Old-site URL list** needed for redirects (`docs/url-migration.md`).
