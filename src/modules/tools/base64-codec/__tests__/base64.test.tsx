import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Base64Codec from '../index';

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

describe('Base64Codec', () => {
  it('encodes plain text to base64', async () => {
    const user = userEvent.setup();
    render(<Base64Codec />);
    
    const input = screen.getByPlaceholderText('Enter text to encode...');
    await user.type(input, 'Hello World');
    
    const output = screen.getByPlaceholderText('Result will appear here...') as HTMLTextAreaElement;
    expect(output.value).toBe('SGVsbG8gV29ybGQ=');
  });

  it('decodes base64 to plain text', async () => {
    const user = userEvent.setup();
    render(<Base64Codec />);
    
    // Switch to decode mode
    const decodeButton = screen.getByText('Decode');
    await user.click(decodeButton);
    
    const input = screen.getByPlaceholderText('Enter Base64 to decode...');
    await user.type(input, 'SGVsbG8gV29ybGQ=');
    
    const output = screen.getByPlaceholderText('Result will appear here...') as HTMLTextAreaElement;
    expect(output.value).toBe('Hello World');
  });

  it('shows error for invalid base64 in decode mode', async () => {
    const user = userEvent.setup();
    render(<Base64Codec />);
    
    const decodeButton = screen.getByText('Decode');
    await user.click(decodeButton);
    
    const input = screen.getByPlaceholderText('Enter Base64 to decode...');
    await user.type(input, 'Invalid=Base64^');
    
    expect(screen.getByText('Invalid Base64 string')).toBeInTheDocument();
  });
});
