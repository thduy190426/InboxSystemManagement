import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AvatarFallback, getLastNameInitial } from '../../components/ui/AvatarFallback';

describe('AvatarFallback', () => {
  describe('getLastNameInitial', () => {
    it('returns the first letter of the last word in a name', () => {
      expect(getLastNameInitial('Nguyen Van A')).toBe('A');
      expect(getLastNameInitial('Tran  Binh  ')).toBe('B');
    });

    it('returns "?" if name is empty', () => {
      expect(getLastNameInitial('')).toBe('?');
      expect(getLastNameInitial('   ')).toBe('?');
    });
  });

  describe('AvatarFallback component', () => {
    it('renders image when src is provided', () => {
      const { container } = render(<AvatarFallback name="Test User" src="https://example.com/avatar.jpg" />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('renders fallback initial when src is not provided', () => {
      render(<AvatarFallback name="Test User" />);
      const span = screen.getByText('U');
      expect(span).toBeInTheDocument();
      expect(span).toHaveClass('avatar-fallback');
    });
  });
});
