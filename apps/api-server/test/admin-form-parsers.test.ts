import { describe, expect, it } from 'vitest';

import {
  adminUsersPath,
  asStringArray,
  dictionaryFormValues,
  dictionaryInputFromBody,
  enabledLanguagesInputFromBody,
  paginationSettingsInputFromBody,
  parseBooleanField,
  parseNumberField,
  parseUserIds,
  problemFormValues,
  problemInputFromBody,
  problemSetFormValues,
  problemSetInputFromBody,
} from '../src/routes/admin/form-parsers.ts';

describe('admin form parsers', () => {
  it('normalizes string and array fields', () => {
    expect(asStringArray(undefined)).toEqual([]);
    expect(asStringArray('python')).toEqual(['python']);
    expect(asStringArray(['cpp', 'python'])).toEqual(['cpp', 'python']);
  });

  it('parses checkbox style boolean and number fields', () => {
    expect(parseBooleanField('true')).toBe(true);
    expect(parseBooleanField('false')).toBe(false);
    expect(parseBooleanField(undefined)).toBe(false);
    expect(parseNumberField('50')).toBe(50);
    expect(parseNumberField(undefined, 20)).toBe(20);
  });

  it('parses selected user ids and preserves the current admin users page', () => {
    expect(parseUserIds([' user-1 ', '', 'user-2'])).toEqual(['user-1', 'user-2']);
    expect(parseUserIds('user-1')).toEqual(['user-1']);
    expect(parseUserIds(undefined)).toEqual([]);
    expect(adminUsersPath({ page: '2' })).toBe('/admin/users?page=2');
    expect(adminUsersPath({ page: '1' })).toBe('/admin/users');
    expect(adminUsersPath({ page: 'bad' })).toBe('/admin/users');
  });

  it('parses problem form input and preserves invalid form values', () => {
    const raw = {
      pid: '1001',
      title: 'New Problem',
      statementMarkdown: 'desc',
      allowLanguages: ['cpp', 'python'],
      isVisible: 'true',
    };

    expect(problemInputFromBody(raw)).toEqual({
      pid: '1001',
      title: 'New Problem',
      statementMarkdown: 'desc',
      allowLanguages: ['cpp', 'python'],
      isVisible: true,
    });
    expect(problemFormValues({ ...raw, title: undefined }, 'problem-1')).toEqual({
      id: 'problem-1',
      pid: '1001',
      title: '',
      statementMarkdown: 'desc',
      allowLanguages: ['cpp', 'python'],
      isVisible: true,
    });
  });

  it('parses problem set form input and default form values', () => {
    expect(problemSetInputFromBody({
      title: '训练',
      contentMarkdown: '- [[pid:1000]]',
    })).toEqual({
      title: '训练',
      contentMarkdown: '- [[pid:1000]]',
    });
    expect(problemSetFormValues({
      title: '训练',
      contentMarkdown: '- [[pid:1000]]',
    }, 'set-1')).toEqual({
      id: 'set-1',
      title: '训练',
      contentMarkdown: '- [[pid:1000]]',
      problemRefs: [],
      isPublished: false,
      publishedAtText: null,
      updatedAtText: '',
    });
  });

  it('parses dictionary, language, and pagination settings forms', () => {
    const raw = {
      name: '1 班',
      isActive: 'true',
      order: '3',
    };

    expect(dictionaryInputFromBody(raw)).toEqual({
      name: '1 班',
      isActive: true,
      order: 3,
    });
    expect(dictionaryFormValues({ name: undefined, isActive: 'true' })).toEqual({
      name: '',
      isActive: 'true',
      order: '0',
    });
    expect(enabledLanguagesInputFromBody({ enabledLanguages: 'python' })).toEqual({
      enabledLanguages: ['python'],
    });
    expect(paginationSettingsInputFromBody({ listPageSize: '50' })).toEqual({
      listPageSize: 50,
    });
  });
});
