import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { TaskProvider } from '../contexts/TaskContext';
import { render } from '@testing-library/react';

// 🧪 Test Utility: renderWithProviders
// Wraps components with Auth + Task contexts so we don't repeat boilerplate like a copy/paste goblin.
export const renderWithProviders = (ui: React.ReactElement, options?: any) => {
  return render(
    <AuthProvider>
      <TaskProvider>
        {ui}
      </TaskProvider>
    </AuthProvider>,
    options
  );
};
