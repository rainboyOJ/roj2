import { describe, expect, it } from 'vitest';

import {
  buildPathWithQuery,
  buildQueryString,
  buildQuerySuffix,
  querySuffixWithoutPage,
  readEnumQuery,
  readPageQuery,
  readTrimmedQuery,
} from '../src/http/query.ts';

describe('query helpers', () => {
  it('reads trimmed string and enum query values', () => {
    expect(readTrimmedQuery({ q: ' alice ' }, 'q')).toBe('alice');
    expect(readTrimmedQuery({ q: [' bob '] }, 'q')).toBe('bob');
    expect(readTrimmedQuery({ q: ' ' }, 'q')).toBeUndefined();
    expect(readEnumQuery({ status: 'pending' }, 'status', ['pending', 'approved'] as const))
      .toBe('pending');
    expect(readEnumQuery({ status: 'bad' }, 'status', ['pending', 'approved'] as const))
      .toBeUndefined();
  });

  it('normalizes page query values', () => {
    expect(readPageQuery({ page: '2' })).toBe(2);
    expect(readPageQuery({ page: '1' })).toBeUndefined();
    expect(readPageQuery({ page: 'bad' })).toBeUndefined();
  });

  it('builds query strings and paths with only meaningful values', () => {
    const values = [
      { key: 'page', value: 2 },
      { key: 'q', value: '张三' },
      { key: 'empty', value: '' },
      { key: 'missing', value: undefined },
    ];

    expect(buildQueryString(values)).toBe('page=2&q=%E5%BC%A0%E4%B8%89');
    expect(buildQuerySuffix(values)).toBe('?page=2&q=%E5%BC%A0%E4%B8%89');
    expect(buildPathWithQuery('/admin/users', values))
      .toBe('/admin/users?page=2&q=%E5%BC%A0%E4%B8%89');
    expect(querySuffixWithoutPage(values)).toBe('q=%E5%BC%A0%E4%B8%89');
  });

  it('keeps spaces encoded as %20 for stable links', () => {
    expect(buildQueryString([{ key: 'className', value: '1 班' }]))
      .toBe('className=1%20%E7%8F%AD');
  });
});
