import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PrivacyPolicyPage } from '../../pages/legal/PrivacyPolicyPage';

describe('PrivacyPolicyPage', () => {
  it('renders the page title and description', () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByRole('heading', { name: /Chính sách bảo mật/i })).toBeInTheDocument();
    expect(screen.getByText(/Cách hệ thống thu thập, sử dụng và bảo vệ dữ liệu cá nhân/i)).toBeInTheDocument();
  });

  it('renders the back link', () => {
    render(<PrivacyPolicyPage />);
    const backLink = screen.getByRole('link', { name: /Quay lại đăng ký/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/register');
  });

  it('renders all sections of the privacy policy', () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByRole('heading', { name: /1. Dữ liệu chúng tôi thu thập/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /6. Quyền của bạn/i })).toBeInTheDocument();
  });
});
