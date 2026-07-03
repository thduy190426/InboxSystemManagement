import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RegisterPage } from '../../pages/auth/RegisterPage';

vi.mock('../../components/ui/CaptchaChallenge', () => ({
  CaptchaChallenge: ({ onSolvedChange, disabled }: { onSolvedChange: (s: boolean) => void, disabled: boolean }) => (
    <div data-testid="mock-captcha">
      <button 
        type="button" 
        disabled={disabled}
        onClick={() => onSolvedChange(true)}
      >
        Solve Captcha
      </button>
    </div>
  )
}));

describe('RegisterPage', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onSwitchMode: vi.fn(),
    pushToast: vi.fn(),
  };

  it('renders correctly', () => {
    render(<RegisterPage {...defaultProps} />);

    expect(screen.getByRole('heading', { name: /Tạo tài khoản mới/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập họ và tên tại đây')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập địa chỉ Email tại đây')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập số điện thoại tại đây')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập mật khẩu tại đây')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập lại mật khẩu tại đây')).toBeInTheDocument();
    
    const submitBtn = screen.getByRole('button', { name: /Đăng ký/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button when required fields are filled, terms checked, and captcha solved', async () => {
    const user = userEvent.setup();
    render(<RegisterPage {...defaultProps} />);

    const submitBtn = screen.getByRole('button', { name: /Đăng ký/i });

    await user.type(screen.getByPlaceholderText('Nhập họ và tên tại đây'), 'John Doe');
    await user.type(screen.getByPlaceholderText('Nhập địa chỉ Email tại đây'), 'john@example.com');
    await user.type(screen.getByPlaceholderText('Nhập mật khẩu tại đây'), 'Password123!');
    await user.type(screen.getByPlaceholderText('Nhập lại mật khẩu tại đây'), 'Password123!');
    
    await user.click(screen.getByRole('checkbox'));

    expect(submitBtn).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Solve Captcha' }));

    expect(submitBtn).not.toBeDisabled();
  });

  it('shows error toast when trying to submit without solving captcha', () => {
    const pushToast = vi.fn();
    render(<RegisterPage {...defaultProps} pushToast={pushToast} />);
  });

  it('calls onSubmit with valid data', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<RegisterPage {...defaultProps} onSubmit={handleSubmit} />);

    await user.type(screen.getByPlaceholderText('Nhập họ và tên tại đây'), 'John Doe');
    await user.type(screen.getByPlaceholderText('Nhập địa chỉ Email tại đây'), 'john@example.com');
    await user.type(screen.getByPlaceholderText('Nhập mật khẩu tại đây'), 'Password123!');
    await user.type(screen.getByPlaceholderText('Nhập lại mật khẩu tại đây'), 'Password123!');
    
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Solve Captcha' }));
    
    await user.click(screen.getByRole('button', { name: /Đăng ký/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
  });
});
