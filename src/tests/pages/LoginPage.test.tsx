import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LoginPage } from '../../pages/auth/LoginPage';

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

describe('LoginPage', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onSwitchMode: vi.fn(),
    onForgotPassword: vi.fn(),
  };

  it('renders login form elements', () => {
    render(<LoginPage {...defaultProps} />);

    expect(screen.getByRole('heading', { name: /Chào mừng trở lại!/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập Email của bạn tại đây')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập mật khẩu')).toBeInTheDocument();
    
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });
    expect(submitBtn).toBeDisabled();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginPage {...defaultProps} />);

    const passwordInput = screen.getByPlaceholderText('Nhập mật khẩu');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: 'Hiện mật khẩu' });
    await user.click(toggleBtn);
    
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    await user.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('enables submit button only when form is filled and captcha is solved', async () => {
    const user = userEvent.setup();
    render(<LoginPage {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText('Nhập Email của bạn tại đây');
    const passwordInput = screen.getByPlaceholderText('Nhập mật khẩu');
    const submitBtn = screen.getByRole('button', { name: 'Đăng nhập' });

    // Fill the form
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    // Form is filled, but captcha is not solved
    expect(submitBtn).toBeDisabled();

    // Solve captcha
    await user.click(screen.getByRole('button', { name: 'Solve Captcha' }));

    // Now it should be enabled
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onSubmit with form data when submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<LoginPage {...defaultProps} onSubmit={handleSubmit} />);

    await user.type(screen.getByPlaceholderText('Nhập Email của bạn tại đây'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Nhập mật khẩu'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Solve Captcha' }));
    
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      rememberLogin: 'true', // Default is checked
    });
  });

  it('calls onSwitchMode and onForgotPassword', async () => {
    const user = userEvent.setup();
    const handleSwitchMode = vi.fn();
    const handleForgotPassword = vi.fn();

    render(
      <LoginPage 
        {...defaultProps} 
        onSwitchMode={handleSwitchMode} 
        onForgotPassword={handleForgotPassword} 
      />
    );

    await user.click(screen.getByRole('button', { name: /Tạo tài khoản mới/i }));
    expect(handleSwitchMode).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Quên mật khẩu\?/i }));
    expect(handleForgotPassword).toHaveBeenCalledTimes(1);
  });
});
