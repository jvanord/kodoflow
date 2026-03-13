import * as vscode from 'vscode';
import { RepositoryIndex } from './repositoryIndex';
import { TaskService } from './taskService';
import { BoardPanel } from './boardPanel';
import { ExplorerProvider } from './explorerProvider';
import { Task } from './types';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const index = new RepositoryIndex(workspaceRoot);
  const taskService = new TaskService(index, workspaceRoot);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('kodoflow.explorer', new ExplorerProvider(index))
  );

  index.startWatching(context);
  await index.refresh();

  context.subscriptions.push(
    vscode.commands.registerCommand('kodoflow.openBoard', () => {
      BoardPanel.createOrReveal(context.extensionUri, index, taskService);
    }),

    vscode.commands.registerCommand('kodoflow.refreshIndex', () => {
      index.refresh();
    }),

    vscode.commands.registerCommand('kodoflow.createTask', async () => {
      const data = await collectTaskData();
      if (!data) return;
      try {
        await taskService.createTask(data);
        // file watcher triggers index refresh automatically
      } catch (err) {
        vscode.window.showErrorMessage(`KodoFlow: Failed to create task — ${err}`);
      }
    }),

    vscode.commands.registerCommand('kodoflow.moveTaskToBacklog', () =>
      moveTaskViaCommand(index, taskService, 'backlog')
    ),

    vscode.commands.registerCommand('kodoflow.moveTaskToDoing', () =>
      moveTaskViaCommand(index, taskService, 'doing')
    ),

    vscode.commands.registerCommand('kodoflow.moveTaskToDone', () =>
      moveTaskViaCommand(index, taskService, 'done')
    ),

    vscode.commands.registerCommand('kodoflow.openTaskFile', async () => {
      const task = await pickTask(index);
      if (task) taskService.openFile(task.filePath);
    }),

    vscode.commands.registerCommand('kodoflow.openSpec', async () => {
      const task = await pickTask(index);
      if (task) taskService.openSpec(task.id);
    }),

    vscode.commands.registerCommand('kodoflow.openEpic', async () => {
      const task = await pickTask(index);
      if (task) taskService.openEpic(task.id);
    }),

    vscode.commands.registerCommand('kodoflow.openCodePath', async () => {
      const task = await pickTask(index);
      if (!task) return;
      if (!task.code_paths.length) {
        vscode.window.showWarningMessage('No code paths defined for this task.');
        return;
      }
      const pick = await vscode.window.showQuickPick(task.code_paths, {
        placeHolder: 'Select a code path to open',
      });
      if (pick) taskService.openCodePath(task.id, pick);
    })
  );
}

async function collectTaskData(): Promise<
  | {
      title: string;
      type: string;
      priority: string;
      readiness: string;
      epic: string;
      spec: string;
      labels: string[];
      estimate: string;
      risk: string;
      summary: string;
    }
  | undefined
> {
  const title = await vscode.window.showInputBox({
    prompt: 'Task title',
    placeHolder: 'Implement RSS feed parser',
    validateInput: (v) => (v.trim() ? null : 'Title is required'),
  });
  if (!title) return undefined;

  const type = await vscode.window.showQuickPick(
    ['feature', 'bug', 'chore', 'docs', 'refactor'],
    { placeHolder: 'Task type' }
  );
  if (!type) return undefined;

  const priority = await vscode.window.showQuickPick(['high', 'medium', 'low'], {
    placeHolder: 'Priority',
  });
  if (!priority) return undefined;

  const readiness = await vscode.window.showQuickPick(['draft', 'ready', 'blocked'], {
    placeHolder: 'Readiness',
  });
  if (!readiness) return undefined;

  const epic =
    (await vscode.window.showInputBox({
      prompt: 'Epic ID (optional)',
      placeHolder: 'EPIC-3',
    })) ?? '';

  const spec =
    (await vscode.window.showInputBox({
      prompt: 'Spec ID (optional)',
      placeHolder: 'SPEC-3',
    })) ?? '';

  const labelsRaw =
    (await vscode.window.showInputBox({
      prompt: 'Labels (comma-separated, optional)',
      placeHolder: 'backend, feeds',
    })) ?? '';
  const labels = labelsRaw
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

  const estimate =
    (await vscode.window.showQuickPick(['xs', 's', 'm', 'l', 'xl'], {
      placeHolder: 'Estimate (optional — press Escape to skip)',
    })) ?? '';

  const risk =
    (await vscode.window.showQuickPick(['low', 'medium', 'high'], {
      placeHolder: 'Risk (optional — press Escape to skip)',
    })) ?? '';

  const summary =
    (await vscode.window.showInputBox({
      prompt: 'Brief summary (optional)',
      placeHolder: 'Implement RSS feed parsing and normalization.',
    })) ?? '';

  return { title, type, priority, readiness, epic, spec, labels, estimate, risk, summary };
}

async function pickTask(index: RepositoryIndex): Promise<Task | undefined> {
  const items = index.tasks.map((t) => ({
    label: t.id,
    description: `[${t.status}] ${t.title}`,
    task: t,
  }));

  if (items.length === 0) {
    vscode.window.showWarningMessage('No tasks found. Try KodoFlow: Refresh Index.');
    return undefined;
  }

  const pick = await vscode.window.showQuickPick(items, { placeHolder: 'Select a task' });
  return pick?.task;
}

async function moveTaskViaCommand(
  index: RepositoryIndex,
  taskService: TaskService,
  targetStatus: 'backlog' | 'doing' | 'done'
): Promise<void> {
  const task = await pickTask(index);
  if (!task) return;
  try {
    await taskService.moveTask(task.id, targetStatus);
  } catch (err) {
    vscode.window.showErrorMessage(`KodoFlow: Failed to move task — ${err}`);
  }
}

export function deactivate(): void {}
