type QuerySource = Record<string, unknown>;

export interface QueryValueInput {
  key: string;
  value: string | number | null | undefined;
}

export function queryObject(query: unknown): QuerySource {
  return typeof query === 'object' && query !== null ? query as QuerySource : {};
}

export function firstQueryValue(query: unknown, key: string) {
  const value = queryObject(query)[key];
  return Array.isArray(value) ? value[0] : value;
}

export function readTrimmedQuery(query: unknown, key: string) {
  const value = firstQueryValue(query, key);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function readEnumQuery<const T extends readonly string[]>(
  query: unknown,
  key: string,
  allowedValues: T,
): T[number] | undefined {
  const value = firstQueryValue(query, key);
  return typeof value === 'string' && allowedValues.includes(value)
    ? value as T[number]
    : undefined;
}

export function readPageQuery(query: unknown) {
  const pageNumber = Number(firstQueryValue(query, 'page') ?? 1);
  return Number.isInteger(pageNumber) && pageNumber > 1 ? pageNumber : undefined;
}

export function buildQueryString(values: QueryValueInput[]) {
  return values
    .filter(({ value }) => value !== null && value !== undefined && value !== '')
    .map(({ key, value }) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

export function buildQuerySuffix(values: QueryValueInput[]) {
  const queryString = buildQueryString(values);
  return queryString ? `?${queryString}` : '';
}

export function buildPathWithQuery(basePath: string, values: QueryValueInput[]) {
  return `${basePath}${buildQuerySuffix(values)}`;
}

export function querySuffixWithoutPage(values: QueryValueInput[]) {
  return buildQueryString(values.filter(({ key }) => key !== 'page'));
}
