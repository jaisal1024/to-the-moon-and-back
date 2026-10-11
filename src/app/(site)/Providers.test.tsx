import { useTheme } from '@mui/material';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, test, vi } from 'vitest';

import { Providers } from './Providers';

function ThemeMode() {
  const theme = useTheme();
  return <span data-testid="theme-mode">{theme.palette.mode}</span>;
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
  document.documentElement.removeAttribute('data-theme');
});

test('hydrates a dark theme override without mismatching server markup', async () => {
  window.history.replaceState(null, '', '/?theme=dark');
  document.documentElement.setAttribute('data-theme', 'dark');
  const element = (
    <Providers>
      <ThemeMode />
    </Providers>
  );
  const container = document.createElement('div');
  container.innerHTML = renderToString(element);
  document.body.appendChild(container);
  expect(container.textContent).toContain('light');
  const onRecoverableError = vi.fn();
  let root: ReturnType<typeof hydrateRoot>;
  await act(async () => {
    root = hydrateRoot(container, element, { onRecoverableError });
  });
  expect(container.querySelector('[data-testid="theme-mode"]')?.textContent).toBe('dark');
  expect(onRecoverableError).not.toHaveBeenCalled();
  await act(async () => root.unmount());
  container.remove();
});

test('updates the theme and CSS tokens after history navigation', () => {
  window.history.replaceState(null, '', '/?theme=dark');
  render(
    <Providers>
      <ThemeMode />
    </Providers>,
  );
  expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
  act(() => {
    window.history.replaceState(null, '', '/?theme=light');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
});
