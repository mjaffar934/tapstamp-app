export const colors = {
  background: '#FAF8F5',
  surface: '#FFFFFF',
  surfaceElevated: '#F5F2ED',
  surfaceMuted: '#EFEBE4',
  accent: '#C9A96E',
  accentDark: '#A68B4B',
  accentMuted: 'rgba(201, 169, 110, 0.15)',
  text: '#1A1814',
  textSecondary: '#8A8070',
  textMuted: '#B5ADA0',
  border: '#E8E4DD',
  borderLight: '#F0EBE4',
  success: '#4A7C59',
  successMuted: 'rgba(74, 124, 89, 0.12)',
  error: '#C45C4A',
  errorMuted: 'rgba(196, 92, 74, 0.12)',
  warning: '#B8860B',
  white: '#FFFFFF',
  overlay: 'rgba(26, 24, 20, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  hero: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.2 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.3 },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#1A1814',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A1814',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
