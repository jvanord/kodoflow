(function () {
  'use strict';

  const vscode = acquireVsCodeApi();

  /** @type {Array<import('../src/types').Task>} */
  let tasks = [];
  let draggedTaskId = null;
  let selectedTaskId = null;

  // ── Bootstrap ────────────────────────────────────────

  setupDropZones();
  setupToolbar();
  vscode.postMessage({ type: 'ready' });

  // ── Message handler ───────────────────────────────────

  window.addEventListener('message', (event) => {
    const msg = event.data;
    switch (msg.type) {
      case 'loadTasks':
        tasks = msg.tasks;
        renderBoard();
        // Re-render detail panel if a task is selected
        if (selectedTaskId) {
          const task = tasks.find((t) => t.id === selectedTaskId);
          if (task) renderDetail(task);
          else closeDetail();
        }
        break;
      case 'showError':
        console.error('KodoFlow:', msg.message);
        break;
    }
  });

  // ── Board rendering ───────────────────────────────────

  function renderBoard() {
    const buckets = { backlog: [], doing: [], done: [] };
    for (const task of tasks) {
      if (buckets[task.status]) buckets[task.status].push(task);
    }

    for (const [status, statusTasks] of Object.entries(buckets)) {
      const body = document.getElementById(`${status}-body`);
      const count = document.querySelector(`#col-${status} .column-count`);

      body.innerHTML = '';
      if (count) count.textContent = String(statusTasks.length);

      if (statusTasks.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:12px 8px;opacity:0.4;font-size:11px;text-align:center;';
        empty.textContent = 'Drop tasks here';
        body.appendChild(empty);
        continue;
      }

      for (const task of statusTasks) {
        body.appendChild(createCard(task));
      }
    }
  }

  function createCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card' + (task.id === selectedTaskId ? ' selected' : '');
    card.draggable = true;
    card.dataset.taskId = task.id;

    const priorityBadge = task.priority
      ? `<span class="badge badge-priority-${task.priority.toLowerCase()}">${cap(task.priority)}</span>`
      : '';
    const typeBadge = task.type
      ? `<span class="badge badge-type">${cap(task.type)}</span>`
      : '';
    const estimateBadge = task.estimate
      ? `<span class="badge badge-estimate">${task.estimate.toUpperCase()}</span>`
      : '';
    const epicBadge = task.epic
      ? `<span class="badge badge-epic">${esc(task.epic)}</span>`
      : '';

    card.innerHTML = `
      <div class="task-card-id">${esc(task.id)}</div>
      <div class="task-card-title">${esc(task.title)}</div>
      <div class="task-card-meta">${priorityBadge}${typeBadge}${estimateBadge}${epicBadge}</div>
    `;

    card.addEventListener('click', () => {
      selectedTaskId = task.id;
      // Update selected styling without full re-render
      document.querySelectorAll('.task-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      renderDetail(task);
    });

    card.addEventListener('dragstart', (e) => {
      draggedTaskId = task.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedTaskId = null;
    });

    return card;
  }

  // ── Drop zones ────────────────────────────────────────

  function setupDropZones() {
    document.querySelectorAll('.column-body').forEach((col) => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', (e) => {
        // Only remove class if leaving the column body itself, not a child
        if (!col.contains(e.relatedTarget)) {
          col.classList.remove('drag-over');
        }
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');

        if (!draggedTaskId) return;
        const targetStatus = col.closest('.column').dataset.status;
        const task = tasks.find((t) => t.id === draggedTaskId);
        if (!task || task.status === targetStatus) return;

        vscode.postMessage({ type: 'moveTask', taskId: draggedTaskId, targetStatus });
      });
    });
  }

  // ── Detail panel ──────────────────────────────────────

  function renderDetail(task) {
    document.getElementById('detail-panel').classList.remove('hidden');
    document.getElementById('detail-id').textContent = task.id;
    document.getElementById('detail-title').textContent = task.title;

    // Metadata grid
    const grid = document.getElementById('detail-meta-grid');
    grid.innerHTML = '';

    const fields = [
      ['Type', task.type],
      ['Priority', task.priority],
      ['Readiness', task.readiness],
      ['Estimate', task.estimate],
      ['Risk', task.risk],
      ['Epic', task.epic],
      ['Spec', task.spec],
    ].filter(([, v]) => v);

    for (const [label, value] of fields) {
      const item = document.createElement('div');
      item.className = 'detail-meta-item';
      item.innerHTML = `<label>${esc(label)}</label><span>${esc(String(value))}</span>`;
      grid.appendChild(item);
    }

    if (task.labels && task.labels.length > 0) {
      const item = document.createElement('div');
      item.className = 'detail-meta-item detail-meta-full';
      item.innerHTML = `<label>Labels</label><span>${task.labels.map((l) => `<span class="badge badge-type">${esc(l)}</span>`).join(' ')}</span>`;
      grid.appendChild(item);
    }

    // Navigation links
    const nav = document.getElementById('detail-nav-links');
    nav.innerHTML = '';

    addNavLink(nav, '\u{1F4C4} Open Task File', () =>
      vscode.postMessage({ type: 'openTask', taskId: task.id })
    );
    addNavLink(
      nav,
      '\u{1F4CB} Open Spec',
      () => vscode.postMessage({ type: 'openSpec', taskId: task.id }),
      !task.spec
    );
    addNavLink(
      nav,
      '\u{1F5FA} Open Epic',
      () => vscode.postMessage({ type: 'openEpic', taskId: task.id }),
      !task.epic
    );

    if (task.code_paths && task.code_paths.length > 0) {
      for (const p of task.code_paths) {
        addNavLink(nav, `\u{1F4BB} ${p}`, () =>
          vscode.postMessage({ type: 'openCodePath', taskId: task.id, path: p })
        );
      }
    }

    // Markdown body
    const bodyEl = document.getElementById('detail-body-content');
    bodyEl.innerHTML = task.body
      ? renderMarkdown(task.body)
      : '<em>No description</em>';
  }

  function addNavLink(container, label, onClick, disabled = false) {
    const btn = document.createElement('button');
    btn.className = 'nav-link';
    btn.textContent = label;
    btn.disabled = disabled;
    if (!disabled) btn.addEventListener('click', onClick);
    container.appendChild(btn);
  }

  function closeDetail() {
    selectedTaskId = null;
    document.getElementById('detail-panel').classList.add('hidden');
    document.querySelectorAll('.task-card').forEach((c) => c.classList.remove('selected'));
  }

  // ── Markdown renderer ─────────────────────────────────

  function renderMarkdown(md) {
    const lines = md.split('\n');
    let html = '';
    let inList = false;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h2>${esc(line.slice(3))}</h2>`;
      } else if (/^- \[x\] /i.test(line)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li><input type="checkbox" checked disabled> ${esc(line.slice(6))}</li>`;
      } else if (/^- \[ \] /.test(line)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li><input type="checkbox" disabled> ${esc(line.slice(6))}</li>`;
      } else if (line.startsWith('- ')) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li>${esc(line.slice(2))}</li>`;
      } else if (line.trim() === '') {
        if (inList) { html += '</ul>'; inList = false; }
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        if (line.trim()) html += `<p>${esc(line)}</p>`;
      }
    }

    if (inList) html += '</ul>';
    return html || '<em>No description</em>';
  }

  // ── Toolbar ───────────────────────────────────────────

  function setupToolbar() {
    document.getElementById('btn-create').addEventListener('click', () => {
      vscode.postMessage({ type: 'createTask' });
    });

    document.getElementById('btn-refresh').addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });

    document.getElementById('close-detail').addEventListener('click', closeDetail);
  }

  // ── Helpers ───────────────────────────────────────────

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cap(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
})();
