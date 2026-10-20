import {
  domainBase,
  domains,
  getDomain,
  type DomainKind,
} from '@songiland/catalog';
import { render, screen } from '@testing-library/react';
import { LandingPage } from './LandingPage';

it('introduces Songiland and links every catalog domain to its app path', () => {
  render(<LandingPage />);
  expect(screen.getByRole('heading', { name: '송이랜드' })).toBeVisible();
  for (const domain of domains) {
    expect(
      screen.getByRole('link', { name: new RegExp(domain.title) }),
    ).toHaveAttribute('href', domainBase(domain));
  }
});

it('links the lotto show under /games', () => {
  render(<LandingPage />);
  const lotto = getDomain('lotto');
  expect(screen.getByRole('link', { name: new RegExp(lotto.title) })).toHaveAttribute(
    'href',
    '/games/lotto/',
  );
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
