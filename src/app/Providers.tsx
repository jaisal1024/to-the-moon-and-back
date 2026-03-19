'use client';

import { ApolloProvider } from '@apollo/client/react';
import { StyledEngineProvider, ThemeProvider, useMediaQuery } from '@mui/material';
import client from 'apollo-client';
import React, { useMemo, useState } from 'react';
import { createAppTheme } from 'src/theme';

type ProvidersProps = {
  children: React.ReactNode;
};

function ProvidersComponent({ children }: ProvidersProps) {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [modeOverride] = useState<'light' | 'dark' | null>(() => {
    if (typeof window === 'undefined') return null;

    const params = new URLSearchParams(window.location.search);
    const override = params.get('theme');

    if (override === 'light' || override === 'dark') return override;

    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;

    return null;
  });

  const theme = useMemo(
    () => createAppTheme(modeOverride ?? (prefersDarkMode ? 'dark' : 'light')),
    [modeOverride, prefersDarkMode],
  );

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export const Providers = React.memo(ProvidersComponent);
