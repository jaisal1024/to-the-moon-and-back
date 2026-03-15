'use client';

import { ApolloProvider } from '@apollo/client/react';
import { StyledEngineProvider, ThemeProvider } from '@mui/material';
import client from 'apollo-client';
import { theme } from 'src/theme';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
