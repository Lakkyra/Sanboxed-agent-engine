// Hand-drawn line icons for the Architecture showcase. Uniform 1.5px stroke,
// 24px grid, currentColor — deliberately understated (no filled glyphs, no emoji).

const base = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
};

export const IconPython = (p) => (
    <svg {...base} {...p}>
        <path d="M8 3.5h4a3 3 0 0 1 3 3V10a2 2 0 0 1-2 2H9a3 3 0 0 0-3 3v2.5" />
        <path d="M16 20.5h-4a3 3 0 0 1-3-3V14a2 2 0 0 1 2-2h4a3 3 0 0 0 3-3V6.5" />
        <circle cx="9.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
);

export const IconShell = (p) => (
    <svg {...base} {...p}>
        <rect x="3" y="4.5" width="18" height="15" rx="2" />
        <path d="M7 9.5l3 2.5-3 2.5M12.5 15h4" />
    </svg>
);

export const IconEdit = (p) => (
    <svg {...base} {...p}>
        <path d="M4 20h4l10-10a2.1 2.1 0 0 0-3-3L5 17v3z" />
        <path d="M13.5 6.5l3 3" />
    </svg>
);

export const IconImage = (p) => (
    <svg {...base} {...p}>
        <rect x="3" y="4.5" width="18" height="15" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="M4 17l4.5-4a2 2 0 0 1 2.7 0L15 16m1.5-2.5a2 2 0 0 1 2.6-.1L20 14" />
    </svg>
);

export const IconSkills = (p) => (
    <svg {...base} {...p}>
        <path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
        <path d="M14.5 3.5V8H19M8.5 12h7M8.5 15.5h7M8.5 8.5h2.5" />
    </svg>
);

export const IconRag = (p) => (
    <svg {...base} {...p}>
        <ellipse cx="12" cy="6" rx="7" ry="2.6" />
        <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" />
        <path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
    </svg>
);

export const IconDrive = (p) => (
    <svg {...base} {...p}>
        <path d="M9 4h6l6 10.5-3 5.2H6l-3-5.2L9 4z" />
        <path d="M9 4l-3 10.5M15 4l3 10.5M6 14.5h12" />
    </svg>
);

export const IconMcp = (p) => (
    <svg {...base} {...p}>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
        <path d="M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8" />
        <circle cx="12" cy="12" r="2.6" />
    </svg>
);

export const IconMemory = (p) => (
    <svg {...base} {...p}>
        <path d="M12 21c-3.5-2.6-7-5.4-7-9.4A4.1 4.1 0 0 1 12 8.2 4.1 4.1 0 0 1 19 11.6c0 4-3.5 6.8-7 9.4z" />
        <path d="M9.5 11.5h5M12 9v5" />
    </svg>
);

export const IconAgent = (p) => (
    <svg {...base} {...p}>
        <rect x="5" y="7" width="14" height="11" rx="2.5" />
        <path d="M12 7V4M9.5 3.5h5" />
        <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
        <path d="M2.5 11.5v3M21.5 11.5v3" />
    </svg>
);

export const IconTools = (p) => (
    <svg {...base} {...p}>
        <path d="M14.5 6.5a3.5 3.5 0 0 0-4.8 4.2L4 16.4 7.6 20l5.7-5.7a3.5 3.5 0 0 0 4.2-4.8l-2.3 2.3-2.1-.6-.6-2.1 2-2.6z" />
    </svg>
);

export const IconUser = (p) => (
    <svg {...base} {...p}>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
);

export const IconLock = (p) => (
    <svg {...base} {...p}>
        <rect x="5" y="10.5" width="14" height="9" rx="2" />
        <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
        <circle cx="12" cy="15" r="1.1" fill="currentColor" stroke="none" />
    </svg>
);

export const IconFolder = (p) => (
    <svg {...base} {...p}>
        <path d="M3.5 6.5a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V6.5z" />
    </svg>
);

export const IconBolt = (p) => (
    <svg {...base} {...p}>
        <path d="M13 3 5 13h5l-1 8 8-10h-5l1-8z" />
    </svg>
);

export const IconArrowRight = (p) => (
    <svg {...base} {...p}>
        <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
);

export const IconChip = (p) => (
    <svg {...base} {...p}>
        <rect x="7" y="7" width="10" height="10" rx="1.5" />
        <path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3" />
    </svg>
);

export const IconLayers = (p) => (
    <svg {...base} {...p}>
        <path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5z" />
        <path d="M3.5 12 12 16.5 20.5 12M3.5 16 12 20.5 20.5 16" />
    </svg>
);

export const IconVenv = (p) => (
    <svg {...base} {...p}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8 12a4 4 0 0 1 8 0 4 4 0 0 1-8 0z" />
        <path d="M12 3.5v3M12 17.5v3" />
    </svg>
);

export const IconFileText = (p) => (
    <svg {...base} {...p}>
        <path d="M7 3.5h7l4 4V19a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
        <path d="M14 3.5V8h4.5M9 12.5h6M9 16h6" />
    </svg>
);

export const IconShield = (p) => (
    <svg {...base} {...p}>
        <path d="M12 3.2 5 6v5.4c0 5 3 8.3 7 9.4 4-1.1 7-4.4 7-9.4V6l-7-2.8z" />
        <path d="M9 12l2 2 4-4.5" />
    </svg>
);

export const IconGauge = (p) => (
    <svg {...base} {...p}>
        <path d="M4 15.5a8 8 0 1 1 16 0" />
        <path d="M12 15.5 15.5 10" />
        <path d="M4 15.5h1.2M18.8 15.5H20M6.3 9l.9.9M17.7 9l-.9.9" />
    </svg>
);

export const IconPlugLink = (p) => (
    <svg {...base} {...p}>
        <path d="M8.5 4v3.5M15.5 4v3.5M6 7.5h12l-1 4.5H7L6 7.5z" />
        <path d="M9.5 12v2a2.5 2.5 0 0 0 5 0v-2" />
        <path d="M12 16.5V20" />
    </svg>
);

export const IconMonitor = (p) => (
    <svg {...base} {...p}>
        <rect x="3" y="4.5" width="18" height="12.5" rx="1.5" />
        <path d="M8.5 20.5h7M12 17v3.5" />
    </svg>
);

export const IconDatabase = (p) => (
    <svg {...base} {...p}>
        <ellipse cx="12" cy="6" rx="7" ry="2.6" />
        <path d="M5 6v5.5c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" />
        <path d="M5 11.5V17c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-5.5" />
    </svg>
);

export const IconGitBranch = (p) => (
    <svg {...base} {...p}>
        <circle cx="6" cy="5" r="2.2" />
        <circle cx="6" cy="19" r="2.2" />
        <circle cx="18" cy="12" r="2.2" />
        <path d="M6 7.2V16.8M6 9a9 9 0 0 0 10 5.8" />
    </svg>
);

export const IconSearch = (p) => (
    <svg {...base} {...p}>
        <circle cx="11" cy="11" r="6" />
        <path d="M15.5 15.5 20 20" />
    </svg>
);
