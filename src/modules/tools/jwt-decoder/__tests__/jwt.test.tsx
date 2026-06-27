import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JWTDecoder from '../index';

describe('JWTDecoder', () => {
  it('decodes a valid JWT', async () => {
    const user = userEvent.setup();
    render(<JWTDecoder />);
    
    // A mock JWT: {"alg":"HS256","typ":"JWT"}.{"sub":"1234567890","name":"John Doe","iat":1516239022}.signature
    const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.signature';
    
    // The placeholder is actually "Paste a JWT here (ey...)" inside a div, but textarea handles input
    // The textarea has no aria-label, but we can query by placeholder? No, it has no placeholder in the textarea itself.
    // We can select the textarea by its role or tagName if it's the only one.
    const textboxes = screen.getAllByRole('textbox');
    const input = textboxes[0];
    
    await user.click(input);
    await user.paste(mockJwt);
    
    // Check decoded output
    expect(await screen.findByText('Valid Syntax')).toBeInTheDocument();
    
    // The output is rendered via dangerouslySetInnerHTML so we check if text content exists
    expect(screen.getByText(/"John Doe"/)).toBeInTheDocument();
  });

  it('shows error for invalid JWT', async () => {
    const user = userEvent.setup();
    render(<JWTDecoder />);
    
    const textboxes = screen.getAllByRole('textbox');
    const input = textboxes[0];
    
    await user.click(input);
    await user.paste('invalid.token');
    
    expect(await screen.findByText('Invalid JWT format. Must contain 3 parts separated by dots.')).toBeInTheDocument();
  });
});
