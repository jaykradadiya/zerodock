import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import URLEncoder from '../index';

describe('URLEncoder', () => {
  it('encodes plain text to URL encoded', async () => {
    const user = userEvent.setup();
    render(<URLEncoder />);
    
    const input = screen.getByPlaceholderText('Enter string to URL encode...');
    await user.type(input, 'Hello World &?');
    
    const output = screen.getByPlaceholderText('Result will appear here...') as HTMLTextAreaElement;
    expect(output.value).toBe('Hello%20World%20%26%3F');
  });

  it('decodes URL encoded text to plain text', async () => {
    const user = userEvent.setup();
    render(<URLEncoder />);
    
    // Switch to decode mode
    const decodeButton = screen.getByText('Decode');
    await user.click(decodeButton);
    
    const input = screen.getByPlaceholderText('Enter encoded string to decode...');
    await user.type(input, 'Hello%20World%20%26%3F');
    
    const output = screen.getByPlaceholderText('Result will appear here...') as HTMLTextAreaElement;
    expect(output.value).toBe('Hello World &?');
  });

  it('shows error for invalid URL encoding in decode mode', async () => {
    const user = userEvent.setup();
    render(<URLEncoder />);
    
    const decodeButton = screen.getByText('Decode');
    await user.click(decodeButton);
    
    const input = screen.getByPlaceholderText('Enter encoded string to decode...');
    await user.type(input, '%E0%A4%A'); // Malformed URI sequence
    
    expect(screen.getByText('Invalid URL encoding')).toBeInTheDocument();
  });
});
