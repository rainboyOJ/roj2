import {
  buildPathWithQuery,
  readEnumQuery,
  readPageQuery,
  readTrimmedQuery,
  type QueryValueInput,
} from '../../http/query.ts';

export type AdminFormBody = Record<string, string | string[] | undefined>;

export function asStringArray(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
}

export function parseBooleanField(value: string | string[] | undefined) {
  const text = Array.isArray(value) ? value[0] : value;
  return text === 'true';
}

export function parseNumberField(value: string | string[] | undefined, fallback = 0) {
  const text = Array.isArray(value) ? value[0] : value;
  return Number(text ?? String(fallback));
}

export function parseUserIds(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .filter((userId): userId is string => typeof userId === 'string')
    .map((userId) => userId.trim())
    .filter(Boolean);
}

export function parseAdminUserListFilters(query: unknown) {
  const filters: {
    q?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    className?: string;
  } = {};
  const q = readTrimmedQuery(query, 'q');
  const approvalStatus = readEnumQuery(query, 'approvalStatus', [
    'pending',
    'approved',
    'rejected',
  ] as const);
  const className = readTrimmedQuery(query, 'className');

  if (q) {
    filters.q = q;
  }
  if (approvalStatus) {
    filters.approvalStatus = approvalStatus;
  }
  if (className) {
    filters.className = className;
  }

  return filters;
}

export function adminUsersQueryParts(query: unknown): QueryValueInput[] {
  const filters = parseAdminUserListFilters(query);
  return [
    { key: 'page', value: readPageQuery(query) },
    { key: 'q', value: filters.q },
    { key: 'approvalStatus', value: filters.approvalStatus },
    { key: 'className', value: filters.className },
  ];
}

export function adminUsersPath(query: unknown) {
  return buildPathWithQuery('/admin/users', adminUsersQueryParts(query));
}

export function adminProblemsQueryParts(query: unknown): QueryValueInput[] {
  return [
    { key: 'page', value: readPageQuery(query) },
    { key: 'q', value: readTrimmedQuery(query, 'q') },
    { key: 'visibility', value: readEnumQuery(query, 'visibility', ['visible', 'hidden'] as const) },
  ];
}

export function adminProblemsPath(query: unknown) {
  return buildPathWithQuery('/admin/problems', adminProblemsQueryParts(query));
}

export function adminProblemSetsPath(query: unknown) {
  return buildPathWithQuery('/admin/problem-sets', [
    { key: 'page', value: readPageQuery(query) },
  ]);
}

export function problemInputFromBody(raw: AdminFormBody) {
  return {
    pid: raw.pid,
    title: raw.title,
    statementMarkdown: raw.statementMarkdown,
    allowLanguages: asStringArray(raw.allowLanguages),
    isVisible: parseBooleanField(raw.isVisible),
  };
}

export function problemFormValues(raw: AdminFormBody, id = '') {
  return {
    id,
    pid: String(raw.pid || ''),
    title: String(raw.title || ''),
    statementMarkdown: String(raw.statementMarkdown || ''),
    allowLanguages: asStringArray(raw.allowLanguages),
    isVisible: parseBooleanField(raw.isVisible),
  };
}

export function problemSetInputFromBody(raw: AdminFormBody) {
  return {
    title: raw.title,
    contentMarkdown: raw.contentMarkdown,
  };
}

export function problemSetFormValues(raw: AdminFormBody, id = '') {
  return {
    id,
    title: String(raw.title || ''),
    contentMarkdown: String(raw.contentMarkdown || ''),
    problemRefs: [],
    isPublished: false,
    publishedAtText: null,
    updatedAtText: '',
  };
}

export function dictionaryInputFromBody(raw: AdminFormBody) {
  return {
    name: raw.name,
    isActive: parseBooleanField(raw.isActive),
    order: parseNumberField(raw.order, 0),
  };
}

export function dictionaryFormValues(raw: AdminFormBody) {
  return {
    name: String(raw.name || ''),
    isActive: String(raw.isActive || ''),
    order: String(raw.order || '0'),
  };
}

export function enabledLanguagesInputFromBody(raw: AdminFormBody) {
  return {
    enabledLanguages: asStringArray(raw.enabledLanguages),
  };
}

export function paginationSettingsInputFromBody(raw: AdminFormBody) {
  return {
    listPageSize: parseNumberField(raw.listPageSize),
  };
}
