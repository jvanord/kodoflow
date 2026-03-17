import * as path from 'path';
import * as vscode from 'vscode';
import { Task } from './types';
import { RepositoryIndex } from './repositoryIndex';
import { writeFile, readFile, deleteFile } from './fileMutator';
import { generateTaskContent } from './taskParser';

export class TaskService {
  constructor(
    private readonly index: RepositoryIndex,
    private readonly workspaceRoot: string,
    private readonly channel: vscode.OutputChannel
  ) {}

  private getConfig() {
    const cfg = vscode.workspace.getConfiguration('kodoflow');
    return {
      basePath: cfg.get<string>('basePath', 'docs/product'),
      tasksFolder: cfg.get<string>('tasksFolder', 'tasks'),
    };
  }

  async moveTask(taskId: string, targetStatus: 'backlog' | 'doing' | 'done'): Promise<void> {
    const task = this.index.getTaskById(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    if (task.status === targetStatus) return;

    const { basePath, tasksFolder } = this.getConfig();
    const fileName = path.basename(task.filePath);
    const targetDir = path.join(this.workspaceRoot, basePath, tasksFolder, targetStatus);
    const targetPath = path.join(targetDir, fileName);

    this.channel.appendLine(`Moving ${taskId}: ${task.status} → ${targetStatus} (${fileName})`);
    const content = await readFile(task.filePath);
    await writeFile(targetPath, content);

    if (task.filePath !== targetPath) {
      await deleteFile(task.filePath);
    }
    this.channel.appendLine(`Moved ${taskId} to ${targetPath}`);
  }

  async createTask(data: {
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
  }): Promise<Task> {
    const { basePath, tasksFolder } = this.getConfig();

    const nextNum = this.index.getNextTaskId();
    const id = `TASK-${nextNum}`;
    const slug = this.generateSlug(data.title);
    const fileName = `${id}-${slug}.md`;
    const filePath = path.join(this.workspaceRoot, basePath, tasksFolder, 'backlog', fileName);

    this.channel.appendLine(`Creating task ${id}: "${data.title}" → ${filePath}`);
    const content = generateTaskContent({ ...data, id });
    await writeFile(filePath, content);
    this.channel.appendLine(`Created ${id}`);

    return {
      id,
      title: data.title,
      type: data.type,
      status: 'backlog',
      priority: data.priority,
      readiness: data.readiness,
      epic: data.epic,
      spec: data.spec,
      labels: data.labels,
      code_paths: [],
      depends_on: [],
      blocks: [],
      estimate: data.estimate,
      risk: data.risk,
      filePath,
      body: `## Summary\n\n${data.summary}`,
    };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 50);
  }

  async openFile(filePath: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    await vscode.window.showTextDocument(uri);
  }

  async openSpec(taskId: string): Promise<void> {
    const task = this.index.getTaskById(taskId);
    if (!task?.spec) {
      vscode.window.showWarningMessage('No spec defined for this task.');
      return;
    }
    const specPath =
      this.index.specPaths.get(task.spec) ??
      this.index.specPaths.get(path.basename(task.spec, '.md'));
    if (!specPath) {
      vscode.window.showErrorMessage(`Spec file not found: ${task.spec}`);
      return;
    }
    await this.openFile(specPath);
  }

  async openEpic(taskId: string): Promise<void> {
    const task = this.index.getTaskById(taskId);
    if (!task?.epic) {
      vscode.window.showWarningMessage('No epic defined for this task.');
      return;
    }
    const epicPath =
      this.index.epicPaths.get(task.epic) ??
      this.index.epicPaths.get(path.basename(task.epic, '.md'));
    if (!epicPath) {
      vscode.window.showErrorMessage(`Epic file not found: ${task.epic}`);
      return;
    }
    await this.openFile(epicPath);
  }

  async openCodePath(taskId: string, codePath: string): Promise<void> {
    const fullPath = path.join(this.workspaceRoot, codePath);
    const uri = vscode.Uri.file(fullPath);
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.Directory) {
        await vscode.commands.executeCommand('revealInExplorer', uri);
      } else {
        await this.openFile(fullPath);
      }
    } catch {
      vscode.window.showErrorMessage(`Path not found: ${codePath}`);
    }
  }
}
