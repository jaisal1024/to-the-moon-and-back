import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import About from './About';

test('renders the intro, statements and links', () => {
  render(<About collections={[]} />);

  expect(screen.getByTestId('about-heading')).toHaveTextContent("Hi, I'm Jaisal.");
  expect(screen.getByText('engineering manager')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pull the lever' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Counsel Health' })).toHaveAttribute(
    'href',
    'https://www.counselhealth.com/',
  );
  expect(screen.getByRole('link', { name: 'my LinkedIn' })).toHaveAttribute(
    'href',
    'https://www.linkedin.com/in/jaisalfriedman/',
  );
  expect(screen.queryByText('Collections')).not.toBeInTheDocument();
});

test('says what to reach out about and what not to', () => {
  render(<About collections={[]} />);

  expect(screen.getByText('Reach out about')).toBeInTheDocument();
  for (const topic of ['advising', 'angel investing', 'open source contributing']) {
    expect(screen.getByText(topic)).toBeInTheDocument();
  }
  expect(screen.queryByText('new product launches')).not.toBeInTheDocument();
  expect(screen.getByText("Please don't reach out about")).toBeInTheDocument();
  for (const topic of ['recruiting', 'spam', 'NFTs']) {
    expect(screen.getByText(topic)).toBeInTheDocument();
  }
  expect(screen.getByText("I'm not open to new opportunities.")).toBeInTheDocument();
});

test('lists collections in order with links', () => {
  render(
    <About
      collections={[
        { title: 'Cuba', href: '/collections/cuba-a' },
        { title: 'Nica 1', href: '/collections/nica-1' },
      ]}
    />,
  );

  const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/collections/'));
  expect(links.map((a) => a.getAttribute('href'))).toEqual(['/collections/cuba-a', '/collections/nica-1']);
  expect(screen.getByText('01')).toBeInTheDocument();
  expect(screen.getByText('Nica 1')).toBeInTheDocument();
});
