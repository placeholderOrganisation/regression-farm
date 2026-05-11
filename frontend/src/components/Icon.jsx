const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  jobs: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 14h3" />
      <path d="M8 17h6" />
    </>
  ),
  workers: (
    <>
      <rect x="3" y="5" width="18" height="6" rx="1.5" />
      <rect x="3" y="13" width="18" height="6" rx="1.5" />
      <circle cx="7" cy="8" r="0.6" fill="currentColor" />
      <circle cx="7" cy="16" r="0.6" fill="currentColor" />
    </>
  ),
  schedules: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-5" />
      <path d="M13 16V8" />
      <path d="M18 16v-3" />
    </>
  ),
  check: <path d="M4 12l5 5L20 6" />,
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  hourglass: (
    <>
      <path d="M6 3h12" />
      <path d="M6 21h12" />
      <path d="M6 3c0 5 6 5 6 9s-6 4-6 9" />
      <path d="M18 3c0 5-6 5-6 9s6 4 6 9" />
    </>
  ),
  slash: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </>
  ),
  spinner: (
    <>
      <path d="M21 12a9 9 0 11-9-9" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" />,
  arrowUp: (
    <>
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M12 5v14" />
      <path d="M19 12l-7 7-7-7" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 012-2h9" />
    </>
  ),
  menu: (
    <>
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </>
  ),
  close: (
    <>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </>
  ),
  pulse: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 12h2l2-4 2 8 2-4h2" />
    </>
  ),
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 3v3" />
      <path d="M15 3v3" />
      <path d="M9 18v3" />
      <path d="M15 18v3" />
      <path d="M3 9h3" />
      <path d="M3 15h3" />
      <path d="M18 9h3" />
      <path d="M18 15h3" />
    </>
  ),
  flame: (
    <>
      <path d="M12 3s5 4 5 9a5 5 0 11-10 0c0-2 1-4 2-5 0 2 1 3 2 3 0-3 1-5 1-7z" />
    </>
  ),
  trending: (
    <>
      <path d="M3 17l6-6 4 4 7-9" />
      <path d="M14 6h6v6" />
    </>
  ),
  archive: (
    <>
      <rect x="3" y="3" width="18" height="5" rx="1" />
      <path d="M5 8v11a2 2 0 002 2h10a2 2 0 002-2V8" />
      <path d="M10 12h4" />
    </>
  ),
};

export default function Icon({ name, className = "w-4 h-4", strokeWidth = 1.75 }) {
  const inner = PATHS[name];
  if (!inner) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {inner}
    </svg>
  );
}
