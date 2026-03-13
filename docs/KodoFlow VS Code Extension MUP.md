# KodoFlow VS Code Extension

### Minimum Useful Product (MUP) Specification

## Overview

**KodoFlow** is a VS Code extension that provides a Kanban-style project management interface for repositories that store tasks as Markdown files.

The extension is designed for **documentation-driven development** workflows where:

- product planning lives inside `/docs`
- tasks are stored as Markdown files
- Git is the system of record
- both humans and AI agents interact with the same task files

KodoFlow acts as a **visual interface over repository data**, not a separate project management system.

All task state must remain inside the repository.

---

# Core Design Principles

1. **Repository is the source of truth**
2. **Tasks are Markdown files**
3. **Folder location determines workflow state**
4. **Git tracks task history**
5. **AI agents and humans share the same workflow**
6. **The extension never stores a task database**

---

# Supported Repository Structure

KodoFlow assumes the following structure:

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

Example task file:

```
docs/product/tasks/backlog/TASK-118-rss-parser.md

```

---

# Task File Format

Tasks are Markdown documents with YAML frontmatter metadata.

Example:

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
  - feeds

code_paths:
  - src/rss
  - src/feeds/parser

estimate: m
risk: medium
created_at: 2026-03-12
---

## Summary

Implement RSS feed parsing and normalization.

## Why

Required for mixtape feed ingestion.

## Ready Checklist

- [x] Spec defined
- [x] Code area identified

## Acceptance Criteria

- [ ] Parse RSS 2.0 metadata
- [ ] Parse enclosure tags
- [ ] Handle malformed feeds
- [ ] Unit tests validate parsing

## Implementation Notes

## Completion Notes
```

---

# Extension Identity

```
extension id: kodoflow
command prefix: kodoflow
settings prefix: kodoflow
```

Example commands:

```
kodoflow.openBoard
kodoflow.createTask
kodoflow.moveTaskToDoing
kodoflow.openSpec
```

---

# Minimum Useful Product Goals

The MUP must allow developers to:

1. View tasks in a Kanban board
2. Move tasks between workflow states
3. Open task/spec/code files from tasks
4. Create new tasks
5. Automatically detect file changes
6. Work entirely from repository data

---

# UI Architecture

KodoFlow consists of two UI components:

1. **Kanban Board**
2. **Task Detail Panel**

Both are implemented using **VS Code Webviews**.

---

# Activity Bar Integration

KodoFlow adds a new sidebar container:

```
KodoFlow
    Kanban Board
    Tasks
    Epics
    Specs
```

For the MUP only **Kanban Board** must be fully functional.

---

# Kanban Board

The Kanban board is the primary interface.

Columns correspond directly to folders:

```
Backlog | Doing | Done
```

Folder mapping:

```
docs/product/tasks/backlog
docs/product/tasks/doing
docs/product/tasks/done
```

Example card:

```
TASK-118
Implement RSS parser

