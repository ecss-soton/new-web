import React from 'react'

import { Page } from '../../../payload/payload-types'
import { Button } from '../../_components/Button'

import classes from './index.module.scss'

type Props = Extract<Page['layout'][0], { blockType: 'partyBlock' }>

export const PartyBlock: React.FC<Props> = props => {
  const { backgroundImage, floatingImage, heroTitle, heroText, decorationImage, buttons, sections } = props

  const bgUrl =
    backgroundImage && typeof backgroundImage !== 'string' && backgroundImage.url
      ? backgroundImage.url
      : ''

  const floatingUrl = floatingImage && typeof floatingImage !== 'string' && floatingImage.url
      ? floatingImage.url
      : ''
  return (
    <>
      {/* Fixed background */}
      <div className={classes.bgImage} style={{ backgroundImage: `url('${bgUrl}')` }} />

      {/* Floating decoration flowers */}
      <div className={classes.flowerLayer} aria-hidden="true">
        <img src={floatingUrl} alt="" className={`${classes.floatingFlower} ${classes.f1}`} />
        <img src={floatingUrl} alt="" className={`${classes.floatingFlower} ${classes.f2}`} />
        <img src={floatingUrl} alt="" className={`${classes.floatingFlower} ${classes.f3}`} />
        <img src={floatingUrl} alt="" className={`${classes.floatingFlower} ${classes.f4}`} />
        <img src={floatingUrl} alt="" className={`${classes.floatingFlower} ${classes.f5}`} />
        <img src={floatingUrl} alt="" className={`${classes.floatingFlower} ${classes.f6}`} />
      </div>

      <div className={classes.pageContainer}>
        {/* Hero title + decoration image */}
        <div className={classes.heroHeader}>
          <h1 className={classes.heroTitle}>{heroTitle}</h1>
          {decorationImage && typeof decorationImage !== 'string' && decorationImage.url && (
            <img
              src={decorationImage.url}
              alt={decorationImage.alt || ''}
              className={classes.decorationImage}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Hero text */}
        {heroText && <p className={classes.heroText}>{heroText}</p>}

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

        {/* Reorderable sections */}
        {sections &&
          sections.map((section, index) => {
            switch (section.sectionType) {
              // ── Big Image ────────────────────────────────────────────────
              case 'bigImage': {
                if (!section.bigImage || typeof section.bigImage === 'string') return null
                const img = section.bigImage
                return (
                  <div key={index} className={classes.bigImageContainer}>
                    <img
                      src={img.url || ''}
                      alt={img.alt || ''}
                      className={`${classes.placeholderImage} ${classes.aspect16x9}`}
                    />
                  </div>
                )
              }

              // ── Square Images Grid ────────────────────────────────────────
              case 'squareImages': {
                if (!section.squareImages || section.squareImages.length === 0) return null
                return (
                  <div key={index} className={classes.threeImages}>
                    {section.squareImages.map((sq, i) => {
                      if (typeof sq.image === 'string') return null
                      return (
                        <img
                          key={i}
                          src={sq.image?.url || ''}
                          alt={sq.image?.alt || ''}
                          className={`${classes.placeholderImage} ${classes.squareImage}`}
                        />
                      )
                    })}
                  </div>
                )
              }

              // ── Event Info Block ──────────────────────────────────────────
              case 'eventBlock': {
                const eb = section.eventBlock
                if (!eb) return null
                const bgColor = eb.backgroundColor || '#f6b84a'
                const reversed = eb.imagePosition === 'right'
                // Determine whether text is readable: pick black or white based on luminance
                // For simplicity we always set text to #000 (matches existing behaviour)
                return (
                  <div
                    key={index}
                    className={classes.eventBlockWrapper}
                    style={{ backgroundColor: bgColor }}
                  >
                    <div
                      className={`${classes.eventBlockInner}${reversed ? ` ${classes.reversed}` : ''}`}
                    >
                      {eb.image && typeof eb.image !== 'string' && eb.image.url && (
                        <img src={eb.image.url} alt={eb.title} className={classes.blockImage} />
                      )}
                      <div className={classes.blockContent}>
                        <h2 className={classes.titleText}>{eb.title}</h2>
                        <p>{eb.text}</p>
                      </div>
                    </div>
                  </div>
                )
              }

              // ── Centre Callout ────────────────────────────────────────────
              case 'centreCallout': {
                const cc = section.centreCallout
                if (!cc) return null
                const href =
                  cc.link?.type === 'reference' && typeof cc.link?.reference?.value !== 'string'
                    ? `/${cc.link?.reference?.value?.slug}`
                    : cc.link?.url
                return (
                  <div key={index} className={classes.centerBlock}>
                    <p>{cc.text}</p>
                    {cc.link && (
                      <Button
                        appearance={cc.link.appearance || 'primary'}
                        className={classes.redoverride}
                        label={cc.link.label}
                        href={href || '#'}
                        newTab={cc.link.newTab || undefined}
                      />
                    )}
                  </div>
                )
              }

              // ── FAQs ──────────────────────────────────────────────────────
              case 'faqs': {
                if (!section.faqs || section.faqs.length === 0) return null
                return (
                  <div key={index} className={classes.faqSection} id="faqs">
                    <h2 className={classes.faqTitle}>FAQS</h2>
                    {section.faqs.map((faq, i) => (
                      <details key={i} className={classes.faqItem}>
                        <summary className={classes.faqQuestion}>{faq.question}</summary>
                        <p className={classes.faqAnswer}>{faq.answer}</p>
                      </details>
                    ))}
                  </div>
                )
              }

              // ── Organisers ────────────────────────────────────────────────
              case 'organisers': {
                if (!section.organisers || section.organisers.length === 0) return null
                return (
                  <div key={index} className={classes.organisersSection}>
                    <h2>This event is organised by</h2>
                    <div className={classes.logosGrid}>
                      {section.organisers.map((org, i) => {
                        if (typeof org.logo === 'string') return null
                        return (
                          <img
                            key={i}
                            src={org.logo?.url || ''}
                            alt={org.logo?.alt || 'Organiser logo'}
                            className={classes.logoBox}
                            style={{ objectFit: 'contain' }}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              }

              default:
                return null
            }
          })}
      </div>
    </>
  )
}
