import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import LoadingSpinner from './LoadingSpinner';

test('renders loading spinner', () => {
  render(<LoadingSpinner />);
  const progressBar = screen.getByRole('progressbar');
  expect(progressBar).toBeInTheDocument();
});
