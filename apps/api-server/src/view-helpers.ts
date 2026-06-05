const submissionStatusLabels: Record<string, string> = {
  PENDING_DISPATCH: '等待派发',
  SENT_TO_JUDGE: '已发送到评测机',
  JUDGING: '评测中',
  FINISHED: '已完成',
  FAILED: '评测失败',
};

const judgeStatusLabels: Record<string, string> = {
  QUEUED: '排队中',
  PREPARING: '准备中',
  COMPILING: '编译中',
  RUNNING: '运行中',
  FINISHED: '已完成',
  FAILED: '失败',
};

const verdictLabels: Record<string, string> = {
  PENDING: '等待中',
  AC: 'AC',
  WA: 'WA',
  TLE: 'TLE',
  MLE: 'MLE',
  RE: 'RE',
  OLE: 'OLE',
  PE: 'PE',
  CE: 'CE',
  UNKNOWN: 'UNKNOWN',
  SYSTEM_ERROR: '系统错误',
};

const contestStatusLabels: Record<string, string> = {
  Upcoming: '即将开始',
  'Open Practice': '开放练习',
  Running: '进行中',
  Finished: '已结束',
};

const approvalStatusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
};

const roleLabels: Record<string, string> = {
  student: '学生',
  admin: '管理员',
};

function formatLabel(labels: Record<string, string>, value: string | null | undefined) {
  if (!value) {
    return '';
  }
  return labels[value] ?? value;
}

function scriptJson(value: unknown) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003C')
    .replaceAll('>', '\\u003E')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

export function createViewHelpers() {
  return {
    scriptJson,
    formatStatusLabel(status: string | null | undefined) {
      return formatLabel(submissionStatusLabels, status);
    },
    formatJudgeStatusLabel(status: string | null | undefined) {
      return formatLabel(judgeStatusLabels, status);
    },
    formatVerdictLabel(verdict: string | null | undefined) {
      return formatLabel(verdictLabels, verdict);
    },
    formatContestStatusLabel(status: string | null | undefined) {
      return formatLabel(contestStatusLabels, status);
    },
    formatApprovalStatusLabel(status: string | null | undefined) {
      return formatLabel(approvalStatusLabels, status);
    },
    formatRoleLabel(role: string | null | undefined) {
      return formatLabel(roleLabels, role);
    },
  };
}
