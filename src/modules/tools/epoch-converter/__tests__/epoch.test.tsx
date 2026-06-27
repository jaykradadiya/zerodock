import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EpochConverter from '../index';

describe('EpochConverter', () => {
  it('renders correctly', () => {
    render(<EpochConverter />);
    expect(screen.getByText('Epoch Timestamp Converter')).toBeInTheDocument();
  });

  it('converts epoch seconds to dates', async () => {
    const user = userEvent.setup();
    render(<EpochConverter />);
    
    const input = screen.getByPlaceholderText('e.g. 1781523600');
    await user.clear(input);
    await user.type(input, '1700000000');
    
    // Check UTC time
    expect(screen.getByText('Tue, 14 Nov 2023 22:13:20 GMT')).toBeInTheDocument();
    
    // Check ISO string
    expect(screen.getByText('2023-11-14T22:13:20.000Z')).toBeInTheDocument();
  });

  it('handles invalid epoch input gracefully', async () => {
    const user = userEvent.setup();
    render(<EpochConverter />);
    
    const input = screen.getByPlaceholderText('e.g. 1781523600');
    await user.clear(input);
    await user.type(input, 'invalid');
    
    expect(screen.getByText('Invalid timestamp value. Please enter a valid number.')).toBeInTheDocument();
  });
});
