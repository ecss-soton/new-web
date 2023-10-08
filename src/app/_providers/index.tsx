'use client';

import React from 'react';

import { AuthProvider } from './Auth';
import { ThemeProvider } from './Theme';

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => (
  <ThemeProvider>
    <AuthProvider>{children}</AuthProvider>
  </ThemeProvider>
);
