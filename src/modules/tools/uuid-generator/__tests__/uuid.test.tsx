import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UUIDGenerator from '../index';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => '123e4567-e89b-12d3-a456-426614174000',
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = i;
    }
    return arr;
  }
});

describe('UUIDGenerator', () => {
  it('generates v4 UUIDs', async () => {
    render(<UUIDGenerator />);
    
    // Default is 5 UUIDs
    const results = await screen.findAllByText('123e4567-e89b-12d3-a456-426614174000');
    expect(results).toHaveLength(5);
  });

  it('can change quantity', async () => {
    const user = userEvent.setup();
    render(<UUIDGenerator />);
    
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '2');
    
    const generateBtn = screen.getByText('Generate');
    await user.click(generateBtn);
    
    const results = await screen.findAllByText('123e4567-e89b-12d3-a456-426614174000');
    expect(results).toHaveLength(2);
  });
});
