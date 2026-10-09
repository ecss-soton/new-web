import {
  Bungee,
  Inter,
  Permanent_Marker,
  Playfair_Display_SC,
  Rubik_Mono_One,
  Source_Serif_4,
} from 'next/font/google'

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

export const playfair = Playfair_Display_SC({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal'],
})

export const sourceSerif = Source_Serif_4({
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
