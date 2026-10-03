"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BUDGETS, GENERAL_CONTACT, PROJECT_TYPES, REGIONS, type RegionKey } from "@/content/site";
import { techBySlug } from "@/content/technologies";
import { useBrief } from "./BriefProvider";

type Errors = Record<string, string>;
type State =
  | { s: "idle" }
  | { s: "sending" }
  | { s: "error"; message: string }
  | { s: "done"; reference: string };

const isRegion = (v: string | null): v is RegionKey => v === "uae" || v === "ksa" || v === "europe";

export function EnquiryForm() {
  const params = useSearchParams();
  const brief = useBrief();
  const [picked, setPicked] = useState<RegionKey | null>(null);
  const [projectType, setProjectType] = useState<string>("event");
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<State>({ s: "idle" });
  const form = useRef<HTMLFormElement>(null);
  const status = useRef<HTMLDivElement>(null);

  // One id per form-load: retries and double-clicks resolve to the same record on the server.
  const idRef = useRef<string | null>(null);

  const r = params.get("region");
  const tech = params.get("tech");
  const region: RegionKey = picked ?? (isRegion(r) ? r : "uae");
  useEffect(() => {
    if (tech && techBySlug(tech) && !brief.has(tech)) brief.toggle(tech);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tech]);

  const reg = REGIONS[region];
  const email = reg.email ?? GENERAL_CONTACT.email;
  const phone = reg.phone ?? GENERAL_CONTACT.phone;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.s === "sending") return;
    const fd = new FormData(e.currentTarget);
    const val = (k: string) => String(fd.get(k) ?? "").trim();
    const body = {
      submissionId: (idRef.current ??= crypto.randomUUID()),
      region,
      name: val("name"),
      email: val("email"),
      company: val("company"),
      country: val("country"),
      projectType,
      eventDate: val("eventDate"),
      budget: val("budget"),
      message: val("message"),
      technologies: brief.items,
      website: val("website"),
      sourcePath: window.location.pathname,
    };
    setErrors({});
    setState({ s: "sending" });
    try {
      const res = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.reference) {
        // Success is shown only after the server has accepted (stored) the enquiry.
        setState({ s: "done", reference: data.reference });
        brief.clear();
        requestAnimationFrame(() => status.current?.focus());
        return;
      }
      if (res.status === 400 && data.errors) {
        setErrors(data.errors);
        setState({ s: "error", message: "Please check the highlighted fields." });
        requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
        return;
      }
      setState({ s: "error", message: `We could not send your enquiry just now. Your details are still here. Please try again, or email ${email}.` });
    } catch {
      setState({ s: "error", message: `Network problem: your enquiry was not sent. Your details are still here. Please try again, or email ${email}.` });
    }
  }

  if (state.s === "done") {
    return (
      <div ref={status} tabIndex={-1} role="status" className="panel" style={{ padding: "clamp(24px, 4vw, 44px)" }}>
        <p className="eyebrow">Enquiry received</p>
        <h2 style={{ marginTop: 10 }}>Thank you. We have your enquiry.</h2>
        <p className="lede" style={{ marginTop: 14 }}>
          Your reference is <strong className="accent" style={{ fontFamily: "var(--font-code)" }}>{state.reference}</strong>. Keep it
          if you contact us about this project.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <Link href="/work" className="btn">Explore our work</Link>
          <button type="button" className="btn" onClick={() => { idRef.current = null; setState({ s: "idle" }); }}>Send another enquiry</button>
        </div>
      </div>
    );
  }

  const fe = (k: string) => (errors[k] ? <p id={`e-${k}`} className="err">{errors[k]}</p> : null);
  const inv = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `e-${k}` : undefined }) as const;

  return (
    <div className="contact-grid">
      <form ref={form} onSubmit={onSubmit} noValidate className="panel" style={{ padding: "clamp(18px, 3vw, 34px)", display: "grid", gap: 18 }}>
        <h2 style={{ fontSize: "1.6rem" }}>Your project starts here.</h2>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="muted" style={{ fontSize: "0.85rem", marginBottom: 8 }}>Choose the team you&apos;d like to contact</legend>
          <div className="regions">
            {Object.values(REGIONS).map((x) => (
              <label key={x.key} className="region-opt" data-on={region === x.key}>
                <input type="radio" name="region" value={x.key} checked={region === x.key} onChange={() => setPicked(x.key)} className="sr-only" />
                <strong>{x.name}</strong>
                <span className="muted">{x.role}</span>
              </label>
            ))}
          </div>
          {fe("region")}
        </fieldset>

        <div className="two-fields">
          <div className="field"><label htmlFor="name">Name <span className="req">*</span></label><input id="name" name="name" className="input" autoComplete="name" placeholder="Your name" required maxLength={120} {...inv("name")} />{fe("name")}</div>
          <div className="field"><label htmlFor="email">Work email <span className="req">*</span></label><input id="email" name="email" type="email" className="input" autoComplete="email" placeholder="you@company.com" required maxLength={254} {...inv("email")} />{fe("email")}</div>
          <div className="field"><label htmlFor="company">Company</label><input id="company" name="company" className="input" autoComplete="organization" placeholder="Your company" maxLength={160} {...inv("company")} />{fe("company")}</div>
          <div className="field"><label htmlFor="country">Project country</label><input id="country" name="country" className="input" placeholder="Where will it happen?" maxLength={80} {...inv("country")} />{fe("country")}</div>
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="muted" style={{ fontSize: "0.85rem", marginBottom: 8 }}>Type of project</legend>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PROJECT_TYPES.map((t) => (
              <button key={t.value} type="button" className="chip" aria-pressed={projectType === t.value} onClick={() => setProjectType(t.value)}>{t.label}</button>
            ))}
          </div>
        </fieldset>

        <div className="two-fields">
          <div className="field"><label htmlFor="eventDate">Event date (optional)</label><input id="eventDate" name="eventDate" type="date" className="input" {...inv("eventDate")} />{fe("eventDate")}</div>
          <div className="field">
            <label htmlFor="budget">Budget range (optional)</label>
            <select id="budget" name="budget" className="select" defaultValue="" {...inv("budget")}>
              <option value="">Select a range</option>
              {BUDGETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            {fe("budget")}
          </div>
        </div>

        <div className="field">
          <label htmlFor="message">What are you planning? <span className="req">*</span></label>
          <textarea id="message" name="message" className="textarea" required minLength={10} maxLength={5000} placeholder="Your goals, location, dates, and any experiences you have in mind." {...inv("message")} />
          {fe("message")}
        </div>

        <div id="brief" className="panel" style={{ padding: 16 }}>
          <p className="eyebrow">Shortlisted technologies (optional)</p>
          {brief.items.length === 0 ? (
            <p className="muted" style={{ marginTop: 8, fontSize: "0.92rem" }}>None yet. <Link href="/technologies" className="accent">Explore technologies →</Link></p>
          ) : (
            <ul style={{ display: "flex", gap: 8, flexWrap: "wrap", listStyle: "none", padding: 0, margin: "10px 0 0" }}>
              {brief.items.map((s) => (
                <li key={s}><button type="button" className="chip" aria-label={`Remove ${techBySlug(s)?.name ?? s} from brief`} onClick={() => brief.remove(s)}>{techBySlug(s)?.name ?? s} ✕</button></li>
              ))}
            </ul>
          )}
          {fe("technologies")}
        </div>

        {/* Honeypot: hidden from people and assistive tech. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
          <label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>

        <div aria-live="assertive">{state.s === "error" && <p className="err" role="alert">{state.message}</p>}</div>

        <button type="submit" className="btn btn-primary" disabled={state.s === "sending"}>
          {state.s === "sending" ? "Sending…" : "Send enquiry →"}
        </button>
        <p className="muted" style={{ fontSize: "0.82rem" }}>We&apos;ll use these details to respond to your enquiry. <Link href="/privacy" className="accent">Privacy notice</Link></p>
      </form>

      <aside className="stack" style={{ ["--stack" as string]: "16px" }}>
        <div className="panel" style={{ padding: 22 }}>
          <h3>Prefer a conversation?</h3>
          <p className="muted" style={{ marginTop: 6 }}>{reg.name} · {reg.role}</p>
          <p style={{ marginTop: 14 }}><a className="accent" href={`mailto:${email}`}>{email}</a></p>
          <p><a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a></p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <a className="btn" href={`mailto:${email}`}>Email us</a>
            <a className="btn" href={`tel:${phone.replace(/\s/g, "")}`}>Call</a>
          </div>
          {reg.email === null && <p className="muted" style={{ marginTop: 14, fontSize: "0.85rem" }}>Enquiries for Europe reach the general team, who will connect you with the Poland branch.</p>}
        </div>
      </aside>
    </div>
  );
}
