import * as vscode from 'vscode';
import * as path from 'path';
import { Task, Warning } from './types';
import { parseTask } from './taskParser';

export class RepositoryIndex {
  private _tasks: Task[] = [];
  private _warnings: Warning[] = [];
  private _specPaths = new Map<string, string>();
  private _epicPaths = new Map<string, string>();
  private _specFiles: string[] = [];
  private _epicFiles: string[] = [];

  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly workspaceRoot: string) {}

  get tasks(): Task[] {
    return this._tasks;
  }

  get warnings(): Warning[] {
    return this._warnings;
  }

  get specPaths(): Map<string, string> {
    return this._specPaths;
  }

  get epicPaths(): Map<string, string> {
    return this._epicPaths;
  }

  get specFiles(): string[] {
    return this._specFiles;
  }

  get epicFiles(): string[] {
    return this._epicFiles;
  }

  private getConfig() {
    const cfg = vscode.workspace.getConfiguration('kodoflow');
    return {
      basePath: cfg.get<string>('basePath', 'docs/product'),
      tasksFolder: cfg.get<string>('tasksFolder', 'tasks'),
      specsFolder: cfg.get<string>('specsFolder', 'specs'),
      epicsFolder: cfg.get<string>('epicsFolder', 'epics'),
    };
  }

  async refresh(): Promise<void> {
    this._tasks = [];
    this._warnings = [];
    this._specPaths.clear();
    this._epicPaths.clear();
    this._specFiles = [];
    this._epicFiles = [];

    const { basePath, tasksFolder, specsFolder, epicsFolder } = this.getConfig();

    await this.loadTasks(basePath, tasksFolder);
    await this.loadArtifacts(path.join(basePath, specsFolder), this._specPaths, this._specFiles);
    await this.loadArtifacts(path.join(basePath, epicsFolder), this._epicPaths, this._epicFiles);
    this.validateTasks();

    this._onDidChange.fire();
  }

  private async loadTasks(basePath: string, tasksFolder: string): Promise<void> {
    const statuses: Array<'backlog' | 'doing' | 'done'> = ['backlog', 'doing', 'done'];
    const seenIds = new Map<string, string>();

    for (const status of statuses) {
      const folderPath = path.join(this.workspaceRoot, basePath, tasksFolder, status);
      const folderUri = vscode.Uri.file(folderPath);

      let entries: [string, vscode.FileType][];
      try {
        entries = await vscode.workspace.fs.readDirectory(folderUri);
      } catch {
        continue; // folder doesn't exist yet
      }

      for (const [name, type] of entries) {
        if (type !== vscode.FileType.File || !name.endsWith('.md')) continue;

        const filePath = path.join(folderPath, name);
        let content: string;
        try {
          const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
          content = Buffer.from(bytes).toString('utf-8');
        } catch {
          this._warnings.push({
            type: 'invalidFrontmatter',
            message: `Could not read file: ${name}`,
            filePath,
          });
          continue;
        }

        const task = parseTask(content, filePath, status);
        if (!task) {
          this._warnings.push({
            type: 'invalidFrontmatter',
            message: `Invalid or missing frontmatter: ${name}`,
            filePath,
          });
          continue;
        }

        if (!task.id) {
          this._warnings.push({
            type: 'invalidFrontmatter',
            message: `Task missing id field: ${name}`,
            filePath,
          });
          continue;
        }

        if (seenIds.has(task.id)) {
          this._warnings.push({
            type: 'duplicateId',
            message: `Duplicate task ID ${task.id}: ${name} and ${seenIds.get(task.id)}`,
            filePath,
          });
        } else {
          seenIds.set(task.id, name);
        }

        this._tasks.push(task);
      }
    }
  }

  private async loadArtifacts(relFolder: string, target: Map<string, string>, files: string[]): Promise<void> {
    const folderPath = path.join(this.workspaceRoot, relFolder);
    const pattern = new vscode.RelativePattern(folderPath, '**/*.md');

    let uris: vscode.Uri[];
    try {
      uris = await vscode.workspace.findFiles(pattern);
    } catch {
      return;
    }

    for (const uri of uris) {
      // Index by relative path from workspace root and by filename stem
      const relPath = path.relative(this.workspaceRoot, uri.fsPath);
      target.set(relPath, uri.fsPath);
      target.set(path.basename(uri.fsPath, '.md'), uri.fsPath);
      files.push(uri.fsPath);
    }
  }

  private validateTasks(): void {
    const taskIds = new Set(this._tasks.map((t) => t.id));

    for (const task of this._tasks) {
      if (task.spec && !this._specPaths.has(task.spec) && !this._specPaths.has(path.basename(task.spec, '.md'))) {
        this._warnings.push({
          type: 'missingSpec',
          message: `Task ${task.id}: spec not found: ${task.spec}`,
          filePath: task.filePath,
        });
      }

      for (const dep of task.depends_on) {
        if (!taskIds.has(dep)) {
          this._warnings.push({
            type: 'unknownDependency',
            message: `Task ${task.id}: unknown dependency: ${dep}`,
            filePath: task.filePath,
          });
        }
      }
    }
  }

  private _refreshTimer?: ReturnType<typeof setTimeout>;

  private scheduleRefresh(): void {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => {
      this._refreshTimer = undefined;
      this.refresh();
    }, 150);
  }

  startWatching(context: vscode.ExtensionContext): void {
    const { basePath, tasksFolder } = this.getConfig();
    const watchDir = path.join(this.workspaceRoot, basePath, tasksFolder);
    const pattern = new vscode.RelativePattern(watchDir, '**/*.md');
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    const schedule = () => this.scheduleRefresh();
    watcher.onDidCreate(schedule, null, context.subscriptions);
    watcher.onDidChange(schedule, null, context.subscriptions);
    watcher.onDidDelete(schedule, null, context.subscriptions);

    context.subscriptions.push(watcher);
  }

  getTaskById(id: string): Task | undefined {
    return this._tasks.find((t) => t.id === id);
  }

  getNextTaskId(): number {
    if (this._tasks.length === 0) return 1;
    const nums = this._tasks
      .map((t) => {
        const m = t.id.match(/^TASK-(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => n > 0);
    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
  }
}
