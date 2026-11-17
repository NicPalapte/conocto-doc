import { afterEach, describe, expect, it, vi } from 'vitest';
import { surveyOn } from '../../src/lib/survey';

describe('surveyOn', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('ist ohne Schalter an', () => {
    vi.stubEnv('VITE_UMFRAGE', '');
    expect(surveyOn()).toBe(true);
  });

  it('ist mit VITE_UMFRAGE=0 aus', () => {
    vi.stubEnv('VITE_UMFRAGE', '0');
    expect(surveyOn()).toBe(false);
  });
});
