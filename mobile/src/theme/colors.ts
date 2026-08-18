/**
 * Ported from the web app's Nova design system tokens
 * (frontend/index.css) so the mobile app reads as the same product,
 * not a different one. Source values there are rgb() - converted to
 * hex here since React Native style values need a single string.
 *
 *   --nova-blue-500: rgb(21 94 239)   -> #155EEF
 *   --nova-blue-600: rgb(15 79 209)   -> #0F4FD1
 *   --nova-teal-500: rgb(13 148 136)  -> #0D9488
 *   --nova-teal-600: rgb(11 122 112)  -> #0B7A70
 * Amber/red/slate below follow the same web source, standard Tailwind
 * scale values matching the web app's existing amber-500/600,
 * red-500/600, slate-100/400/700 usage.
 */
export const colors = {
  blue50: '#EFF4FE',
  blue500: '#155EEF',
  blue600: '#0F4FD1',

  teal50: '#F0FBF9',
  teal500: '#0D9488',
  teal600: '#0B7A70',

  amber50: '#FFFBEB',
  amber500: '#F59E0B',
  amber600: '#D97706',

  red50: '#FEF2F2',
  red500: '#EF4444',
  red600: '#DC2626',

  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate400: '#94A3B8',
  slate700: '#334155',
  slate900: '#0F172A',

  hairline: '#E2E8F0',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Status -> pill color, matching the web app's nova-pill-* convention
// (nova-pill-success/pending/info/danger/neutral) exactly, so "Found"
// on the phone looks like "Active" does on the web dashboard.
export const statusTone = {
  success: { bg: colors.teal50, fg: colors.teal600, dot: colors.teal500 },
  pending: { bg: colors.amber50, fg: colors.amber600, dot: colors.amber500 },
  info: { bg: colors.blue50, fg: colors.blue600, dot: colors.blue500 },
  danger: { bg: colors.red50, fg: colors.red600, dot: colors.red500 },
  neutral: { bg: colors.slate100, fg: colors.slate700, dot: colors.slate400 },
} as const;

export type StatusTone = keyof typeof statusTone;
