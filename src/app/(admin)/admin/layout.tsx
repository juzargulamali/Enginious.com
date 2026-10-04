import type { Metadata } from "next";
import "./admin.css";

// The CMS is never indexable, whatever the launch settings (also enforced by proxy.ts and next.config.ts).
export const metadata: Metadata = {
  title: { default: "Enginious CMS", template: "%s | Enginious CMS" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="adm-root">{children}</div>;
}
