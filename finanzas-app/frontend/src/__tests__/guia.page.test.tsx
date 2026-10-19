import React from 'react';
import { render, screen } from '@testing-library/react';
import GuiaPage from '../pages/guia';

jest.mock('next/router', () => ({
  useRouter: () => ({ query: {}, replace: jest.fn() }),
}));
jest.mock('../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('GuiaPage', () => {
  it('embeds the guide inline instead of loading a static /guia.html', () => {
    render(<GuiaPage />);
    const frame = screen.getByTitle(/Guía de Módulos/i) as HTMLIFrameElement;
    expect(frame.getAttribute('src')).toBeNull();
    expect(frame.getAttribute('srcdoc')).toContain('<title>Mi Casa Pro — Guía de Módulos</title>');
  });
});
