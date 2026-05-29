import { describe, expect, it } from 'vitest';

import { buildApp, type RanklistFilters } from '../src/app.ts';
import { createViewTestServices as createServices } from './view-test-services.ts';

describe('ranklist and contest views', () => {
  it('renders the ranklist page', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/ranklist',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('排行榜');
    expect(response.body).toContain('<table');
    expect(response.body).toContain('姓名');
    expect(response.body).toContain('班级');
    expect(response.body).toContain('通过题数');
    expect(response.body).toContain('Demo User (demo)');
    expect(response.body).toContain('1 班');
    expect(response.body).toContain('<select id="ranklist-filter-class" name="className">');
    expect(response.body).toContain('<option value="1 班">1 班</option>');
    expect(response.body).toContain('href="/ranklist"');
  });

  it('passes class filter to the ranklist service and keeps it selected', async () => {
    let receivedFilters: unknown;
    const app = buildApp(createServices({
      listRanklist: async (filters?: RanklistFilters) => {
        receivedFilters = filters;
        return [
          {
            rank: 1,
            username: 'alice',
            displayName: 'Alice',
            className: '2 班',
            acceptedCount: 1,
            submissionCount: 2,
            lastAcceptedAt: null,
          },
        ];
      },
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/ranklist?className=2%20%E7%8F%AD',
    });

    expect(response.statusCode).toBe(200);
    expect(receivedFilters).toEqual({ className: '2 班' });
    expect(response.body).toContain('<option value="2 班" selected>2 班</option>');
    expect(response.body).toContain('Alice (alice)');
  });

  it('renders the contests page', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/contests',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('比赛列表');
    expect(response.body).toContain('<table');
    expect(response.body).toContain('比赛名称');
    expect(response.body).toContain('操作');
    expect(response.body).toContain('May Practice Contest');
    expect(response.body).toContain('即将开始');
    expect(response.body).toContain('开放练习');
  });
});
