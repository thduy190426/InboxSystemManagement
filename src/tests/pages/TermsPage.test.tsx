import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TermsPage } from '../../pages/legal/TermsPage';

describe('TermsPage', () => {
  it('renders the page title and description', () => {
    render(<TermsPage />);

    expect(screen.getByRole('heading', { name: /Điều khoản sử dụng/i })).toBeInTheDocument();
    expect(screen.getByText(/Các nguyên tắc cơ bản khi bạn tạo tài khoản/i)).toBeInTheDocument();
  });

  it('renders the back link', () => {
    render(<TermsPage />);
    const backLink = screen.getByRole('link', { name: /Quay lại đăng ký/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/register');
  });

  it('renders all sections of the terms', () => {
    render(<TermsPage />);

    expect(screen.getByRole('heading', { name: /1. Chấp nhận điều khoản/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /6. Thay đổi điều khoản/i })).toBeInTheDocument();
  });
});
