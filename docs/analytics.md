# Analytics (integration point only; no provider is built in)

No analytics are active. The code provides a consent-gated loader and a safe event helper, nothing more.

**Turn it on (when you have chosen a privacy-friendly provider):**
1. Set `NEXT_PUBLIC_ANALYTICS_SRC` to the provider's https script URL (and `NEXT_PUBLIC_ANALYTICS_DOMAIN` if it uses `data-domain`). Redeploy.
2. Visitors then see an "Accept analytics / No thanks" choice. The script is added to the page only after "Accept". Declining or ignoring it loads nothing.
3. Send events with `trackEvent("technology_added", { technology: "tri-helix" })` from `src/components/ConsentGate.tsx`. The helper does nothing without consent and removes personal data (emails, names, phone numbers, free text, long numbers). Set `window.__enginiousTrack` in your provider snippet to forward events.
4. Suggested events: enquiry submitted (region only), technology added to brief, case-study opened, profile PDF downloaded. Never include names, emails, messages or references.

**Verified here:** with the variable set, the script is not requested before consent, not after declining, and loads exactly once after accepting (`scripts/test/consent-check.sh`). **Not verified:** any real provider's behaviour. Update `/privacy` to name the provider before enabling.
