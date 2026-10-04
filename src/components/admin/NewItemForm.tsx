"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createItem } from "@/app/(admin)/admin/actions/content";
import { slugify } from "@/lib/cms/schema";

export function NewItemForm({ type, titleLabel, fixedSlugs }: { type: string; titleLabel: string; fixedSlugs?: string[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const effectiveSlug = fixedSlugs ? slug || fixedSlugs[0] || "" : touched ? slug : slugify(title);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await createItem({ type, title, slug: effectiveSlug });
      if (r.ok) router.push(`/admin/content/${type}/${r.data.id}`);
      else { setErrors(r.fieldErrors ?? {}); setMsg(r.error); }
    });
  };
  return (
    <form onSubmit={submit} className="adm-form" noValidate>
      <div className="adm-field" data-invalid={!!errors.title}>
        <label htmlFor="title">{titleLabel}<span className="req">*</span></label>
        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required aria-invalid={!!errors.title} aria-describedby={errors.title ? "title-err" : undefined} />
        {errors.title && <p className="adm-err" id="title-err">{errors.title}</p>}
      </div>
      <div className="adm-field" data-invalid={!!errors.slug}>
        <label htmlFor="slug">Slug (the end of the web address)</label>
        {fixedSlugs ? (
          fixedSlugs.length ? (
            <select id="slug" value={slug || fixedSlugs[0]} onChange={(e) => setSlug(e.target.value)}>{fixedSlugs.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          ) : <p className="adm-hint">Every allowed slug already exists.</p>
        ) : (
          <input id="slug" type="text" value={effectiveSlug} onChange={(e) => { setTouched(true); setSlug(slugify(e.target.value) || e.target.value.toLowerCase()); }} maxLength={80} aria-invalid={!!errors.slug} aria-describedby="slug-help" />
        )}
        <p className="adm-help" id="slug-help">Lowercase letters, numbers and hyphens. You can change it later; published addresses keep working through an automatic redirect.</p>
        {errors.slug && <p className="adm-err">{errors.slug}</p>}
      </div>
      {msg && !errors.title && !errors.slug && <p className="adm-alert adm-alert-error" role="alert">{msg}</p>}
      <div className="adm-actions"><button className="adm-btn adm-btn-primary" type="submit" disabled={pending || (fixedSlugs && !fixedSlugs.length)}>{pending ? "Creating..." : "Create draft"}</button></div>
    </form>
  );
}
