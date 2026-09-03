import React from 'react';

/**
 * Lightweight inline SVG icon set (no external requests).
 * Stroke-based, 24x24 viewBox, inherits currentColor.
 */
const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="9.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="2" />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2" />
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="2" />
    </>
  ),
  quiz: (
    <>
      <path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.33c-.8.31-1.4 1.02-1.4 1.87v.55" />
      <circle cx="11.6" cy="17.4" r="0.4" fill="currentColor" stroke="none" />
      <path d="M21 12a9 9 0 1 1-4.2-7.6" />
      <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  scores: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M21.5 20H2.5" strokeLinecap="round" />
    </>
  ),
  students: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.8 20c.9-3.2 3.3-5 6.2-5s5.3 1.8 6.2 5" strokeLinecap="round" />
      <path d="M16.5 5.6a3.2 3.2 0 1 1 1.4 6.1" strokeLinecap="round" />
      <path d="M18.2 15.2c2 .6 3.4 2.2 4 4.8" strokeLinecap="round" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.85a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.87Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
  trash: (
    <>
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" />
      <path d="M19 6l-.87 12.14A2 2 0 0 1 16.14 20H7.86a2 2 0 0 1-1.99-1.86L5 6" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinejoin="round" />
    </>
  ),
  play: <path d="M7 4.8v14.4a.6.6 0 0 0 .92.5l11.4-7.2a.6.6 0 0 0 0-1L7.92 4.3a.6.6 0 0 0-.92.5Z" strokeLinejoin="round" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4.3-4.3" strokeLinecap="round" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" strokeLinecap="round" strokeLinejoin="round" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <path d="m8 12.3 2.7 2.7L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />,
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
    </>
  ),
  alertCircle: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 7.5V13" strokeLinecap="round" />
      <circle cx="12" cy="16.4" r="0.5" fill="currentColor" stroke="none" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 11v5" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="0.5" fill="currentColor" stroke="none" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" strokeLinecap="round" />
      <path d="m16 17 5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" strokeLinecap="round" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 6.5V12l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5 13.8 9l5.5 1.8-5.5 1.8L12 18l-1.8-5.4L4.7 10.8 10.2 9Z" strokeLinejoin="round" />
      <path d="M19 3.5v3M17.5 5h3M5.5 16.5v3M4 18h3" strokeLinecap="round" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M2.8 12h18.4M12 2.8c2.6 2.5 3.9 5.6 3.9 9.2s-1.3 6.7-3.9 9.2c-2.6-2.5-3.9-5.6-3.9-9.2S9.4 5.3 12 2.8Z" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />,
  chevronLeft: <path d="m14.5 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  zap: <path d="M13 2.5 4.5 13.5H11l-1 8L18.5 10H12Z" strokeLinejoin="round" />,
  key: (
    <>
      <circle cx="8" cy="15.5" r="4.5" />
      <path d="m11.2 12.3 8.3-8.3M17 5l2.5 2.5M14.5 7.5 17 10" strokeLinecap="round" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" strokeLinecap="round" />
    </>
  ),
  drag: (
    <>
      <circle cx="9" cy="6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v6a4 4 0 0 1-8 0Z" />
      <path d="M8 5H5a3 3 0 0 0 3 5M16 5h3a3 3 0 0 1-3 5" strokeLinecap="round" />
      <path d="M12 14v3M8.5 21h7M10 21l.5-4h3l.5 4" strokeLinecap="round" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10.5h17" strokeLinecap="round" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  filter: <path d="M4 5h16l-6.2 7.4V19l-3.6-2v-4.6Z" strokeLinejoin="round" />,
  refresh: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" strokeLinecap="round" />
      <path d="M20.5 3.5V9H15" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" strokeLinejoin="round" />
      <path d="M5.4 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1Z" strokeLinejoin="round" />
    </>
  ),
};

export function Icon({ name, size = 20, strokeWidth = 1.8, className, style }) {
  const path = PATHS[name] || PATHS.info;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
