import * as vscode from 'vscode';
import * as path from 'path';
import { RepositoryIndex } from './repositoryIndex';
import { Task } from './types';

type TreeNode =
  | { kind: 'category'; id: string; label: string }
  | { kind: 'statusGroup'; status: 'backlog' | 'doing' | 'done' }
  | { kind: 'task'; task: Task }
  | { kind: 'file'; label: string; filePath: string };

export class ExplorerProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly index: RepositoryIndex) {
    index.onDidChange(() => this._onDidChangeTreeData.fire());
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    switch (node.kind) {
      case 'category': {
        const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Expanded);
        item.id = node.id;
        item.contextValue = 'category';
        return item;
      }

      case 'statusGroup': {
        const count = this.index.tasks.filter((t) => t.status === node.status).length;
        const label = node.status.charAt(0).toUpperCase() + node.status.slice(1);
        const item = new vscode.TreeItem(
          `${label} (${count})`,
          vscode.TreeItemCollapsibleState.Expanded
        );
        item.id = `statusGroup-${node.status}`;
        item.contextValue = 'statusGroup';
        return item;
      }

      case 'task': {
        const item = new vscode.TreeItem(
          `${node.task.id}: ${node.task.title}`,
          vscode.TreeItemCollapsibleState.None
        );
        item.description = node.task.priority || undefined;
        item.tooltip = [node.task.type, node.task.priority, node.task.readiness]
          .filter(Boolean)
          .join(' · ');
        item.resourceUri = vscode.Uri.file(node.task.filePath);
        item.command = {
          command: 'vscode.open',
          title: 'Open Task',
          arguments: [vscode.Uri.file(node.task.filePath)],
        };
        item.contextValue = 'task';
        return item;
      }

      case 'file': {
        const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.None);
        item.resourceUri = vscode.Uri.file(node.filePath);
        item.command = {
          command: 'vscode.open',
          title: 'Open File',
          arguments: [vscode.Uri.file(node.filePath)],
        };
        item.contextValue = 'file';
        return item;
      }
    }
  }

  getChildren(node?: TreeNode): TreeNode[] {
    if (!node) {
      return [
        { kind: 'category', id: 'cat-epics', label: 'Epics' },
        { kind: 'category', id: 'cat-specs', label: 'Specs' },
        { kind: 'category', id: 'cat-tasks', label: 'Tasks' },
      ];
    }

    switch (node.kind) {
      case 'category':
        if (node.id === 'cat-epics') {
          return this.index.epicFiles.map((fp) => ({
            kind: 'file' as const,
            label: path.basename(fp, '.md'),
            filePath: fp,
          }));
        }
        if (node.id === 'cat-specs') {
          return this.index.specFiles.map((fp) => ({
            kind: 'file' as const,
            label: path.basename(fp, '.md'),
            filePath: fp,
          }));
        }
        if (node.id === 'cat-tasks') {
          return [
            { kind: 'statusGroup', status: 'backlog' as const },
            { kind: 'statusGroup', status: 'doing' as const },
            { kind: 'statusGroup', status: 'done' as const },
          ];
        }
        return [];

      case 'statusGroup':
        return this.index.tasks
          .filter((t) => t.status === node.status)
          .map((task) => ({ kind: 'task' as const, task }));

      default:
        return [];
    }
  }
}
