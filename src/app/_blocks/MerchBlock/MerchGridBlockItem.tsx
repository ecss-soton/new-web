'use client'

import React, { useState } from 'react'

import { Media, Merch } from '../../../payload/payload-types'
import { Button } from '../../_components/Button'
import { Media as MediaComponent } from '../../_components/Media'

import classes from './index.module.scss'

type Props = {
  items: (string | Merch)[]
}

export default function MerchGridBlockItem({ items }: Props) {
  const merchItems = items.filter((item): item is Merch => typeof item !== 'string')

  // Track the selected colour index for each item ID
  const [selectedColourIndices, setSelectedColourIndices] = useState<Record<string, number>>(
    merchItems.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {}),
  )

  const handleColourClick = (e: React.MouseEvent, itemId: string, index: number) => {
    setSelectedColourIndices(prev => ({ ...prev, [itemId]: index }))
  }

  return (
    <div className={classes.merchGrid}>
      {merchItems.map(item => {
        const activeColourIndex = selectedColourIndices[item.id] ?? 0
        const activeColour = item.colours?.[activeColourIndex]

        return (
          <article key={item.id} className={classes.merchCard}>
            <div className={classes.merchHeader}>
              <div className={classes.merchImageWrapper}>
                {activeColour?.image && typeof activeColour.image !== 'string' ? (
                  <MediaComponent
                    resource={activeColour.image as Media}
                    imgClassName={classes.merchImage}
                    alt={`${item.title} in ${activeColour.name}`}
                  />
                ) : (
                  <div className={classes.merchImagePlaceholder} aria-hidden="true" />
                )}
              </div>
              <span className={classes.merchTitle}>{item.title}</span>
            </div>

            <div className={`${classes.merchPanel} ${classes.merchPanelOpen}`}>
              <div className={classes.merchContent}>
                {item.description && (
                  <div className={classes.descriptionContainer}>
                    <p>{item.description}</p>
                  </div>
                )}

                <div className={classes.colorSection}>
                  <p className={classes.colorLabel}>
                    <strong>Selected Option:</strong> {activeColour?.name || 'Main'}{' '}
                  </p>

                  {item.colours && item.colours.length > 1 && (
                    <div className={classes.colorSwatches}>
                      {item.colours.map((colour, index) => (
                        <button
                          key={colour.name}
                          type="button"
                          className={`${classes.colorSwatch} ${
                            index === activeColourIndex ? classes.colorSwatchActive : ''
                          }`}
                          title={`Select ${colour.name}`}
                          onClick={e => handleColourClick(e, item.id, index)}
                        >
                          {colour.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={classes.buttonWrapper}>
                  <Button
                    appearance="primary"
                    className={classes.primaryButton}
                    label="Get on BoxOffice"
                    href={item.link}
                  />
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
