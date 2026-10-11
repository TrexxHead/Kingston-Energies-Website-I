/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy flat colors — still used by app/admin/login/page.tsx's
        // .btn-* utility classes (app/globals.css). `primary` now resolves
        // through the design system's own --color-primary token instead of
        // a second hardcoded green, so the login page and any shadcn/ui
        // component added below share one source of truth for the brand
        // green instead of two that could drift apart.
        primary: 'var(--color-primary)',
        secondary: '#f7941e',
        dark: '#0d1714',
        light: '#faf9f5',

        // shadcn/ui's expected semantic palette, aliased onto the existing
        // design-system tokens (app/_design-system/tokens.css) rather than a
        // second set of hardcoded values — so a shadcn component and an
        // inline-styled one read the same color in the same place, and both
        // follow the existing light/dark theme switch (ThemeToggle's
        // data-theme attribute) automatically, with no extra wiring.
        background: 'var(--color-surface)',
        foreground: 'var(--color-text)',
        card: 'var(--color-surface)',
        'card-foreground': 'var(--color-text)',
        popover: 'var(--color-surface)',
        'popover-foreground': 'var(--color-text)',
        'primary-foreground': 'var(--color-primary-contrast)',
        'secondary-foreground': 'var(--color-text)',
        muted: 'var(--color-surface-sunk)',
        'muted-foreground': 'var(--color-text-muted)',
        accent: 'var(--color-primary-soft)',
        'accent-foreground': 'var(--color-text)',
        destructive: 'var(--color-danger)',
        'destructive-foreground': 'var(--color-primary-contrast)',
        border: 'var(--color-border)',
        input: 'var(--color-border)',
        ring: 'var(--ke-green-500)',
      },
    },
  },
  plugins: [],
}
