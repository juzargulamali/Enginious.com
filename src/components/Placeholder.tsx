/** Marks media that is still outstanding. Never present a placeholder as real project/people imagery. */
export function Placeholder({ title, note, className = "", style }: { title: string; note: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`ph ${className}`} style={style} role="img" aria-label={`Placeholder: ${title}`}>
      <div>
        <strong>{title}</strong>
        {note}
      </div>
    </div>
  );
}
