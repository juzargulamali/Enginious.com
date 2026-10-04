"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Edge } from "@/components/neon/Edge";
import { BUDGETS, GENERAL_CONTACT, PROJECT_TYPES, REGIONS, type RegionKey } from "@/content/site";
import { techBySlug } from "@/content/technologies";
import { useBrief } from "./BriefProvider";

type Errors = Record<string, string>;
type State = { s: "idle" } | { s: "sending" } | { s: "error"; message: string } | { s: "done"; reference: string };
const isRegion = (v: string | null): v is RegionKey => v === "uae" || v === "ksa" || v === "europe";

const LABEL: Record<RegionKey, string> = { uae: "Global Headquarters", ksa: "Saudi Arabia Branch", europe: "Branch serving Europe" };
// Abstract crystalline forms, one per region (illustrations, not landmarks).
const SHARDS: Record<RegionKey, React.ReactNode> = {
  uae: <svg viewBox="0 0 100 120" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M50 4 L60 110 H40 Z" /><path d="M72 40 L82 110 H64 Z" opacity=".7" /><path d="M28 56 L38 110 H18 Z" opacity=".6" /></svg>,
  ksa: <svg viewBox="0 0 100 120" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M20 110 L42 18 L64 110 Z" /><path d="M54 110 L78 52 L96 110 Z" opacity=".7" /><path d="M42 18 L52 110" opacity=".5" /></svg>,
  europe: <svg viewBox="0 0 100 120" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M10 110 L40 40 L70 110 Z" /><path d="M50 110 L74 24 L96 110 Z" opacity=".7" /><path d="M40 40 L74 24" opacity=".5" /></svg>,
};

