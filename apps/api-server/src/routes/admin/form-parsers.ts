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
  if (typeof query !== 'object' || query === null) {
    return {};
  }

  const raw = query as { q?: unknown; approvalStatus?: unknown; className?: unknown };
  const q = Array.isArray(raw.q) ? raw.q[0] : raw.q;
  const approvalStatus = Array.isArray(raw.approvalStatus)
    ? raw.approvalStatus[0]
    : raw.approvalStatus;
  const className = Array.isArray(raw.className) ? raw.className[0] : raw.className;
  const filters: {
    q?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    className?: string;
  } = {};

  if (typeof q === 'string' && q.trim()) {
    filters.q = q.trim();
  }
  if (
    approvalStatus === 'pending'
    || approvalStatus === 'approved'
    || approvalStatus === 'rejected'
  ) {
    filters.approvalStatus = approvalStatus;
  }
  if (typeof className === 'string' && className.trim()) {
    filters.className = className.trim();
  }

  return filters;
}

export function adminUsersPath(query: unknown) {
  const raw = typeof query === 'object' && query !== null
    ? query as { page?: unknown; q?: unknown; approvalStatus?: unknown; className?: unknown }
    : {};
  const pageText = Array.isArray(raw.page) ? raw.page[0] : raw.page;
  const pageNumber = Number(pageText ?? 1);
  const queryParts = [];

  if (Number.isInteger(pageNumber) && pageNumber > 1) {
    queryParts.push(`page=${pageNumber}`);
  }

  const filters = parseAdminUserListFilters(raw);
  if (filters.q) {
    queryParts.push(`q=${encodeURIComponent(filters.q)}`);
  }
  if (filters.approvalStatus) {
    queryParts.push(`approvalStatus=${encodeURIComponent(filters.approvalStatus)}`);
  }
  if (filters.className) {
    queryParts.push(`className=${encodeURIComponent(filters.className)}`);
  }

  return queryParts.length ? `/admin/users?${queryParts.join('&')}` : '/admin/users';
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
