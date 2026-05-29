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

export function adminUsersPath(query: unknown) {
  const page =
    typeof query === 'object' && query !== null && 'page' in query
      ? (query as { page?: unknown }).page
      : undefined;
  const pageText = Array.isArray(page) ? page[0] : page;
  const pageNumber = Number(pageText ?? 1);
  return Number.isInteger(pageNumber) && pageNumber > 1
    ? `/admin/users?page=${pageNumber}`
    : '/admin/users';
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
