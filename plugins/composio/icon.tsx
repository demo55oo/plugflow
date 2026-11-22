export function ComposioIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Composio"
      className={className}
      fill="none"
      role="img"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Composio</title>
      <circle cx="5" cy="6" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="12" r="2" />
      <path d="M7 6h4a4 4 0 0 1 4 4a2 2 0 0 0 2 2" />
      <path d="M7 18h4a4 4 0 0 0 4-4a2 2 0 0 1 2-2" />
    </svg>
  );
}
