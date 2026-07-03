import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NotFoundPage } from '../../pages/errors/NotFoundPage';

describe('NotFoundPage', () => {
  it('renders correctly with default props', () => {
    render(<NotFoundPage onGoBack={vi.fn()} onGoHome={vi.fn()} />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Trang này đã rời khỏi cuộc trò chuyện!/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Về trang đăng nhập/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quay lại trang trước/i })).toBeInTheDocument();
  });

  it('renders correctly when authenticated', () => {
    render(<NotFoundPage isAuthenticated={true} onGoBack={vi.fn()} onGoHome={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Về hộp thư chính/i })).toBeInTheDocument();
  });

  it('calls onGoHome when primary button is clicked', async () => {
    const user = userEvent.setup();
    const handleGoHome = vi.fn();
    render(<NotFoundPage onGoBack={vi.fn()} onGoHome={handleGoHome} />);

    await user.click(screen.getByRole('button', { name: /Về trang đăng nhập/i }));
    expect(handleGoHome).toHaveBeenCalledTimes(1);
  });

  it('calls onGoBack when secondary button is clicked', async () => {
    const user = userEvent.setup();
    const handleGoBack = vi.fn();
    render(<NotFoundPage onGoBack={handleGoBack} onGoHome={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Quay lại trang trước/i }));
    expect(handleGoBack).toHaveBeenCalledTimes(1);
  });
});
