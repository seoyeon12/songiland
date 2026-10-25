import { describe, expect, it } from 'vitest';
import { appHosts, appUrl, domains, getDomain } from './index';

describe('catalog', () => {
  it('keeps domain ids unique and URL-safe', () => {
    const ids = domains.map((domain) => domain.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('gives every domain a title, description and emoji icon', () => {
    for (const domain of domains) {
      expect(domain.title).not.toBe('');
      expect(domain.description).not.toBe('');
      expect(domain.emoji).not.toBe('');
    }
  });

  it('looks up the lotto game', () => {
    expect(getDomain('lotto')).toMatchObject({ kind: 'game' });
  });

  it('gives every app a host entry', () => {
    for (const domain of domains) {
      expect(appHosts).toHaveProperty(domain.id);
    }
    expect(appHosts).toHaveProperty('portal');
  });

  it('uses unique, DNS-safe subdomains', () => {
    const subdomains = Object.values(appHosts).map((host) => host.subdomain);
    expect(new Set(subdomains).size).toBe(subdomains.length);
    for (const subdomain of subdomains) {
      expect(subdomain).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(subdomain.length).toBeLessThanOrEqual(63);
    }
  });

  it('gives every app its own dev and preview port', () => {
    const ports = Object.values(appHosts).flatMap((host) => [
      host.devPort,
      host.previewPort,
    ]);
    expect(new Set(ports).size).toBe(ports.length);
  });

  it('builds production and local app URLs', () => {
    expect(appUrl('portal')).toBe('https://songiland.arosys.kr/');
    expect(appUrl('lotto')).toBe('https://lotto.arosys.kr/');
    expect(appUrl('lotto', 'local')).toBe('http://localhost:5174/');
    expect(appUrl('ko-en')).toBe('https://ko-en.arosys.kr/');
  });
});
