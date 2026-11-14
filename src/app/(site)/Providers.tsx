'use client';

import { StyledEngineProvider, ThemeProvider, useMediaQuery } from '@mui/material';
import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createAppTheme } from 'src/theme';

type ProvidersProps = {
  children: React.ReactNode;
};

const subscribe = (callback: () => void) => {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
};

const getThemeOverride = () => {
  const params = new URLSearchParams(window.location.search);
  const override = params.get('theme');
  if (override === 'light' || override === 'dark') return override;
  return null;
};

const getServerThemeOverride = () => null;

function ProvidersComponent({ children }: ProvidersProps) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const modeOverride = useSyncExternalStore(subscribe, getThemeOverride, getServerThemeOverride);
  const mode = modeOverride ?? (prefersDarkMode ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </StyledEngineProvider>
  );
}

export const Providers = React.memo(ProvidersComponent);
