import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('renders the default message when no message prop is given', () => {
    render(<ErrorState />);
    expect(screen.getByText('No se pudo cargar esta sección')).toBeInTheDocument();
  });

  it('renders a custom message passed via props', () => {
    render(<ErrorState message="No se pudieron cargar las transacciones" />);
    expect(screen.getByText('No se pudieron cargar las transacciones')).toBeInTheDocument();
  });

  it('does not render a retry button when onRetry is not provided', () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a retry button and calls onRetry when clicked', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /reintentar/i });
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
