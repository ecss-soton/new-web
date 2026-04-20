import React from 'react'
import { Metadata } from 'next'

import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'
import MerchGrid, { MerchItem } from './MerchGrid'

import classes from './index.module.scss'

export default function Merch() {
  const merchItems: MerchItem[] = [
    {
      id: 'graphic-tshirt',
      title: 'Graphic T-shirt',
      description:
        'Want a designer T-Shirt to represent the best society on campus? This is for you!',
      colors: [
        { name: 'Natural', image: '/media/merch/ECSS Natural T-Shirt.jpg' },
        ,
        { name: 'Off-White', image: '/media/merch/ECSS Off-White T-Shirt.jpg' },

        { name: 'Heather Navy', image: '/media/merch/ECSS Heather Navy T-Shirt.jpg' },
      ],
      link: 'https://boxoffice.susu.org/view/-ecss-merch-graphic-t-shirt/29ce4fff696f62fd0eab17a8201fbb86',
    },
    {
      id: 'graphic-hoodie',
      title: 'Graphic Hoodie',
      description:
        'Want a designer hoodie to represent the best society on campus? This is for you!',
      colors: [
        { name: 'Airforce Blue', image: '/media/merch/ECSS Airforce Blue Hoodie.jpg' },

        { name: 'Vanilla Milkshake', image: '/media/merch/ECSS Vanilla Milkshake Hoodie.jpg' },

        { name: 'Natural Stone', image: '/media/merch/ECSS Natural Stone Hoodie.jpg' },
      ],
      link: 'https://boxoffice.susu.org/view/ecss-merch-graphic-hoodie/da79f3137a488e087f438ceee4398eff',
    },
    {
      id: 'simple-tshirt',
      title: 'Simple T-shirt',
      description: 'Want something minimalistic? Get our clean, simple branded T-shirt.',
      colors: [
        {
          name: 'Natural',
          image: '/media/merch/ECSS Natural T-Shirt with Black Logo.jpg',
        },
        {
          name: 'Daisy',
          image: '/media/merch/ECSS Daisy T-Shirt with Black Logo.jpg',
        },

        { name: 'Black', image: '/media/merch/ECSS Black T-Shirt.jpg' },
        { name: 'Graphite Heather', image: '/media/merch/ECSS Graphite Heather T-Shirt.jpg' },
        { name: 'Cardinal Red', image: '/media/merch/ECSS Cardinal Red T-Shirt.jpg' },
      ],
      link: 'https://boxoffice.susu.org/view/ecss-merch-logo-t-shirt/139a0c9fa37014c2f1ea70e40620f0e1',
    },
    {
      id: 'custom-hoodie',
      title: 'Logo + Custom back Hoodie',
      description:
        'Do you want to personalise your hoodie? Add your name to the back of our classic logo hoodie!',
      colors: [
        { name: 'Red Hot Chilli', image: '/media/merch/ECSS Red Hot Chilli Hoodie.jpg' },
        { name: 'Storm Grey', image: '/media/merch/ECSS Storm Grey Hoodie.jpg' },
        {
          name: 'Mustard',
          image: '/media/merch/ECSS Mustard Hoodie with Black Logo.jpg',
        },

        { name: 'Moondust Grey', image: '/media/merch/ECSS Moondust Grey Hoodie.jpg' },

        { name: 'Jet Black', image: '/media/merch/ECSS Jet Black Hoodie.jpg' },
      ],
      link: 'https://boxoffice.susu.org/view/ecss-merch-logo-custom-back-hoodie/2157eaaf20c8b120a3fc851aa4c4c09f',
    },
    {
      id: 'q-zip',
      title: 'Q-zip',
      description:
        'A classic quarter-zip for a smart-casual society look. (Email us if interested!)',
      colors: [{ name: 'Black and Red', image: '/media/merch/QZ.png' }],
      link: 'mailto:society@ecs.soton.ac.uk',
    },
  ]

  return (
    <div className={classes.pageContainer}>
      <h1 className={classes.heroTitle}>ECSS Merch is BACK</h1>

      <div className={classes.heroContent}>
        <p>ECSS merch is OFFICIALLY HERE - you can grab yours now from our Box Office!</p>

        <p>
          <strong>Get your merch now - it won't last long 👀</strong>
        </p>
      </div>

      <MerchGrid merchItems={merchItems} />

      <div className={classes.alertBox}>
        <p>
          <strong>⚠️ Important:</strong> To pick the colour/option you want, you will be emailed a
          forms link to fill in - this will be done as soon as possible, but allow some leeway - we
          are students in the middle of revision season. If you don't get the link within 7 days,
          send us an email at <a href="mailto:society@ecs.soton.ac.uk">society@ecs.soton.ac.uk</a>
        </p>
        <p>
          <strong>⚠️ Important 2:</strong> If you are interested in a Q-zip, please get in touch at{' '}
          <a href="mailto:society@ecs.soton.ac.uk">society@ecs.soton.ac.uk</a>
        </p>
        <p>
          <strong>Merch sale will end on Sunday, 3 May 2026 at 20:00</strong>
        </p>
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  title: 'ECSS Merch',
  description: 'ECSS merch is OFFICIALLY HERE - you can grab yours now from our BoxOffice!',
  openGraph: mergeOpenGraph({
    title: 'ECSS Merch',
    url: '/merch',
  }),
}
