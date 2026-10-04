export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="adm-auth">
      <div className="adm-auth-card">
        <p className="adm-brand">Enginious <span>CMS</span></p>
        {children}
      </div>
    </main>
  );
}
