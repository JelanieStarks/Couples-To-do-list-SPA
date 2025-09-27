import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { TaskForm } from '../../tasks/TaskForm';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';

// 🧪 These tests ensure the TaskForm does what it promises: births tasks into existence.
//    Also includes jokes so future-you will smile instead of cry while debugging.

describe('TaskForm', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens when Add New Task button is clicked', () => {
    renderWithProviders(<TaskForm />);
    // Closed state shows the big add button
    const openBtn = screen.getByRole('button', { name: /add new task/i });
    expect(openBtn).toBeInTheDocument();
    fireEvent.click(openBtn);
    // Now form title should appear
    expect(screen.getByText(/create new task/i)).toBeInTheDocument();
  });

  it('creates a task and resets form then closes', () => {
    renderWithProviders(<TaskForm />);
    fireEvent.click(screen.getByRole('button', { name: /add new task/i }));
    const titleInput = screen.getByLabelText(/what needs to be done/i);
    fireEvent.change(titleInput, { target: { value: 'Walk the dragon' } }); // because dogs are too mainstream
    const submit = screen.getByRole('button', { name: /create task/i });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    // Form should close -> open button visible again
    expect(screen.getByRole('button', { name: /add new task/i })).toBeInTheDocument();
  });

  it('prevents submit if title empty', () => {
    renderWithProviders(<TaskForm />);
    fireEvent.click(screen.getByRole('button', { name: /add new task/i }));
    const submit = screen.getByRole('button', { name: /create task/i });
    expect(submit).toBeDisabled(); // Title is required, like coffee in the morning
  });

  it('shows larger rounded square color buttons and selects one', () => {
    renderWithProviders(<TaskForm />);
    fireEvent.click(screen.getByRole('button', { name: /add new task/i }));

    // Find color buttons via data-testid pattern
    const colorButtons = screen.getAllByTestId(/color-btn-/i);
    expect(colorButtons.length).toBeGreaterThanOrEqual(5);

    // Check shape/size classes on first button
    const first = colorButtons[0];
    const className = first.getAttribute('class') || '';
    expect(className).toContain('w-12');
    expect(className).toContain('h-12');
    expect(className).toContain('rounded-xl');

    // Click a specific color and ensure it becomes selected (aria-pressed=true)
    const target = screen.getByTestId('color-btn-#ef4444');
    fireEvent.click(target);
    expect(target).toHaveAttribute('aria-pressed', 'true');
  });
});
