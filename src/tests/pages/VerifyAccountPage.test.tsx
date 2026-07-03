import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { VerifyAccountPage } from '../../pages/auth/VerifyAccountPage';

describe('VerifyAccountPage', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onSwitchMode: vi.fn(),
    onResend: vi.fn(),
  };

  it('renders correctly', () => {
    render(<VerifyAccountPage {...defaultProps} />);

    expect(screen.getByRole('heading', { name: /Xác thực tài khoản/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập Email tài khoản')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập mã 6 chữ số')).toBeInTheDocument();
  });

  it('shows error for invalid email', async () => {
    const user = userEvent.setup();
    render(<VerifyAccountPage {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('Nhập Email tài khoản'), 'invalidemail');
    await user.type(screen.getByPlaceholderText('Nhập mã 6 chữ số'), '123456');
    
    fireEvent.submit(screen.getByRole('button', { name: 'Xác thực' }).closest('form')!);

    expect(screen.getByText('Vui lòng nhập Email hợp lệ!')).toBeInTheDocument();
  });

  it('shows error for invalid code', async () => {
    const user = userEvent.setup();
    render(<VerifyAccountPage {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('Nhập Email tài khoản'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Nhập mã 6 chữ số'), '1234');
    
    fireEvent.submit(screen.getByRole('button', { name: 'Xác thực' }).closest('form')!);

    expect(screen.getByText('Mã xác thực phải gồm 6 chữ số!')).toBeInTheDocument();
  });

  it('calls onSubmit when valid data is submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<VerifyAccountPage {...defaultProps} onSubmit={handleSubmit} />);

    await user.type(screen.getByPlaceholderText('Nhập Email tài khoản'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Nhập mã 6 chữ số'), '123456');
    await user.click(screen.getByRole('button', { name: 'Xác thực' }));

    expect(handleSubmit).toHaveBeenCalledWith({
      channel: 'email',
      email: 'test@example.com',
      code: '123456',
    });
  });

  it('calls onResend when resend button is clicked', async () => {
    const user = userEvent.setup();
    const handleResend = vi.fn();
    render(<VerifyAccountPage {...defaultProps} onResend={handleResend} defaultEmail="test@example.com" />);

    await user.click(screen.getByRole('button', { name: /Gửi lại mã/i }));
    
    expect(handleResend).toHaveBeenCalledWith({
      channel: 'email',
      email: 'test@example.com',
    });
  });
});
