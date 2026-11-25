export default function Logo({ size = 28 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" className="logo__bg" />
      <path d="M9 11.5 15 16l-6 4.5" className="logo__stroke" />
      <path d="M17 21h6" className="logo__stroke" />
      <circle cx="23" cy="10" r="2.2" className="logo__dot" />
    </svg>
  );
}
