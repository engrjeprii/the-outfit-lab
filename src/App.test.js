import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the outfit lab storefront', () => {
  render(<App />);
  const titleElements = screen.getAllByText(/The Outfit Lab/i);
  expect(titleElements.length).toBeGreaterThan(0);
});
