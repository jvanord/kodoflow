# KodoFlow

**KodoFlow** is a VS Code extension for teams practicing **Kodo Flow** — a documentation-driven task management methodology where tasks live in your repository as Markdown files and Git is the system of record.

---

## The Kodo Flow Methodology

Kodo Flow is a lightweight approach to task management built on a simple premise: **your repository is your project management system.**

Instead of maintaining a separate project tracker, tasks are stored as Markdown files inside the repo — versioned, diffable, and accessible to every tool in your workflow.

### Core principles

1. **Repository is the source of truth** — all task state lives in files, tracked by Git.
2. **Tasks are Markdown files** — readable by humans, editors, and AI agents alike.
3. **Folder location determines workflow state** — moving a file from `backlog/` to `doing/` is the state change.
4. **Git tracks task history** — who changed what and when is already answered by `git log`.
5. **Humans and AI agents share the same workflow** — no separate interfaces, no syncing, no drift.

### Repository structure

Kodo Flow assumes the following layout inside your project:

```
docs/
  product/
    roadmap.md
    epics/
    specs/
    tasks/
      backlog/
      doing/
      done/
```

### Task file format

Each task is a Markdown document with YAML frontmatter:

```markdown
---
id: TASK-118
title: Implement RSS feed parser
type: feature
status: backlog
priority: high
readiness: ready
epic: EPIC-3
spec: docs/product/specs/rss-mixtape.md
depends_on:
  - TASK-110
labels:
  - backend
code_paths:
  - src/rss
estimate: m
risk: medium
created_at: 2026-03-12
---

## Summary

Implement RSS feed parsing and normalization.

## Acceptance Criteria

- [ ] Parse RSS 2.0 metadata
- [ ] Handle malformed feeds
- [ ] Unit tests validate parsing
```

This format keeps planning and context co-located with the code, making it easy for both developers and AI agents to read, update, and act on tasks without leaving the repository.

---

## The KodoFlow Extension

KodoFlow is a VS Code extension that provides a smooth visual interface for working with Kodo Flow repositories. It reads your task files, renders a Kanban board, and writes changes back as file moves — no database, no sync, no external service.

### Features

- **Kanban board** — visualize tasks across Backlog, Doing, and Done columns
- **Drag-and-drop** — moving a card moves the underlying file
- **Task detail panel** — view metadata and rendered Markdown sections, with links to open the task file, spec, epic, or code paths in the editor
- **Task creation** — create new tasks from the command palette; the extension assigns the next ID, generates a slug, and writes the file to `backlog/`
- **Live file watching** — the board refreshes automatically when files change, including changes made by Git or AI agents

### Getting started

1. Open a workspace that follows the Kodo Flow folder structure.
2. Open the KodoFlow panel from the Activity Bar.
3. Your tasks appear as a Kanban board.

### Configuration

| Setting | Default | Description |
|---|---|---|
| `kodoflow.basePath` | `docs/product` | Base path for product documentation |
| `kodoflow.tasksFolder` | `tasks` | Tasks folder name (relative to basePath) |
| `kodoflow.specsFolder` | `specs` | Specs folder name (relative to basePath) |
| `kodoflow.epicsFolder` | `epics` | Epics folder name (relative to basePath) |

### Commands

| Command | Description |
|---|---|
| `kodoflow.openBoard` | Open the Kanban board |
| `kodoflow.createTask` | Create a new task |
| `kodoflow.refreshIndex` | Re-scan the repository |
| `kodoflow.moveTaskToBacklog` | Move a task to Backlog |
| `kodoflow.moveTaskToDoing` | Move a task to Doing |
| `kodoflow.moveTaskToDone` | Move a task to Done |

---

## Why this approach

Most project management tools live outside your codebase. That means two sources of truth, manual syncing, and a workflow that AI tools can't easily participate in.

Kodo Flow keeps everything in one place. Your tasks are files. Your history is commits. Your tooling is whatever reads Markdown — which is everything.

KodoFlow makes that workflow feel native inside VS Code.
