import localFont from 'next/font/local'

/**
 * Fonts are self-hosted (Latin subset) instead of loaded through
 * `next/font/google`.
 *
 * `next/font/google` downloads the stylesheet from fonts.googleapis.com at
 * build time. Google sometimes answers with extensionless
 * `https://fonts.gstatic.com/l/font?kit=...` URLs, which the Next 14.2 Google
 * loader cannot handle — it throws
 * `TypeError: Cannot read properties of null (reading '1')` and fails the build
 * (intermittently, depending on what Google returns for the build machine).
 * Self-hosting removes that network dependency entirely.
 *
 * The font files and their sources/licences are documented in
 * ./fonts/README.md. Only the Latin subset is vendored; other scripts fall
 * back to system fonts.
 */

export const inter = localFont({
  src: [{ path: './fonts/inter.woff2', weight: '100 900', style: 'normal' }],
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

export const newsreader = localFont({
  src: [
    { path: './fonts/newsreader.woff2', weight: '200 800', style: 'normal' },
    { path: './fonts/newsreader-italic.woff2', weight: '200 800', style: 'italic' },
  ],
  display: 'swap',
  fallback: ['Georgia', 'serif'],
  adjustFontFallback: 'Times New Roman',
})

export const spectral = localFont({
  src: [
    { path: './fonts/spectral-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/spectral-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/spectral-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/spectral-600-italic.woff2', weight: '600', style: 'italic' },
  ],
  display: 'swap',
  fallback: ['Georgia', 'serif'],
  adjustFontFallback: 'Times New Roman',
})

export const permanentMarker = localFont({
  src: [{ path: './fonts/permanent-marker-400.woff2', weight: '400', style: 'normal' }],
  display: 'swap',
})

export const bungee = localFont({
  src: [{ path: './fonts/bungee-400.woff2', weight: '400', style: 'normal' }],
  display: 'swap',
})

export const rubikMono = localFont({
  src: [{ path: './fonts/rubik-mono-one-400.woff2', weight: '400', style: 'normal' }],
  display: 'swap',
})

export const poppins = localFont({
  src: [
    { path: './fonts/poppins-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/poppins-700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: 'Arial',
})
