import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import Footer from './Footer';

test('renders Footer with social and site map links', () => {
  render(<Footer />);

  expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  expect(screen.getByText('GitHub')).toBeInTheDocument();
  expect(screen.getByText('hi@jaisal.xyz')).toBeInTheDocument();

  expect(screen.getByText('Photography')).toBeInTheDocument();
  expect(screen.getByText('About')).toBeInTheDocument();

  expect(screen.getByText(/© Jaisal Friedman/)).toBeInTheDocument();
});
