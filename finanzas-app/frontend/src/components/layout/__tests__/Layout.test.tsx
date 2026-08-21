import React from 'react';
import { render, screen } from '@testing-library/react';
import Layout from '../Layout';
import { useAuthStore } from '../../../store/auth.store';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../../store/auth.store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

// Sidebar pulls in theme store, permissions, navigation, etc. It is not the
// subject of this test, so it's replaced with a lightweight stub.
jest.mock('../Sidebar', () => {
  return function MockSidebar() {
    return <div data-testid="sidebar">Sidebar</div>;
  };
});

const mockUseAuthStore = useAuthStore as unknown as jest.Mock;
const mockUseRouter = useRouter as unknown as jest.Mock;

function setup({
  isAuthenticated,
  isAdmin,
  pathname,
}: {
  isAuthenticated: boolean;
  isAdmin: boolean;
  pathname: string;
}) {
  const replace = jest.fn();

  mockUseRouter.mockReturnValue({ pathname, replace });
  mockUseAuthStore.mockReturnValue({
    isAuthenticated,
    isAdminGlobal: () => isAdmin,
  });

  return { replace };
}

describe('Layout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /dashboard and does not render admin content for a non-admin user on an /admin route', () => {
    const { replace } = setup({ isAuthenticated: true, isAdmin: false, pathname: '/admin/users' });

    render(
      <Layout>
        <div data-testid="admin-content">Admin Users Page</div>
      </Layout>,
    );

    expect(replace).toHaveBeenCalledWith('/dashboard');
    expect(toast.error).toHaveBeenCalled();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    expect(screen.getByText('Redirigiendo...')).toBeInTheDocument();
  });

  it('renders normally for an admin user on an /admin route', () => {
    const { replace } = setup({ isAuthenticated: true, isAdmin: true, pathname: '/admin/users' });

    render(
      <Layout>
        <div data-testid="admin-content">Admin Users Page</div>
      </Layout>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('redirects to /login when the user is not authenticated', () => {
    const { replace } = setup({ isAuthenticated: false, isAdmin: false, pathname: '/dashboard' });

    render(
      <Layout>
        <div data-testid="content">Dashboard Page</div>
      </Layout>,
    );

    expect(replace).toHaveBeenCalledWith('/login');
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    expect(screen.getByText('Redirigiendo...')).toBeInTheDocument();
  });

  it('renders normally for an authenticated non-admin user on a non-admin route', () => {
    const { replace } = setup({ isAuthenticated: true, isAdmin: false, pathname: '/dashboard' });

    render(
      <Layout>
        <div data-testid="content">Dashboard Page</div>
      </Layout>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
