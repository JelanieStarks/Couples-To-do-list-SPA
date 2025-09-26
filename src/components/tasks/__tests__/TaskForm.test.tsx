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
});
