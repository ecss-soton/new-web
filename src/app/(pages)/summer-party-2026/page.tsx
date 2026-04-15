import React from 'react'
import { Metadata } from 'next'

import { Button } from '../../_components/Button'
import { mergeOpenGraph } from '../../_utilities/mergeOpenGraph'

import classes from './index.module.scss'

export default function SummerParty() {
  return (
    <>
      <div className={classes.bgImage} />
      <div className={classes.flowerLayer} aria-hidden="true">
        <img src="/media/flower.png" alt="" className={`${classes.floatingFlower} ${classes.f1}`} />
        <img src="/media/flower.png" alt="" className={`${classes.floatingFlower} ${classes.f2}`} />
        <img src="/media/flower.png" alt="" className={`${classes.floatingFlower} ${classes.f3}`} />
        <img src="/media/flower.png" alt="" className={`${classes.floatingFlower} ${classes.f4}`} />
        <img src="/media/flower.png" alt="" className={`${classes.floatingFlower} ${classes.f5}`} />
        <img src="/media/flower.png" alt="" className={`${classes.floatingFlower} ${classes.f6}`} />
      </div>
      <div className={classes.pageContainer}>
        {/* Title */}
        <h1 className={classes.heroTitle}>See you on the 5th of June at 7pm!</h1>

        {/* 1/3 Image on left, 2/3 Text on right */}
        <div className={classes.heroContent}>
          <img src="/media/flower.png" alt="Flower" className={classes.heroImage} />
          <div className={classes.rightText}>
            Celebrate the end of Exams and the Academic year with a great Summer Party, situated
            right in the City Centre. The venue is close to key transport hubs, and we’ve prepared
            various food and drinks (halal, vegan, veggie available)
          </div>
        </div>

        {/* 3 Buttons standard primary */}
        <div className={classes.buttonGroup}>
          <Button
            appearance="primary"
            label="Get a Ticket"
            href="https://boxoffice.susu.org/view/ecs-summer-party-ticket/5b3692dc496fed6e74989435dd910b42"
          />
          <Button appearance="primary" label="FAQs" href="#faqs" />
          <Button appearance="primary" label="See the Menu" href="#menu" />
        </div>

        {/* Full width (of container), leaving about 20% margin on either side Image */}
        <div className={classes.bigImageContainer}>
          <div className={`${classes.placeholderImage} ${classes.aspect16x9}`} />
        </div>

        {/* 3 equal width square images */}
        <div className={classes.threeImages}>
          <div className={`${classes.placeholderImage} ${classes.squareImage}`} />
          <div className={`${classes.placeholderImage} ${classes.squareImage}`} />
          <div className={`${classes.placeholderImage} ${classes.squareImage}`} />
        </div>

        {/* The Venue - Yellow Background Block */}
        <div className={classes.yellowBlockWrapper}>
          <div className={classes.yellowBlockInner}>
            <img src="/media/papillon.webp" alt="Papillon" className={classes.blockImage} />
            <div className={classes.blockContent}>
              <h2 className={classes.titleText}>The Venue</h2>
              <p>
                The venue is situated in the city centre - it is close to the Centrail Station and
                various UniLink and Bluebus bus stops. Please note that there is very limited
                parking at the venue.
              </p>
            </div>
          </div>
        </div>

        {/* The Menu - The same, horizontally reversed */}
        <div className={classes.yellowBlockWrapper} id="menu">
          <div className={`${classes.yellowBlockInner} ${classes.reversed}`}>
            <img src="/media/food.webp" alt="Menu" className={classes.blockImage} />
            <div className={classes.blockContent}>
              <h2 className={classes.titleText}>The Menu</h2>
              <p>
                We’ve picked a fine selection of the best BBQ food - burgers, hot dogs and other
                small bites available. Food will be clearly labeled, and utensils and tongues
                provided.
              </p>
            </div>
          </div>
        </div>

        {/* Centered, 1/3 column */}
        <div className={classes.centerBlock}>
          <p>Questions about allergies? Send an email!</p>
          <Button appearance="primary" label="Send an email!" href="mailto:example@example.com" />
        </div>

        {/* On the Day - Another yellow background with image */}
        <div className={classes.yellowBlockWrapper}>
          <div className={classes.yellowBlockInner}>
            <img src="/media/summerparty.webp" alt="Party" className={classes.blockImage} />
            <div className={classes.blockContent}>
              <h2 className={classes.titleText}>On the Day</h2>
              <p>
                We have everything prepared for the day - professional photography through the
                night, a free photobooth to memorise the day, and our very own in-house DJ - DJ
                Emmer!
              </p>
            </div>
          </div>
        </div>

        {/* FAQS */}
        <div className={classes.faqSection} id="faqs">
          <h2 className={classes.faqTitle}>FAQS</h2>

          <details className={classes.faqItem}>
            <summary className={classes.faqQuestion}>Where do I get a ticket?</summary>
            <p className={classes.faqAnswer}>Follow the link to pick your ticket!</p>
          </details>

          <details className={classes.faqItem}>
            <summary className={classes.faqQuestion}>When/where is the event?</summary>
            <p className={classes.faqAnswer}>The event is on 5th June from 19:00.</p>
          </details>

          <details className={classes.faqItem}>
            <summary className={classes.faqQuestion}>
              I have a nuts/fish/any other allergy and I am worried about the food - what do I do?
            </summary>
            <p className={classes.faqAnswer}>
              If you have any worries about the contents of the food or just want to be sure, just
              send us an email!
            </p>
          </details>

          <details className={classes.faqItem}>
            <summary className={classes.faqQuestion}>
              I have a partner who wants to attend the event, what do I do?
            </summary>
            <p className={classes.faqAnswer}>
              You can get them a ticket from the sales page, or ask them to get their own.
            </p>
          </details>
        </div>

        {/* Organised by */}
        <div className={classes.organisersSection}>
          <h2>This event is organised by</h2>
          <div className={classes.logosGrid}>
            <div className={classes.logoBox} />
            <div className={classes.logoBox} />
            <div className={classes.logoBox} />
          </div>
        </div>
      </div>
    </>
  )
}

export const metadata: Metadata = {
  title: 'Summer Party 2026',
  description: 'Celebrate the end of Exams and the Academic year with a great Summer Party',
  openGraph: mergeOpenGraph({
    title: 'Summer Party 2026',
    url: '/summer-party-2026',
  }),
}
