import { describe, expect, it } from 'vitest';
import {
  appPorts,
  domainBase,
  domainPath,
  domains,
  getDomain,
} from './index';

describe('catalog', () => {
  it('maps games and tools to their URL segments', () => {
    expect(domainPath({ id: 'lotto', kind: 'game' })).toBe('/games/lotto');
    expect(domainPath({ id: 'ko-en', kind: 'tool' })).toBe('/tools/ko-en');
    expect(domainBase({ id: 'lotto', kind: 'game' })).toBe('/games/lotto/');
  });

  it('keeps domain ids unique and URL-safe', () => {
    const ids = domains.map((domain) => domain.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('looks up the lotto game', () => {
    expect(getDomain('lotto')).toMatchObject({ kind: 'game' });
  });

  it('gives every app its own dev and preview port', () => {
    for (const domain of domains) {
      expect(appPorts).toHaveProperty(domain.id);
    }
    const ports = Object.values(appPorts).flatMap(({ dev, preview }) => [
      dev,
      preview,
    ]);
    expect(new Set(ports).size).toBe(ports.length);
  });
});
