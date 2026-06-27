import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorConverter from '../index';

describe('ColorConverter', () => {
  it('converts hex to rgb and hsl', async () => {
    const user = userEvent.setup();
    render(<ColorConverter />);
    
    const input = screen.getByPlaceholderText('#000000 or rgb(0,0,0)');
    await user.clear(input);
    await user.type(input, '#ff0000');
    
    expect(screen.getByText('rgb(255, 0, 0)')).toBeInTheDocument();
    expect(screen.getByText('hsl(0, 100%, 50%)')).toBeInTheDocument();
  });

  it('converts rgb to hex and hsl', async () => {
    const user = userEvent.setup();
    render(<ColorConverter />);
    
    const input = screen.getByPlaceholderText('#000000 or rgb(0,0,0)');
    await user.clear(input);
    await user.type(input, 'rgb(0, 255, 0)');
    
    expect(screen.getByText('#00FF00')).toBeInTheDocument();
    expect(screen.getByText('hsl(120, 100%, 50%)')).toBeInTheDocument();
  });
});
