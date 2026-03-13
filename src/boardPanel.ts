import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { RepositoryIndex } from './repositoryIndex';
import { TaskService } from './taskService';
import { ExtensionToWebview, WebviewToExtension } from './webviewBridge';

export class BoardPanel {
  public static readonly viewType = 'kodoflow.board';
  private static _current?: BoardPanel;

  private readonly _panel: vscode.WebviewPanel;

  private constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly index: RepositoryIndex,
    private readonly taskService: TaskService
  ) {
    this._panel = vscode.window.createWebviewPanel(
      BoardPanel.viewType,
      'KodoFlow Board',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    this._panel.webview.html = this.getHtml(this._panel.webview);

    this._panel.webview.onDidReceiveMessage((msg: WebviewToExtension) => {
      this.handleMessage(msg);
    });

    this.index.onDidChange(() => {
      this.postTasks();
    });

    this._panel.onDidDispose(() => {
      BoardPanel._current = undefined;
    });
  }

  public static createOrReveal(
    extensionUri: vscode.Uri,
    index: RepositoryIndex,
    taskService: TaskService
  ): void {
    if (BoardPanel._current) {
      BoardPanel._current._panel.reveal(vscode.ViewColumn.One);
      return;
    }
    BoardPanel._current = new BoardPanel(extensionUri, index, taskService);
  }

  private handleMessage(msg: WebviewToExtension): void {
    switch (msg.type) {
      case 'ready':
        this.postTasks();
        break;

      case 'moveTask':
        this.taskService.moveTask(msg.taskId, msg.targetStatus).catch((err: unknown) => {
          this.postMessage({ type: 'showError', message: String(err) });
          vscode.window.showErrorMessage(`KodoFlow: Failed to move task — ${err}`);
        });
        break;

      case 'openTask': {
        const task = this.index.getTaskById(msg.taskId);
        if (task) this.taskService.openFile(task.filePath);
        break;
      }

      case 'openSpec':
        this.taskService.openSpec(msg.taskId);
        break;

      case 'openEpic':
        this.taskService.openEpic(msg.taskId);
        break;

      case 'openCodePath':
        this.taskService.openCodePath(msg.taskId, msg.path);
        break;

      case 'createTask':
        vscode.commands.executeCommand('kodoflow.createTask');
        break;

      case 'refresh':
        this.index.refresh();
        break;
    }
  }

  private postMessage(msg: ExtensionToWebview): void {
    this._panel.webview.postMessage(msg);
  }

  private postTasks(): void {
    this.postMessage({ type: 'loadTasks', tasks: this.index.tasks });
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'board.css')
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'board.js')
    );
    const csp = webview.cspSource;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp}; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>KodoFlow</title>
</head>
<body>
  <div id="toolbar">
    <span id="toolbar-title">KodoFlow</span>
    <div>
      <button id="btn-create">+ Task</button>
      <button id="btn-refresh" title="Refresh index">&#8635;</button>
    </div>
  </div>

  <div id="board-container">
    <div id="board">
      <div class="column" id="col-backlog" data-status="backlog">
        <div class="column-header">
          <span>Backlog</span>
          <span class="column-count">0</span>
        </div>
        <div class="column-body" id="backlog-body"></div>
      </div>
      <div class="column" id="col-doing" data-status="doing">
        <div class="column-header">
          <span>Doing</span>
          <span class="column-count">0</span>
        </div>
        <div class="column-body" id="doing-body"></div>
      </div>
      <div class="column" id="col-done" data-status="done">
        <div class="column-header">
          <span>Done</span>
          <span class="column-count">0</span>
        </div>
        <div class="column-body" id="done-body"></div>
      </div>
    </div>

    <div id="detail-panel" class="hidden">
      <div id="detail-header">
        <div id="detail-header-text">
          <div id="detail-id"></div>
          <div id="detail-title"></div>
        </div>
        <button id="close-detail" title="Close">&#10005;</button>
      </div>
      <div id="detail-body">
        <div class="detail-section">
          <div class="detail-section-title">Metadata</div>
          <div class="detail-meta-grid" id="detail-meta-grid"></div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">Navigate</div>
          <div class="detail-nav-links" id="detail-nav-links"></div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">Details</div>
          <div class="detail-markdown" id="detail-body-content"></div>
        </div>
      </div>
    </div>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
