import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingBanner } from '../OnboardingBanner';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: any) => <>{children}</> }));

const KEY = 'mi-casa-onboarding-hidden';

describe('OnboardingBanner', () => {
  beforeEach(() => localStorage.clear());

  it('shows the steps while some are pending', async () => {
    render(<OnboardingBanner ready hasBudget hasTransactions={false} hasGoals={false} />);
    expect(await screen.findByLabelText('Primeros pasos')).toBeInTheDocument();
  });

  it('renders nothing until the data is ready (no flash of pending steps)', async () => {
    const { container } = render(<OnboardingBanner ready={false} hasBudget={false} hasTransactions={false} hasGoals={false} />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('never shows when every step is already done, and remembers it', async () => {
    const { container } = render(<OnboardingBanner ready hasBudget hasTransactions hasGoals />);
    await waitFor(() => expect(localStorage.getItem(KEY)).toBe('1'));
    expect(container).toBeEmptyDOMElement();
  });

  it('stays hidden on later visits even before the data loads', async () => {
    localStorage.setItem(KEY, '1');
    const { container } = render(<OnboardingBanner ready hasBudget={false} hasTransactions={false} hasGoals={false} />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('remembers a manual dismissal', async () => {
    const user = userEvent.setup();
    render(<OnboardingBanner ready hasBudget hasTransactions={false} hasGoals={false} />);
    await user.click(await screen.findByLabelText('Ocultar primeros pasos'));
    expect(screen.queryByLabelText('Primeros pasos')).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('1');
  });
});