Priority: High
Type: Feature
Epic: EPIC-3
Estimate: M
```

Cards support drag-and-drop.

Moving a card moves the underlying file.

Example:

```
backlog/TASK-118.md → doing/TASK-118.md
```

---

# Task Detail Panel

Clicking a card opens task details.

Displayed metadata:

```
Task ID
Title
Type
Priority
Readiness
Epic
Spec
Estimate
Risk
```

Rendered Markdown sections:

```
Summary
Why
Ready Checklist
Acceptance Criteria
Implementation Notes
Completion Notes
```

Navigation links:

```
Open Task File
Open Spec
Open Epic
Open Code Paths
```

---

# File Navigation

KodoFlow integrates with the VS Code editor.

Supported navigation:

### Open Task File

Opens the Markdown task document.

### Open Spec

Opens the file referenced in:

```
spec: docs/product/specs/rss-mixtape.md
```

### Open Epic

Opens the epic document.

### Open Code Path

Opens files or folders listed in:

```
code_paths:
```

Behavior:

- file → open editor
- directory → reveal in explorer

---

# Task Creation

Command:

```
kodoflow.createTask
```

The UI form collects:

```
Title
Type
Priority
Readiness
Epic
Spec
Labels
Estimate
Risk
Summary
```

The extension then:

1. determines the next available task ID
2. generates a slug from the title
3. creates a Markdown file in backlog

Example:

```
docs/product/tasks/backlog/TASK-119-feed-normalization.md
```

---

# Task Movement

Tasks can be moved by:

- dragging Kanban cards
- command palette commands

Commands:

```
kodoflow.moveTaskToBacklog
kodoflow.moveTaskToDoing
kodoflow.moveTaskToDone
```

Movement performs a file move.

Example:

```
git mv backlog/TASK-118.md doing/
```

Frontmatter `status` may optionally be updated.

---

# Task ID Allocation

Task IDs use the format:

```
TASK-<number>
```

Examples:

```
TASK-1
TASK-42
TASK-118
TASK-2048
```

Algorithm:

1. scan all task files
2. extract numeric portion
3. assign max + 1

IDs must never be reused.

---

# Repository Index

KodoFlow builds an in-memory index of project artifacts.

Files scanned:

```
docs/product/tasks/{backlog,doing,done}/*.md
docs/product/specs/**/*.md
docs/product/epics/**/*.md
```

The index contains:

```
tasks
specs
epics
dependencies
```

This index powers the Kanban board and navigation.

---

# File Watching

KodoFlow watches task directories for changes.

Supported events:

```
task created
task modified
task moved
task deleted
```

The board refreshes automatically.

This ensures compatibility with:

- manual edits
- Git merges
- AI agents updating tasks

---

# Core Commands

Available in the command palette:

```
kodoflow.openBoard
kodoflow.createTask
kodoflow.refreshIndex
kodoflow.openTaskFile
kodoflow.openSpec
kodoflow.openEpic
kodoflow.openCodePath
kodoflow.moveTaskToBacklog
kodoflow.moveTaskToDoing
kodoflow.moveTaskToDone
```

---

# Extension Settings

User-configurable settings:

```
kodoflow.basePath
default: docs/product

kodoflow.tasksFolder
default: tasks

kodoflow.specsFolder
default: specs

kodoflow.epicsFolder
default: epics
```

These allow adaptation to similar repo structures.

---

# Internal Data Model

Normalized task structure used internally:

```
Task
    id
    title
    type
    status
    priority
    readiness
    epic
    spec
    labels
    code_paths
    depends_on
    blocks
    estimate
    risk
    filePath
```

---

# Error Handling

KodoFlow must tolerate imperfect repositories.

Warnings include:

```
missing spec file
missing epic file
unknown dependency
duplicate task ID
invalid frontmatter
```

Warnings appear in a **Project Health** panel.

They should not prevent tasks from loading.

---

# Minimum Implementation Modules

Suggested extension structure:

```
src/
    extension.ts
    repositoryIndex.ts
    taskParser.ts
    taskService.ts
    fileMutator.ts
    boardViewProvider.ts
    webviewBridge.ts
```

Responsibilities:

```
repositoryIndex.ts   → scans and indexes repo files
taskParser.ts        → parses Markdown tasks
taskService.ts       → manages task operations
fileMutator.ts       → performs filesystem changes
boardViewProvider.ts → Kanban UI provider
webviewBridge.ts     → communication between UI and extension
```

---

# Success Criteria for MUP

KodoFlow is considered complete when it can:

1. Detect a repository using the documented task structure
2. Render a Kanban board
3. Open task/spec/code files in the editor
4. Move tasks between columns
5. Create new tasks
6. Automatically update when files change

At this point the extension becomes immediately useful for development workflows.

---

# Future Enhancements (Not Part of MUP)

Planned improvements for later versions:

```
dependency graph visualization
epic progress dashboards
AI task suggestions
task creation from code selection
advanced filtering
multi-project workspace support
```

These features are intentionally excluded from the MUP to keep implementation focused and achievable.

---

# Summary

KodoFlow provides a lightweight project management interface for repositories that use Markdown task files.

Key benefits:

- Git-native task history
- AI-compatible workflows
- No external services required
- Full integration with the developer IDE

The extension functions as a **visual orchestration layer for documentation-driven development** while preserving the repository as the single source of truth.