export function EnquiryForm() {
  const params = useSearchParams();
  const brief = useBrief();
  const [picked, setPicked] = useState<RegionKey | null>(null);
  const [projectType, setProjectType] = useState<string>("event");
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<State>({ s: "idle" });
  const idRef = useRef<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const status = useRef<HTMLDivElement>(null);

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
  const tel = `tel:${phone.replace(/\s/g, "")}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.s === "sending") return;
    const fd = new FormData(e.currentTarget);
    const val = (k: string) => String(fd.get(k) ?? "").trim();
    const body = { submissionId: (idRef.current ??= crypto.randomUUID()), region, name: val("name"), email: val("email"), company: val("company"), country: val("country"), projectType, eventDate: val("eventDate"), budget: val("budget"), message: val("message"), technologies: brief.items, website: val("website"), sourcePath: window.location.pathname };
    setErrors({});
    setState({ s: "sending" });
    try {
      const res = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.reference) {
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

  const fe = (k: string) => (errors[k] ? <p id={`e-${k}`} className="err">{errors[k]}</p> : null);
  const inv = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `e-${k}` : undefined }) as const;

  const side = () => (
    <>
      <div className="ct-card">
        <Edge variant="perimeter" duration={12} />
        <p className="eyebrow">Your enquiry goes to</p>
        <h3 style={{ marginTop: 6 }}>{reg.name}</h3>
        <p className="muted">{LABEL[region]}</p>
        <div className="row"><span className="ico" aria-hidden="true">✉</span><a href={`mailto:${email}`}>{email}</a></div>
        <div className="row"><span className="ico" aria-hidden="true">☎</span><a href={tel}>{phone}</a></div>
        <div className="row" style={{ marginTop: 16, flexWrap: "wrap" }}><a className="btn" href={`mailto:${email}`}>Email {reg.key === "uae" ? "Dubai" : reg.key === "ksa" ? "Riyadh" : "us"}</a><a className="btn" href={tel}>Call</a></div>
        {reg.email === null && <p className="muted" style={{ marginTop: 14, fontSize: "0.85rem" }}>Enquiries for Europe reach our general team, who connect you with the Poland branch.</p>}
        <div className="ct-route" aria-hidden="true">
          <div><i data-on={region === "uae"} />Dubai</div><span className="l" />
          <div><i data-on={region === "ksa"} />Riyadh</div><span className="l" />
          <div><i data-on={region === "europe"} />Poland</div>
        </div>
      </div>
    </>
  );

  const exp = () => (
    <div className="ct-exp">
      <p className="eyebrow">Selected experiences (optional)</p>
      {brief.items.length === 0 ? (
        <p className="muted" style={{ marginTop: 8, fontSize: "0.92rem" }}>None yet. <Link href="/technologies" className="accent">Explore technologies →</Link></p>
      ) : (
        <ul style={{ display: "flex", gap: 8, flexWrap: "wrap", listStyle: "none", padding: 0, margin: "10px 0 0" }}>
          {brief.items.map((s) => <li key={s}><button type="button" className="chip" aria-label={`Remove ${techBySlug(s)?.name ?? s} from brief`} onClick={() => brief.remove(s)}>{techBySlug(s)?.name ?? s} ✕</button></li>)}
        </ul>
      )}
      {fe("technologies")}
    </div>
  );

  return (
    <>
      <div className="ct-regions" role="radiogroup" aria-label="Choose the team you would like to contact">
        {(Object.values(REGIONS)).map((x) => (
          <label key={x.key} className="ct-reg" data-on={region === x.key}>
            <input type="radio" name="region" value={x.key} checked={region === x.key} onChange={() => setPicked(x.key)} className="sr-only" />
            {region === x.key && <Edge variant="perimeter" duration={9} />}
            <span className="radio" aria-hidden="true" />
            <span className="t"><b>{x.name}</b><span>{LABEL[x.key]}</span></span>
            {SHARDS[x.key]}
          </label>
        ))}
      </div>

      <div className="ct-main">
        {state.s === "done" ? (
          <div ref={status} tabIndex={-1} role="status" className="ct-form">
            <p className="eyebrow">Enquiry received</p>
            <h2>Thank you. We have your enquiry.</h2>
            <p className="lede">Your reference is <strong className="accent" style={{ fontFamily: "var(--font-code)" }}>{state.reference}</strong>. Keep it if you contact us about this project.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/work" className="btn">Explore our work</Link>
              <button type="button" className="btn" onClick={() => { idRef.current = null; setState({ s: "idle" }); }}>Send another enquiry</button>
            </div>
          </div>
        ) : (
          <form ref={form} onSubmit={onSubmit} noValidate className="ct-form">
            <h2>Your project starts here.</h2>
            <div className="two-fields">
              <div className="field"><label htmlFor="name">Name <span className="req">*</span></label><input id="name" name="name" className="input" autoComplete="name" placeholder="Your name" required maxLength={120} {...inv("name")} />{fe("name")}</div>
              <div className="field"><label htmlFor="email">Work email <span className="req">*</span></label><input id="email" name="email" type="email" className="input" autoComplete="email" placeholder="you@company.com" required maxLength={254} {...inv("email")} />{fe("email")}</div>
              <div className="field"><label htmlFor="company">Company</label><input id="company" name="company" className="input" autoComplete="organization" placeholder="Your company" maxLength={160} {...inv("company")} />{fe("company")}</div>
              <div className="field"><label htmlFor="country">Project country</label><input id="country" name="country" className="input" placeholder="Where will it happen?" maxLength={80} {...inv("country")} />{fe("country")}</div>
            </div>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="muted" style={{ fontSize: "0.85rem", marginBottom: 8 }}>Type of project</legend>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PROJECT_TYPES.map((t) => <button key={t.value} type="button" className="chip" aria-pressed={projectType === t.value} onClick={() => setProjectType(t.value)}>{t.label}</button>)}
              </div>
            </fieldset>
            <div className="two-fields">
              <div className="field"><label htmlFor="eventDate">Event date (optional)</label><input id="eventDate" name="eventDate" type="date" className="input" {...inv("eventDate")} />{fe("eventDate")}</div>
              <div className="field"><label htmlFor="budget">Budget range (optional)</label><select id="budget" name="budget" className="select" defaultValue="" {...inv("budget")}><option value="">Select a range</option>{BUDGETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</select>{fe("budget")}</div>
            </div>
            <div className="field"><label htmlFor="message">What are you planning? <span className="req">*</span></label><textarea id="message" name="message" className="textarea" style={{ minHeight: 120 }} required minLength={10} maxLength={5000} placeholder="Your goals, location, dates, and any experiences you have in mind." {...inv("message")} />{fe("message")}</div>
            <div id="brief">{exp()}</div>
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}><label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <div aria-live="assertive">{state.s === "error" && <p className="err" role="alert">{state.message}</p>}</div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={state.s === "sending"}>{state.s === "sending" ? "Sending…" : "Send enquiry →"}</button>
            <p className="muted" style={{ fontSize: "0.82rem" }}>We&apos;ll use these details to respond to your enquiry. <Link href="/privacy" className="accent">Privacy notice</Link></p>
          </form>
        )}

        <aside className="ct-side">
          <div className="ct-side-d">{side()}</div>
          <details className="ct-card ct-acc ct-opt">
            <summary>Prefer a conversation? Contact details</summary>
            {side()}
          </details>
        </aside>
      </div>
    </>
  );
}
