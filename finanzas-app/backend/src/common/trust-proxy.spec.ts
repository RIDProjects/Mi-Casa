import { configureTrustProxy } from './trust-proxy';

const makeApp = () => {
  const set = jest.fn();
  return { set, app: { getHttpAdapter: () => ({ getInstance: () => ({ set }) }) } as any };
};

describe('configureTrustProxy', () => {
  const original = process.env.TRUST_PROXY_HOPS;
  afterEach(() => {
    if (original === undefined) delete process.env.TRUST_PROXY_HOPS;
    else process.env.TRUST_PROXY_HOPS = original;
  });

  it('defaults to 1 hop', () => {
    delete process.env.TRUST_PROXY_HOPS;
    const { app, set } = makeApp();
    configureTrustProxy(app);
    expect(set).toHaveBeenCalledWith('trust proxy', 1);
  });

  it('reads hops from TRUST_PROXY_HOPS', () => {
    process.env.TRUST_PROXY_HOPS = '2';
    const { app, set } = makeApp();
    configureTrustProxy(app);
    expect(set).toHaveBeenCalledWith('trust proxy', 2);
  });

  it.each(['abc', '-1', ''])('falls back to 1 for invalid value %p', (value) => {
    process.env.TRUST_PROXY_HOPS = value;
    const { app, set } = makeApp();
    configureTrustProxy(app);
    expect(set).toHaveBeenCalledWith('trust proxy', 1);
  });

  it('allows 0 to disable proxy trust', () => {
    process.env.TRUST_PROXY_HOPS = '0';
    const { app, set } = makeApp();
    configureTrustProxy(app);
    expect(set).toHaveBeenCalledWith('trust proxy', 0);
  });
});
