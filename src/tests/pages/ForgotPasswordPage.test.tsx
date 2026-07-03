import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ForgotPasswordPage } from '../../pages/auth/ForgotPasswordPage';

describe('ForgotPasswordPage', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onSwitchMode: vi.fn(),
    onResetPassword: vi.fn(),
  };

  it('renders correctly', () => {
    render(<ForgotPasswordPage {...defaultProps} />);

    expect(screen.getByRole('heading', { name: /Khôi phục quyền truy cập/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập email của bạn tại đây')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi mã đặt lại' })).toBeInTheDocument();
  });

  it('calls onSubmit with email when form is submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<ForgotPasswordPage {...defaultProps} onSubmit={handleSubmit} />);

    const emailInput = screen.getByPlaceholderText('Nhập email của bạn tại đây');
    await user.type(emailInput, 'test@example.com');
    
    await user.click(screen.getByRole('button', { name: 'Gửi mã đặt lại' }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
  });

  it('renders success message and reset button when provided', () => {
    render(<ForgotPasswordPage {...defaultProps} successMessage="Code sent!" />);

    expect(screen.getByRole('button', { name: /Nhập mã đặt lại/i })).toBeInTheDocument();
  });

  it('calls onResetPassword when reset button is clicked', async () => {
    const user = userEvent.setup();
    const handleResetPassword = vi.fn();
    render(<ForgotPasswordPage {...defaultProps} successMessage="Code sent!" onResetPassword={handleResetPassword} />);

    await user.click(screen.getByRole('button', { name: /Nhập mã đặt lại/i }));
    expect(handleResetPassword).toHaveBeenCalledTimes(1);
  });
});
