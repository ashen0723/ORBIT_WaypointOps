
export function CurvedLines({ className = '' }: {className?: string;}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 200"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      
      {Array.from({ length: 12 }).map((_, i) =>
      <path
        key={i}
        d={`M-40 ${120 + i * 10} C 60 ${40 + i * 10}, 170 ${200 + i * 10}, 340 ${60 + i * 10}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1" />

      )}
    </svg>);

}