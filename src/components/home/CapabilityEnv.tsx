/**
 * Environmental depth layer behind the capabilities content. Purely decorative and static: no script, no animation,
 * no filters. Near-black shading on the edges, a recessed pool of teal light, and a few dark forms at different depths
 * (far = small, dim and high; near = large, darker and cropped by the edge). It sits behind the cards and never overlaps them.
 */
export function CapabilityEnv() {
  return (
    <div className="env" aria-hidden="true">
      <span className="env-recess" />
      <span className="env-form f-far" />
      <span className="env-form f-mid" />
      <span className="env-form f-near" />
      <span className="env-shade" />
    </div>
  );
}
