import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResetPasswordPage } from '../../pages/auth/ResetPasswordPage';

describe('ResetPasswordPage', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onSwitchMode: vi.fn(),
  };

  beforeEach(() => {
    window.history.pushState({}, 'Reset', '/');
  });

  it('renders correctly', () => {
    render(<ResetPasswordPage {...defaultProps} />);

    expect(screen.getByRole('heading', { name: /Tạo mật khẩu mới/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập Email của bạn tại đây')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập mã 6 chữ số')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập mật khẩu mới')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập lại mật khẩu mới')).toBeInTheDocument();
  });

  it('pre-fills email and token from URL search params', () => {
    window.history.pushState({}, 'Reset', '/reset?email=test@example.com&token=123456');
    render(<ResetPasswordPage {...defaultProps} />);

    expect(screen.getByPlaceholderText('Nhập Email của bạn tại đây')).toHaveValue('test@example.com');
    expect(screen.getByPlaceholderText('Nhập mã 6 chữ số')).toHaveValue('123456');
  });

  it('shows error for missing fields', () => {
    render(<ResetPasswordPage {...defaultProps} />);

    fireEvent.submit(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }).closest('form')!);

    expect(screen.getByText('Vui lòng nhập Email tài khoản!')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng kiểm tra lại mật khẩu mới!')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('Nhập Email của bạn tại đây'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Nhập mã 6 chữ số'), '123456');
    await user.type(screen.getByPlaceholderText('Nhập mật khẩu mới'), 'Password123!');
    await user.type(screen.getByPlaceholderText('Nhập lại mật khẩu mới'), 'Different123!');

    fireEvent.submit(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }).closest('form')!);

    expect(screen.getByText('Mật khẩu mới xác nhận không khớp!')).toBeInTheDocument();
  });

  it('calls onSubmit when form is valid', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<ResetPasswordPage {...defaultProps} onSubmit={handleSubmit} />);

    await user.type(screen.getByPlaceholderText('Nhập Email của bạn tại đây'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Nhập mã 6 chữ số'), '123456');
    await user.type(screen.getByPlaceholderText('Nhập mật khẩu mới'), 'Password123!');
    await user.type(screen.getByPlaceholderText('Nhập lại mật khẩu mới'), 'Password123!');

    await user.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      token: '123456',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
  });
});
