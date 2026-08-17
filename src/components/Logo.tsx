export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" stroke="#ff5c38" strokeWidth="3" />
      <path d="M13 10.5v11l9-5.5-9-5.5z" fill="#ff5c38" />
      <rect x="6" y="23" width="6" height="2.5" rx="1.25" fill="#35e0b4" />
    </svg>
  );
}
