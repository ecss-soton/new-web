import React from 'react'

import { Page } from '../../../payload/payload-types'
import { Button } from '../../_components/Button'

import classes from './index.module.scss'

type Props = Extract<Page['layout'][0], { blockType: 'summerPartyBlock' }>

export const SummerPartyBlock: React.FC<Props> = props => {
  const {
    heroTitle,
    heroText,
    heroImage,
    buttons,
    bigImage,
    squareImages,
    venueBlock,
    menuBlock,
    questionsBlock,
    onTheDayBlock,
    faqs,
    organisers,
  } = props

  return (
    <>
      <div className={classes.bgImage} />
      <div className={classes.flowerLayer} aria-hidden="true">
        {/* We can hardcode the floating flowers or make them a CSS pattern if needed, keeping them static for now to retain the vibe */}
        <img src="/media/flower.png" alt="" className={`${classes.floatingFlower} ${classes.f1}`} />
        <img src="/media/flower.png" alt="" className={`${classes.floatingFlower} ${classes.f2}`} />
        <img src="/media/flower.png" alt="" className={`${classes.floatingFlower} ${classes.f3}`} />
        <img src="/media/flower.png" alt="" className={`${classes.floatingFlower} ${classes.f4}`} />
        <img src="/media/flower.png" alt="" className={`${classes.floatingFlower} ${classes.f5}`} />
        <img src="/media/flower.png" alt="" className={`${classes.floatingFlower} ${classes.f6}`} />
      </div>

      <div className={classes.pageContainer}>
        {/* Title */}
        <h1 className={classes.heroTitle}>{heroTitle}</h1>

        {/* 1/3 Image on left, 2/3 Text on right */}
        <div className={classes.heroContent}>
          {typeof heroImage !== 'string' && (
            <img
              src={heroImage?.url || '/media/flower.png'}
              alt={heroImage?.alt || 'Hero'}
              className={classes.heroImage}
            />
          )}
          <div className={classes.rightText}>{heroText}</div>
        </div>

        {/* Buttons */}
        {buttons && buttons.length > 0 && (
          <div className={classes.buttonGroup}>
            {buttons.map((btn, index) => {
              if (!btn.link) return null
              const { link } = btn
              const href =
                link.type === 'reference' && typeof link.reference?.value !== 'string'
                  ? `/${link.reference?.value?.slug}`
                  : link.url

              return (
                <Button
                  key={index}
                  appearance={link.appearance || 'primary'}
                  className={classes.redoverride}
                  label={link.label}
                  href={href || '#'}
                  newTab={link.newTab || undefined}
                />
              )
            })}
          </div>
        )}

        {/* Full width (of container) Image */}
        {bigImage && typeof bigImage !== 'string' && (
          <div className={classes.bigImageContainer}>
            <img
              src={bigImage.url || ''}
              alt={bigImage.alt || ''}
              className={`${classes.placeholderImage} ${classes.aspect16x9}`}
            />
          </div>
        )}

        {/* 3 equal width square images */}
        {squareImages && squareImages.length > 0 && (
          <div className={classes.threeImages}>
            {squareImages.map((sq, index) => {
              if (typeof sq.image === 'string') return null
              return (
                <img
                  key={index}
                  src={sq.image?.url || ''}
                  alt={sq.image?.alt || ''}
                  className={`${classes.placeholderImage} ${classes.squareImage}`}
                />
              )
            })}
          </div>
        )}

        {/* The Venue */}
        {venueBlock && (
          <div className={classes.yellowBlockWrapper}>
            <div className={classes.yellowBlockInner}>
              {typeof venueBlock.image !== 'string' && (
                <img
                  src={venueBlock.image?.url || ''}
                  alt={venueBlock.title}
                  className={classes.blockImage}
                />
              )}
              <div className={classes.blockContent}>
                <h2 className={classes.titleText}>{venueBlock.title}</h2>
                <p>{venueBlock.text}</p>
              </div>
            </div>
          </div>
        )}

        {/* The Menu */}
        {menuBlock && (
          <div className={classes.yellowBlockWrapper} id="menu">
            <div className={`${classes.yellowBlockInner} ${classes.reversed}`}>
              {typeof menuBlock.image !== 'string' && (
                <img
                  src={menuBlock.image?.url || ''}
                  alt={menuBlock.title}
                  className={classes.blockImage}
                />
              )}
              <div className={classes.blockContent}>
                <h2 className={classes.titleText}>{menuBlock.title}</h2>
                <p>{menuBlock.text}</p>
              </div>
            </div>
          </div>
        )}

        {/* Centered Block */}
        {questionsBlock && (
          <div className={classes.centerBlock}>
            <p>{questionsBlock.text}</p>
            {questionsBlock.link && (
              <Button
                appearance={questionsBlock.link.appearance || 'primary'}
                className={classes.redoverride}
                label={questionsBlock.link.label}
                href={questionsBlock.link.type === 'custom' ? questionsBlock.link.url || '#' : '#'}
              />
            )}
          </div>
        )}

        {/* On the Day */}
        {onTheDayBlock && (
          <div className={classes.yellowBlockWrapper}>
            <div className={classes.yellowBlockInner}>
              {typeof onTheDayBlock.image !== 'string' && (
                <img
                  src={onTheDayBlock.image?.url || ''}
                  alt={onTheDayBlock.title}
                  className={classes.blockImage}
                />
              )}
              <div className={classes.blockContent}>
                <h2 className={classes.titleText}>{onTheDayBlock.title}</h2>
                <p>{onTheDayBlock.text}</p>
              </div>
            </div>
          </div>
        )}

        {/* FAQS */}
        {faqs && faqs.length > 0 && (
          <div className={classes.faqSection} id="faqs">
            <h2 className={classes.faqTitle}>FAQS</h2>
            {faqs.map((faq, index) => (
              <details key={index} className={classes.faqItem}>
                <summary className={classes.faqQuestion}>{faq.question}</summary>
                <p className={classes.faqAnswer}>{faq.answer}</p>
              </details>
            ))}
          </div>
        )}

        {/* Organisers */}
        {organisers && organisers.length > 0 && (
          <div className={classes.organisersSection}>
            <h2>This event is organised by</h2>
            <div className={classes.logosGrid}>
              {organisers.map((org, index) => {
                if (typeof org.logo === 'string') return null
                return (
                  <img
                    key={index}
                    src={org.logo?.url || ''}
                    alt={org.logo?.alt || 'Organiser logo'}
                    className={classes.logoBox}
                    style={{ objectFit: 'contain' }}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
