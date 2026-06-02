(function () {
  const root = document.querySelector('#submissionDetail');
  if (!root) {
    return;
  }

  const submissionId = root.dataset.submissionId;
  if (!submissionId) {
    return;
  }

  const terminalStatuses = new Set(['FINISHED', 'FAILED']);
  const statusText = {
    PENDING_DISPATCH: '等待派发',
    SENT_TO_JUDGE: '已发送评测',
    JUDGING: '评测中',
    FINISHED: '已完成',
    FAILED: '失败',
  };
  const judgeStatusText = {
    QUEUED: '排队中',
    PREPARING: '准备中',
    COMPILING: '编译中',
    RUNNING: '运行中',
    FINISHED: '已完成',
    FAILED: '失败',
  };
  const verdictText = {
    PENDING: '等待评测',
    AC: '通过',
    WA: '答案错误',
    TLE: '时间超限',
    MLE: '内存超限',
    RE: '运行错误',
    OLE: '输出超限',
    PE: '格式错误',
    CE: '编译错误',
    UNKNOWN: '未知',
    SYSTEM_ERROR: '系统错误',
  };

  const textOrRaw = (map, value, fallback) => {
    if (!value) {
      return fallback;
    }
    return map[value] || value;
  };

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = String(value);
    }
  };

  const verdictClass = (verdict) => {
    if (verdict === 'AC') {
      return 'ac';
    }
    if (verdict === 'PENDING') {
      return 'pending';
    }
    return 'failed';
  };

  const appendTextCell = (row, value, className) => {
    const cell = document.createElement('td');
    if (className) {
      cell.className = className;
    }
    cell.textContent = String(value);
    row.appendChild(cell);
    return cell;
  };

  const renderCaseResults = (caseResults) => {
    const container = document.querySelector('#submissionCaseResults');
    if (!container) {
      return;
    }

    container.replaceChildren();
    if (!Array.isArray(caseResults) || caseResults.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'soft-note';
      empty.textContent = '暂无测试点结果';
      container.appendChild(empty);
      return;
    }

    const shell = document.createElement('div');
    shell.className = 'table-shell';
    const table = document.createElement('table');
    table.className = 'data-table';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['#', '结果', 'CPU', '实际耗时', '内存', '退出码', '信号', '错误码'].forEach((label) => {
      const cell = document.createElement('th');
      cell.textContent = label;
      headerRow.appendChild(cell);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    caseResults.forEach((item) => {
      const row = document.createElement('tr');
      appendTextCell(row, `#${item.seq_id}`, 'table-code');

      const verdictCell = document.createElement('td');
      const chip = document.createElement('span');
      chip.className = `status-chip ${verdictClass(item.verdict)}`;
      chip.textContent = textOrRaw(verdictText, item.verdict, '等待评测');
      verdictCell.appendChild(chip);
      row.appendChild(verdictCell);

      appendTextCell(row, `${item.cpu_time_ms} ms`, 'table-code');
      appendTextCell(row, `${item.real_time_ms} ms`, 'table-code');
      appendTextCell(row, `${item.memory_kb} KB`, 'table-code');
      appendTextCell(row, item.exit_code, 'table-code');
      appendTextCell(row, item.signal, 'table-code');
      appendTextCell(row, item.error_code, 'table-code');
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    shell.appendChild(table);
    container.appendChild(shell);
  };

  const renderMessage = (message) => {
    const panel = document.querySelector('#submissionMessagePanel');
    const messageBlock = document.querySelector('#submissionMessage');
    if (!panel || !messageBlock) {
      return;
    }
    const hasMessage = Boolean(message);
    panel.hidden = !hasMessage;
    messageBlock.textContent = hasMessage ? message : '';
  };

  const renderPendingHint = (isTerminal) => {
    const hint = document.querySelector('#submissionPendingHint');
    if (hint) {
      hint.hidden = isTerminal;
    }
  };

  const applySubmission = (submission) => {
    setText('#submissionStatus', textOrRaw(statusText, submission.status, '未知'));
    setText('#submissionVerdict', textOrRaw(verdictText, submission.verdict, '等待评测'));
    setText('#submissionScore', submission.score ?? 0);
    setText('#submissionJudgeStatus', textOrRaw(judgeStatusText, submission.judgeStatus, '等待评测'));
    renderMessage(submission.message);
    renderCaseResults(submission.caseResults);
    const isTerminal = terminalStatuses.has(submission.status);
    root.dataset.terminal = isTerminal ? 'true' : 'false';
    renderPendingHint(isTerminal);
    return root.dataset.terminal === 'true';
  };

  const poll = async () => {
    try {
      const response = await fetch(`/api/submissions/${encodeURIComponent(submissionId)}`, {
        credentials: 'same-origin',
        headers: {
          accept: 'application/json',
        },
      });
      if (!response.ok) {
        return true;
      }
      const submission = await response.json();
      return applySubmission(submission);
    } catch (_error) {
      return false;
    }
  };

  if (root.dataset.terminal === 'true') {
    return;
  }

  const interval = window.setInterval(async () => {
    const done = await poll();
    if (done) {
      window.clearInterval(interval);
    }
  }, 2000);
})();
