import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

describe('app shell', () => {
  it('renders the top bar brand and footer disclaimer', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('CoreForge')).toBeInTheDocument();
    expect(screen.getByText(/Unofficial practice tool/)).toBeInTheDocument();
  });
});
