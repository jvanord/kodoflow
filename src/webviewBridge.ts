import { Task, Warning } from './types';

// Messages sent from extension to webview
export type ExtensionToWebview =
  | { type: 'loadTasks'; tasks: Task[] }
  | { type: 'showWarnings'; warnings: Warning[] }
  | { type: 'showError'; message: string };

// Messages sent from webview to extension
export type WebviewToExtension =
  | { type: 'ready' }
  | { type: 'moveTask'; taskId: string; targetStatus: 'backlog' | 'doing' | 'done' }
  | { type: 'openTask'; taskId: string }
  | { type: 'openSpec'; taskId: string }
  | { type: 'openEpic'; taskId: string }
  | { type: 'openCodePath'; taskId: string; path: string }
  | { type: 'createTask' }
  | { type: 'refresh' };
