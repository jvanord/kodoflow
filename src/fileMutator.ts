import * as vscode from 'vscode';
import * as path from 'path';

export async function moveFile(sourcePath: string, targetPath: string): Promise<void> {
  const sourceUri = vscode.Uri.file(sourcePath);
  const targetUri = vscode.Uri.file(targetPath);
  const targetDir = path.dirname(targetPath);
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(targetDir));
  await vscode.workspace.fs.rename(sourceUri, targetUri, { overwrite: false });
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  const uri = vscode.Uri.file(filePath);
  const dir = path.dirname(filePath);
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
}

export async function readFile(filePath: string): Promise<string> {
  const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
  return Buffer.from(bytes).toString('utf-8');
}

export async function deleteFile(filePath: string): Promise<void> {
  await vscode.workspace.fs.delete(vscode.Uri.file(filePath));
}
