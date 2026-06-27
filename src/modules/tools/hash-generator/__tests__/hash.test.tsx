import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HashGenerator from '../index';

describe('HashGenerator', () => {
  it('generates hashes for input', async () => {
    const user = userEvent.setup();
    render(<HashGenerator />);
    
    const input = screen.getByPlaceholderText('Type or paste text to hash...');
    await user.type(input, 'hello');
    
    // Check that hashes populate (SHA-256 for 'hello')
    await waitFor(() => {
      expect(screen.getByText('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')).toBeInTheDocument();
    });
  });
});
