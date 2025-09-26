import React from 'react';
import { useTask } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Task } from '../../types';

// 🖨️✉️ ExportTasks - Print and Email your beautifully organized, black-on-white task list

type GroupedTasks = Record<string, Task[]>;

const isDeleted = (t: Task) => !!t.deletedAt;

const normalizeDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

const formatLongDate = (dateISO: string): string => {
  const d = new Date(dateISO);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getTaskDateKey = (t: Task): string => {
  if (t.scheduledDate) return normalizeDate(t.scheduledDate);
  return normalizeDate(t.createdAt);
};

const byDateAscending = (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime();
const byPriorityOrder = (a: Task, b: Task) => {
  const order: Record<string, number> = { A1: 10, A2: 9, A3: 8, B1: 7, B2: 6, B3: 5, C1: 4, C2: 3, C3: 2, D: 1 };
  const diff = (order[b.priority] || 0) - (order[a.priority] || 0);
  if (diff !== 0) return diff;
  // then by order then by created
  if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
};

export const buildEmailBody = (tasks: Task[], includeCompleted = true): string => {
  const visible = tasks.filter(t => !isDeleted(t) && (includeCompleted || !t.completed));
  const grouped: GroupedTasks = {};
  for (const t of visible) {
    const key = getTaskDateKey(t);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  const days = Object.keys(grouped).sort(byDateAscending);
  const parts: string[] = [];
  for (const day of days) {
    parts.push(`${formatLongDate(day)}`);
    const items = grouped[day].sort(byPriorityOrder);
    for (const t of items) {
      const checkbox = t.completed ? '[x]' : '[ ]';
      const time = t.scheduledTime ? ` @ ${t.scheduledTime}` : '';
      const who = t.assignment === 'both' ? 'Both' : t.assignment === 'partner' ? 'Partner' : 'Me';
      parts.push(`- ${checkbox} [${t.priority}] ${t.title}${time} (assigned to: ${who})`);
    }
    parts.push('');
  }
  if (days.length === 0) {
    parts.push('No tasks yet. Enjoy the calm before the productivity storm!');
  }
  return parts.join('\n');
};

const buildPrintHTML = (tasks: Task[]): string => {
  const bodyText = buildEmailBody(tasks);
  // Very clean black-on-white page with a mono list
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Task List</title>
    <style>
      :root { color-scheme: light only; }
      * { box-sizing: border-box; }
      body { background: #fff; color: #000; margin: 2rem; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; }
      h1 { font-size: 20px; margin: 0 0 1rem; }
      pre { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 14px; }
      @media print { body { margin: 1rem; } }
    </style>
  </head>
  <body>
    <h1>Tasks by Day</h1>
    <pre>${escapeHtml(bodyText)}</pre>
  </body>
</html>`;
};

const escapeHtml = (s: string) => s
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

export const ExportTasks: React.FC = () => {
  const { tasks } = useTask();
  const { user } = useAuth();

  const onCopyEmail = async () => {
    const body = buildEmailBody(tasks);
    try {
      await navigator.clipboard.writeText(body);
      alert('📋 Email body copied to clipboard! Paste into your email client.');
    } catch (e) {
      console.error('Copy failed', e);
      alert('Could not copy to clipboard. Your browser might be shy.');
    }
  };

  const onEmailDraft = () => {
    const subject = encodeURIComponent('Your Organized Task Plan');
    const body = encodeURIComponent(buildEmailBody(tasks));
    const to = user?.email ? encodeURIComponent(user.email) : '';
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  const onPrint = () => {
    const html = buildPrintHTML(tasks);
    const w = window.open('', '_blank', 'noopener,noreferrer,width=980,height=800');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Give the browser a tick to render before printing
    setTimeout(() => {
      w.focus();
      w.print();
    }, 50);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Export & Share</h3>
        <span className="text-sm text-gray-500">🖨️ Print or ✉️ Email your plan</span>
      </div>
      <p className="text-sm text-gray-600 mb-4">Creates a clean black-on-white list grouped by day. Great for fridge doors and inboxes.</p>
      <div className="btn-row">
        <button className="btn-secondary" onClick={onPrint}>🖨️ Print Tasks</button>
        <button className="btn-secondary" onClick={onEmailDraft}>✉️ Email Draft</button>
        <button className="btn-secondary" onClick={onCopyEmail}>📋 Copy Email Body</button>
      </div>
    </div>
  );
};

export default ExportTasks;
