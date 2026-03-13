import * as yaml from 'js-yaml';
import { Task } from './types';

function normalizeRef(value: string): string {
  const match = value.match(/^\[([^\]]+)\]\([^)]*\)$/);
  return match ? match[1] : value;
}

export function parseTask(
  content: string,
  filePath: string,
  status: 'backlog' | 'doing' | 'done'
): Task | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  let frontmatter: Record<string, unknown>;
  try {
    const parsed = yaml.load(match[1]);
    if (!parsed || typeof parsed !== 'object') return null;
    frontmatter = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  const body = content.slice(match[0].length).trim();

  return {
    id: String(frontmatter['id'] ?? ''),
    title: String(frontmatter['title'] ?? ''),
    type: String(frontmatter['type'] ?? ''),
    status,
    priority: String(frontmatter['priority'] ?? ''),
    readiness: String(frontmatter['readiness'] ?? ''),
    epic: normalizeRef(String(frontmatter['epic'] ?? '')),
    spec: normalizeRef(String(frontmatter['spec'] ?? '')),
    labels: Array.isArray(frontmatter['labels']) ? frontmatter['labels'].map(String) : [],
    code_paths: Array.isArray(frontmatter['code_paths']) ? frontmatter['code_paths'].map(String) : [],
    depends_on: Array.isArray(frontmatter['depends_on']) ? frontmatter['depends_on'].map(String) : [],
    blocks: [],
    estimate: String(frontmatter['estimate'] ?? ''),
    risk: String(frontmatter['risk'] ?? ''),
    filePath,
    body,
  };
}

export function generateTaskContent(data: {
  id: string;
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
}): string {
  const today = new Date().toISOString().split('T')[0];
  const labelsYaml =
    data.labels.length > 0
      ? `\nlabels:\n${data.labels.map((l) => `  - ${l}`).join('\n')}`
      : '\nlabels: []';

  return `---
id: ${data.id}
title: ${data.title}
type: ${data.type || 'feature'}
priority: ${data.priority || 'medium'}
readiness: ${data.readiness || 'draft'}
epic: ${data.epic || ''}
spec: ${data.spec || ''}${labelsYaml}
code_paths: []
depends_on: []
estimate: ${data.estimate || ''}
risk: ${data.risk || ''}
created_at: ${today}
---

## Summary

${data.summary || ''}

## Why

## Ready Checklist

- [ ] Spec defined
- [ ] Code area identified

## Acceptance Criteria

- [ ]

## Implementation Notes

## Completion Notes
`;
}
