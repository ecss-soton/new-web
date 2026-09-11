'use client'

import React, { createContext, useContext } from 'react'

interface JumpstartSettingsContextType {
  jumpstartEnabled: boolean
  jumpstartHeading: string
}

const JumpstartSettingsContext = createContext<JumpstartSettingsContextType>({
  jumpstartEnabled: false,
  jumpstartHeading: 'Jumpstart',
})

export const useJumpstartSettings = (): JumpstartSettingsContextType =>
  useContext(JumpstartSettingsContext)

export const JumpstartSettingsProvider: React.FC<{
  jumpstartEnabled: boolean
  jumpstartHeading: string
  children: React.ReactNode
}> = ({ jumpstartEnabled, jumpstartHeading, children }) => {
  return (
    <JumpstartSettingsContext.Provider value={{ jumpstartEnabled, jumpstartHeading }}>
      {children}
    </JumpstartSettingsContext.Provider>
  )
}
