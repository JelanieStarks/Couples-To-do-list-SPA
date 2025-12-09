/**
 * WeeklyCalendar (alias)
 * Thin wrapper so old imports still render the current TurboWeekTracker.
 * Prefer importing TurboWeekTracker directly for new code.
 */
import React from 'react';
import { TurboWeekTracker } from './TurboWeekTracker';

// Simple passthrough to keep legacy paths stable
export const WeeklyCalendar: React.FC = () => <TurboWeekTracker />;

export default WeeklyCalendar;
