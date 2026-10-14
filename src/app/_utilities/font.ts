import {
  Bungee,
  Inter,
  Newsreader,
  Permanent_Marker,
  Rubik_Mono_One,
  Spectral,
} from 'next/font/google'

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

export const newsreader = Newsreader({
  subsets: ['latin'],
  weight: 'variable',
  style: ['normal', 'italic'],
})

export const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
})

export const permanentMarker = Permanent_Marker({
  subsets: ['latin'],
  weight: '400',
})

export const bungee = Bungee({
  subsets: ['latin'],
  weight: '400',
})

export const rubikMono = Rubik_Mono_One({
  subsets: ['latin'],
  weight: '400',
})
