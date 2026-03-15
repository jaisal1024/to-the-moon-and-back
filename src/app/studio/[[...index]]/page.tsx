'use client';

import { NextStudio } from 'next-sanity/studio';
import { StudioLayout, StudioProvider } from 'sanity';
import config from 'sanity.config';
import { createGlobalStyle } from 'styled-components';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GlobalStyle = createGlobalStyle(({ theme }: { theme: any }) => ({
  html: { backgroundColor: theme.sanity.color.base.bg },
}));

export default function StudioPage() {
  return (
    <>
      <NextStudio config={config}>
        <StudioProvider config={config}>
          <GlobalStyle theme={{} as any} />
          <StudioLayout />
        </StudioProvider>
      </NextStudio>
    </>
  );
}
