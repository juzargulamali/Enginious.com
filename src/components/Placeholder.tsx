/**
 * A designed, unlabelled media frame used where approved photography/video is still outstanding.
 * It shows no "placeholder" text to visitors; what is missing is tracked in docs/content-todo.md.
 */
export function Placeholder({ title, className = "", style }: { title: string; note?: string; className?: string; style?: React.CSSProperties }) {
  return <div className={`ph ${className}`} style={style} role="img" aria-label={title} />;
}
