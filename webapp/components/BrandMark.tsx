export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 52 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 22 A24 24 0 0 1 26 46" />
      <path d="M2 30 A16 16 0 0 1 18 46" />
      <path d="M2 37 A9 9 0 0 1 11 46" />
      <path d="M28 30 L35 37 L50 15" />
    </svg>
  );
}
