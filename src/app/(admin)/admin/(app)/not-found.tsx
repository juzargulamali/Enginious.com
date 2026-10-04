import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="adm-empty">
      <h3>Not found</h3>
      <p>That page or item does not exist, or it was deleted.</p>
      <p style={{ marginTop: 14 }}><Link className="adm-btn adm-btn-primary" href="/admin">Back to the dashboard</Link></p>
    </div>
  );
}
