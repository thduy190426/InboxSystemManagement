import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog, type ConfirmDialogState } from '../../components/ui/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultDialog: ConfirmDialogState = {
    title: 'Are you sure?',
    description: 'This action cannot be undone.',
    onConfirm: vi.fn(),
  };

  it('does not render when dialog is null', () => {
    const { container } = render(
      <ConfirmDialog dialog={null} onCancel={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when dialog is provided', () => {
    render(
      <ConfirmDialog dialog={defaultDialog} onCancel={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByText('Xác nhận')).toBeInTheDocument();
    expect(screen.getByText('Huỷ')).toBeInTheDocument();
  });

  it('renders custom labels when provided', () => {
    const customDialog: ConfirmDialogState = {
      ...defaultDialog,
      confirmLabel: 'Yes, delete',
      cancelLabel: 'No, keep',
    };
    render(
      <ConfirmDialog dialog={customDialog} onCancel={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('No, keep')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();
    render(
      <ConfirmDialog dialog={defaultDialog} onCancel={handleCancel} onConfirm={vi.fn()} />
    );
    
    await user.click(screen.getByText('Huỷ'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    render(
      <ConfirmDialog dialog={defaultDialog} onCancel={vi.fn()} onConfirm={handleConfirm} />
    );
    
    await user.click(screen.getByText('Xác nhận'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables buttons and shows loader when isWorking is true', () => {
    render(
      <ConfirmDialog dialog={defaultDialog} isWorking={true} onCancel={vi.fn()} onConfirm={vi.fn()} />
    );
    
    const confirmBtn = screen.getByRole('button', { name: /Đang xử lí\.\.\./i });
    expect(confirmBtn).toBeDisabled();
    
    const cancelBtn = screen.getByRole('button', { name: /Huỷ/i });
    expect(cancelBtn).toBeDisabled();
  });

  it('applies danger styling when tone is danger', () => {
    const dangerDialog: ConfirmDialogState = {
      ...defaultDialog,
      tone: 'danger',
    };
    render(
      <ConfirmDialog dialog={dangerDialog} onCancel={vi.fn()} onConfirm={vi.fn()} />
    );
    
    const dialogSection = screen.getByRole('dialog');
    expect(dialogSection).toHaveClass('is-danger');
  });
});
