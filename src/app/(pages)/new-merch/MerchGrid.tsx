'use client'

import React, { useState } from 'react'
import Image from 'next/image'

import { Button } from '../../_components/Button'

import classes from './index.module.scss'

type MerchColor = {
  name: string
  image: string
}

export type MerchItem = {
  id: string
  title: string
  description: string
  colors: MerchColor[]
  link: string
}

type Props = {
  merchItems: MerchItem[]
}

export default function MerchGrid({ merchItems }: Props) {
  const [activeId, setActiveId] = useState<string | null>(merchItems[0]?.id ?? null)

  // Track the selected color index for each item ID
  const [selectedColorIndices, setSelectedColorIndices] = useState<Record<string, number>>(
    merchItems.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {}),
  )

  const handleColorClick = (e: React.MouseEvent, itemId: string, index: number) => {
    e.stopPropagation() // Prevent accordion toggle
    setSelectedColorIndices(prev => ({ ...prev, [itemId]: index }))
  }

  return (
    <div className={classes.merchGrid}>
      {merchItems.map(item => {
        const isOpen = activeId === item.id
        const activeColorIndex = selectedColorIndices[item.id] ?? 0
        const activeColor = item.colors[activeColorIndex]

        return (
          <article key={item.id} className={classes.merchCard}>
            <button
              type="button"
              className={classes.merchHeader}
              onClick={() => setActiveId(isOpen ? null : item.id)}
              aria-expanded={isOpen}
            >
              <div className={classes.merchImageWrapper}>
                {activeColor?.image ? (
                  <img
                    src={activeColor.image}
                    alt={`${item.title} in ${activeColor.name}`}
                    className={classes.merchImage}
                  />
                ) : (
                  <div className={classes.merchImagePlaceholder} aria-hidden="true" />
                )}
              </div>
              <span className={classes.merchTitle}>{item.title}</span>
            </button>

            <div className={`${classes.merchPanel} ${isOpen ? classes.merchPanelOpen : ''}`}>
              <div className={classes.merchContent}>
                <p>{item.description}</p>

                <div className={classes.colorSection}>
                  <p className={classes.colorLabel}>
                    <strong>Selected Color:</strong> {activeColor?.name || 'None'}
                  </p>

                  {item.colors.length > 1 && (
                    <div className={classes.colorSwatches}>
                      {item.colors.map((color, index) => (
                        <button
                          key={color.name}
                          type="button"
                          className={`${classes.colorSwatch} ${
                            index === activeColorIndex ? classes.colorSwatchActive : ''
                          }`}
                          title={`Select ${color.name}`}
                          onClick={e => handleColorClick(e, item.id, index)}
                        >
                          {/* Use background images or names as swatches. Text is safer */}
                          {color.name}
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
