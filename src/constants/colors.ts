export const COLORS = {
  // Primary brand colors
  primary: {
    50: '#fff8ea',
    100: '#fffdf6',
    200: '#f1efeb',
    300: '#e7e2d7',
    400: '#ccb98a',
    500: '#3a342a',
    600: '#17130f',
    700: '#123a2d',
    800: '#163d2f',
    900: '#243228',
  },
  
  // Status colors
  status: {
    success: {
      border: '#c5d3c8',
      bg: '#edf1ec',
      text: '#243228',
    },
    error: {
      border: '#ef4444',
      bg: '#fef2f2',
      text: '#dc2626',
    },
    warning: {
      border: '#ccb98a',
      bg: '#efe4c8',
      text: '#92400e',
    },
    info: {
      border: '#ccb98a',
      bg: '#fffdf6',
      text: '#4f473c',
    },
  },
  
  // Neutral colors
  neutral: {
    50: '#ffffff',
    100: '#f9fafb',
    200: '#f3f4f6',
    300: '#e5e7eb',
    400: '#d1d5db',
    500: '#9ca3af',
    600: '#6b7280',
    700: '#4b5563',
    800: '#374151',
    900: '#111827',
    950: '#030712',
  },
} as const

export const BORDER_RADIUS = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.9rem',
  full: '9999px',
} as const

export const SHADOWS = {
  card: '0_18px_40px_rgba(40,34,26,0.08)',
  cardHover: '0_18px_40px_rgba(23,20,18,0.12)',
  button: '0_1px_2px_rgba(0,0,0,0.05)',
} as const
