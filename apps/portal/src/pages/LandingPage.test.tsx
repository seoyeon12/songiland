import { appUrl, domains, type DomainKind } from '@songiland/catalog';
import { render, screen } from '@testing-library/react';
import { LandingPage } from './LandingPage';

it('introduces Songiland and links every catalog domain to its subdomain', () => {
  render(<LandingPage linkTarget="production" />);
  expect(screen.getByRole('heading', { name: '송이랜드' })).toBeVisible();
  for (const domain of domains) {
    expect(
      screen.getByRole('link', { name: new RegExp(domain.title) }),
    ).toHaveAttribute('href', appUrl(domain.id));
  }
});

it('links the lotto show to lotto.arosys.kr in production', () => {
  render(<LandingPage linkTarget="production" />);
  expect(
    screen.getByRole('link', { name: /송이의 행운 로또쇼/ }),
  ).toHaveAttribute('href', 'https://lotto.arosys.kr/');
});

it('lists the ko-en converter under tools', () => {
  render(<LandingPage linkTarget="production" />);
  expect(screen.getByRole('heading', { name: '도구' })).toBeVisible();
  expect(
    screen.getByRole('link', { name: /한영타 변환기/ }),
  ).toHaveAttribute('href', 'https://ko-en.arosys.kr/');
});

it('links to local dev servers during development', () => {
  render(<LandingPage linkTarget="local" />);
  expect(
    screen.getByRole('link', { name: /송이의 행운 로또쇼/ }),
  ).toHaveAttribute('href', 'http://localhost:5174/');
});

it('leaves lotto-specific disclaimers to the lotto app', () => {
  render(<LandingPage />);
  expect(screen.queryByText(/복권/)).toBeNull();
});

it('groups domains by kind and hides empty sections', () => {
  render(<LandingPage />);
  const kinds = new Set<DomainKind>(domains.map((domain) => domain.kind));
  expect(screen.queryByRole('heading', { name: '게임' }) !== null).toBe(
    kinds.has('game'),
  );
  expect(screen.queryByRole('heading', { name: '도구' }) !== null).toBe(
    kinds.has('tool'),
  );
});
