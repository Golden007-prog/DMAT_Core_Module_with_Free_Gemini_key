/** Hand-authored empty-state spot illustrations — the SVG fallback for the
 *  two assets the image-generation daily limit blocked. Themeable via
 *  currentColor + brand accents; decorative only (aria-hidden). */

export function EmptyMistakesArt({ className = 'h-36 w-36' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      {/* tidy stack of flashcards, one tilted */}
      <rect x="26" y="66" width="56" height="34" rx="5" fill="currentColor" opacity="0.08" />
      <rect x="30" y="60" width="56" height="34" rx="5" fill="#F7E6EE" stroke="#A3195B" strokeWidth="2" />
      <rect
        x="36"
        y="50"
        width="56"
        height="34"
        rx="5"
        fill="#fff"
        stroke="#5B2144"
        strokeWidth="2"
        transform="rotate(-4 64 67)"
      />
      {/* shield with check */}
      <path
        d="M60 12l20 7v13c0 12.5-8.3 21.4-20 25-11.7-3.6-20-12.5-20-25V19l20-7z"
        fill="#A3195B"
      />
      <path
        d="M51 33l6.5 6.5L70 27"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EmptyRankingsArt({ className = 'h-36 w-36' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      {/* three-step podium */}
      <rect x="14" y="72" width="28" height="30" rx="3" fill="#F7E6EE" stroke="#A3195B" strokeWidth="2" />
      <rect x="46" y="56" width="28" height="46" rx="3" fill="#A3195B" />
      <rect x="78" y="80" width="28" height="22" rx="3" fill="#F7E6EE" stroke="#5B2144" strokeWidth="2" />
      {/* flag on the top step */}
      <line x1="60" y1="56" x2="60" y2="34" stroke="#5B2144" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 34h18l-5 6 5 6H60z" fill="#D4437F" />
      {/* confetti dots */}
      {[
        [22, 40, '#D4437F'],
        [34, 26, '#A3195B'],
        [88, 34, '#5B2144'],
        [100, 52, '#D4437F'],
        [16, 58, '#5B2144'],
        [96, 20, '#A3195B'],
      ].map(([cx, cy, fill], i) => (
        <circle key={i} cx={Number(cx)} cy={Number(cy)} r="3" fill={String(fill)} opacity="0.85" />
      ))}
    </svg>
  );
}
