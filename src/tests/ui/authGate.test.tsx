import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';
import { useAuth } from '../../cloud/authStore';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

// App renders BrowserRouter-free content; the gate depends on auth state.
describe('auth gate', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.removeItem('coreforge-e2e-bypass');
  });

  it('redirects signed-out visitors to the landing page — deep URLs included', async () => {
    useAuth.setState({ user: null, initializing: false });
    renderAt('/analytics');
    expect(
      await screen.findByRole('heading', { name: /the core module tests how you think/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('lets signed-in users through to the app', async () => {
    useAuth.setState({
      user: { id: 'u1', email: 'test@example.com', displayName: 'Test', avatarUrl: null },
      initializing: false,
    });
    renderAt('/');
    expect(await screen.findByText(/^practice the dmat$/i)).toBeInTheDocument();
  });

  it('redirects signed-in users away from the landing page', async () => {
    useAuth.setState({
      user: { id: 'u1', email: 'test@example.com', displayName: 'Test', avatarUrl: null },
      initializing: false,
    });
    renderAt('/welcome');
    expect(await screen.findByText(/^practice the dmat$/i)).toBeInTheDocument();
  });
});
