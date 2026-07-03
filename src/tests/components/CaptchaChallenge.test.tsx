import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CaptchaChallenge } from '../../components/ui/CaptchaChallenge';

describe('CaptchaChallenge', () => {
  it('renders correctly and generates a code', () => {
    const handleSolvedChange = vi.fn();
    render(<CaptchaChallenge id="captcha" onSolvedChange={handleSolvedChange} />);

    expect(screen.getByText('Xác thực CAPTCHA')).toBeInTheDocument();
    
    // Check that there is an input field
    const input = screen.getByPlaceholderText('Nhập mã bên trái');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'captcha');

    // Initial state is unsolved
    expect(handleSolvedChange).toHaveBeenCalledWith(false);
  });

  it('shows error when wrong code is entered', async () => {
    const user = userEvent.setup();
    render(<CaptchaChallenge id="captcha" onSolvedChange={vi.fn()} />);

    const input = screen.getByPlaceholderText('Nhập mã bên trái');
    await user.type(input, 'WRONG');

    // Should show error message
    expect(screen.getByText('Mã CAPTCHA chưa đúng, vui lòng kiểm tra lại!')).toBeInTheDocument();
  });

  it('calls onSolvedChange with true when correct code is entered', async () => {
    const user = userEvent.setup();
    const handleSolvedChange = vi.fn();
    const { container } = render(<CaptchaChallenge id="captcha" onSolvedChange={handleSolvedChange} />);

    // Get the generated code text
    const codeElement = container.querySelector('.captcha-code');
    const code = codeElement?.textContent || '';
    expect(code.length).toBe(6);

    const input = screen.getByPlaceholderText('Nhập mã bên trái');
    await user.type(input, code);

    // Should not show error message
    expect(screen.queryByText('Mã CAPTCHA chưa đúng, vui lòng kiểm tra lại!')).not.toBeInTheDocument();
    
    // Should call onSolvedChange(true)
    expect(handleSolvedChange).toHaveBeenCalledWith(true);
  });

  it('refreshes the code when refresh button is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<CaptchaChallenge id="captcha" onSolvedChange={vi.fn()} />);

    const codeElement = container.querySelector('.captcha-code');
    const initialCode = codeElement?.textContent;

    const refreshButton = screen.getByTitle('Đổi mã CAPTCHA');
    await user.click(refreshButton);

    const newCode = container.querySelector('.captcha-code')?.textContent;
    expect(newCode).not.toBe(initialCode);
  });
});
