/** Prasátko-kasička se zlatou mincí. Stejná kresba je v public/favicon.svg (ikony aplikace). */
export function PiggyShape({ body = '#e9f6ee', ink = '#0e5a3a' }: { body?: string; ink?: string }) {
  return (
    <>
      <circle cx="268" cy="112" r="44" fill="#f4b740" />
      <circle cx="268" cy="112" r="29" fill="none" stroke="#d48f12" strokeWidth="9" />
      <g fill={body}>
        <path d="M302 206 331 160 350 214Z" stroke={body} strokeWidth="16" strokeLinejoin="round" />
        <ellipse cx="248" cy="300" rx="152" ry="118" />
        <rect x="374" y="262" width="62" height="66" rx="24" />
        <rect x="148" y="378" width="46" height="62" rx="15" />
        <rect x="290" y="378" width="46" height="62" rx="15" />
      </g>
      <path d="M100 286c-30-2-40-26-24-44" fill="none" stroke={body} strokeWidth="14" strokeLinecap="round" />
      <rect x="208" y="192" width="104" height="16" rx="8" fill={ink} />
      <circle cx="338" cy="262" r="11" fill={ink} />
      <circle cx="398" cy="295" r="7" fill={ink} opacity=".5" />
      <circle cx="416" cy="295" r="7" fill={ink} opacity=".5" />
    </>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="116" fill="#0e5a3a" />
      <PiggyShape />
    </svg>
  );
}
