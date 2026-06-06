// 这组测试覆盖所有页面共享的布局入口和本地静态资源。
import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';
import { adminUser, sessionCookie } from './helpers.ts';
import { createViewTestServices as createServices } from './view-test-services.ts';

describe('shared rendered views and assets', () => {
  it('renders a home page with Pico CSS and shared navigation in Chinese by default', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('href="/assets/pico.min.css"');
    expect(response.body).toContain('href="/assets/katex.min.css"');
    expect(response.body).toContain('href="/assets/notyf.min.css"');
    expect(response.body).toContain('href="/assets/site.css"');
    expect(response.body).not.toContain('https://cdn.jsdelivr.net');
    expect(response.body).toContain('href="/favicon.svg"');
    expect(response.body).toContain('<nav');
    expect(response.body).toContain('<html lang="zh-CN" data-theme="light">');
    expect(response.body).toContain('首页');
    expect(response.body).toContain('题目单');
    expect(response.body).toContain('学校 OJ 练习平台');
    expect(response.body).toContain('action="/problem-jump"');
    expect(response.body).toContain('id="quick-problem-pid"');
    expect(response.body).toContain('输入题号快速打开题目');
    expect(response.body).toContain('跳转');
    expect(response.body).toContain('登录');
    expect(response.body).toContain('注册');
    expect(response.body).not.toContain('题目管理');
  });

  it('redirects the home quick jump form to the problem detail page', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/problem-jump?pid=1000',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/problem/1000');
  });

  it('redirects an empty home quick jump back to the home page', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/problem-jump?pid=',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/');
  });

  it('shows one admin entry in the public navigation for admin users', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => adminUser(),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('href="/admin"');
    expect(response.body).toContain('role="button"');
    expect(response.body).toContain('>管理</a>');
    expect(response.body).not.toContain('href="/admin/problems"');
    expect(response.body).not.toContain('href="/admin/users"');
  });

  it('serves the site favicon', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/favicon.svg',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('image/svg+xml');
    expect(response.body).toContain('<svg');
    expect(response.body).toContain('ROJ');
  });

  it('serves local stylesheet assets', async () => {
    const app = buildApp(createServices());

    const pico = await app.inject({
      method: 'GET',
      url: '/assets/pico.min.css',
    });
    const katex = await app.inject({
      method: 'GET',
      url: '/assets/katex.min.css',
    });
    const site = await app.inject({
      method: 'GET',
      url: '/assets/site.css',
    });

    expect(pico.statusCode).toBe(200);
    expect(pico.headers['content-type']).toContain('text/css');
    expect(pico.body).toContain('--pico');
    expect(katex.statusCode).toBe(200);
    expect(katex.headers['content-type']).toContain('text/css');
    expect(katex.headers['cache-control']).toBe('no-store');
    expect(katex.body).toContain('katex');
    expect(site.statusCode).toBe(200);
    expect(site.headers['content-type']).toContain('text/css');
    expect(site.headers['cache-control']).toBe('no-store');
    expect(site.body).toContain('.site-header');
    expect(site.body).toContain('.data-table');
  });

  it('serves local page javascript assets', async () => {
    const app = buildApp(createServices());

    const axios = await app.inject({ method: 'GET', url: '/assets/axios.min.js' });
    const notyf = await app.inject({ method: 'GET', url: '/assets/notyf.min.js' });
    const notyfCss = await app.inject({ method: 'GET', url: '/assets/notyf.min.css' });
    const notify = await app.inject({ method: 'GET', url: '/assets/notify.js' });
    const register = await app.inject({ method: 'GET', url: '/assets/register.js' });
    const login = await app.inject({ method: 'GET', url: '/assets/login.js' });
    const formUtils = await app.inject({ method: 'GET', url: '/assets/form-utils.js' });
    const profilePassword = await app.inject({ method: 'GET', url: '/assets/profile-password.js' });
    const profileClass = await app.inject({ method: 'GET', url: '/assets/profile-class.js' });
    const problemStatement = await app.inject({ method: 'GET', url: '/assets/problem-statement.js' });
    const adminProblem = await app.inject({ method: 'GET', url: '/assets/admin-problem-form.js' });
    const adminProblems = await app.inject({ method: 'GET', url: '/assets/admin-problems.js' });
    const adminActions = await app.inject({ method: 'GET', url: '/assets/admin-actions.js' });
    const adminGrades = await app.inject({ method: 'GET', url: '/assets/admin-grades.js' });
    const adminLanguages = await app.inject({ method: 'GET', url: '/assets/admin-language-settings.js' });
    const adminUsers = await app.inject({ method: 'GET', url: '/assets/admin-users.js' });

    expect(axios.statusCode).toBe(200);
    expect(axios.headers['content-type']).toContain('application/javascript');
    expect(axios.body).toContain('axios');
    expect(notyf.statusCode).toBe(200);
    expect(notyf.headers['content-type']).toContain('application/javascript');
    expect(notyf.body).toContain('Notyf');
    expect(notyfCss.statusCode).toBe(200);
    expect(notyfCss.headers['content-type']).toContain('text/css');
    expect(notyfCss.body).toContain('notyf');
    expect(notify.statusCode).toBe(200);
    expect(notify.headers['content-type']).toContain('application/javascript');
    expect(notify.body).toContain('RojNotify');
    expect(notify.body).toContain('escapeHtml');
    expect(notify.body).toContain('&lt;');
    expect(notify.body).toContain("x: 'center'");
    expect(notify.body).toContain("y: 'top'");
    expect(register.statusCode).toBe(200);
    expect(register.headers['content-type']).toContain('application/javascript');
    expect(register.body).toContain('/api/register');
    expect(register.body).toContain('用户名已存在');
    expect(register.body).toContain('setCustomValidity');
    expect(register.body).toContain('请填写用户名');
    expect(register.body).toContain('RojFormUtils');
    expect(login.statusCode).toBe(200);
    expect(login.headers['content-type']).toContain('application/javascript');
    expect(login.body).toContain('/api/login');
    expect(login.body).toContain('用户名或密码错误');
    expect(login.body).toContain('RojFormUtils');
    expect(formUtils.statusCode).toBe(200);
    expect(formUtils.headers['cache-control']).toBe('no-store');
    expect(formUtils.body).toContain('RojFormUtils');
    expect(formUtils.body).toContain('checkValidity');
    expect(formUtils.body).toContain('handleSubmit');
    expect(formUtils.body).toContain('messageFromError');
    expect(formUtils.body).toContain('requireChecked');
    expect(profilePassword.statusCode).toBe(200);
    expect(profilePassword.body).toContain('/api/me/password');
    expect(profilePassword.body).toContain('当前密码错误');
    expect(profilePassword.body).toContain('handleSubmit');
    expect(profileClass.statusCode).toBe(200);
    expect(profileClass.body).toContain('/api/me/class-name');
    expect(profileClass.body).toContain('请选择可用的班级');
    expect(problemStatement.statusCode).toBe(200);
    expect(problemStatement.headers['content-type']).toContain('application/javascript');
    expect(problemStatement.body).toContain('copyStatementButton');
    expect(problemStatement.body).toContain('navigator.clipboard');
    expect(problemStatement.body).toContain('题面已复制');
    expect(adminProblem.statusCode).toBe(200);
    expect(adminProblem.body).toContain('至少选择一种允许提交的语言');
    expect(adminProblem.body).toContain('requireChecked');
    expect(adminProblem.body).toContain('/api/admin/problems');
    expect(adminProblems.statusCode).toBe(200);
    expect(adminProblems.body).toContain('/api/admin/problems');
    expect(adminActions.statusCode).toBe(200);
    expect(adminActions.body).toContain('dataset.confirmMessage');
    expect(adminActions.body).toContain('window.confirm');
    expect(adminGrades.statusCode).toBe(200);
    expect(adminGrades.body).toContain('/api/admin/grades');
    expect(adminLanguages.statusCode).toBe(200);
    expect(adminLanguages.body).toContain('至少选择一种可用语言');
    expect(adminLanguages.body).toContain('requireChecked');
    expect(adminLanguages.body).toContain('/api/admin/settings/languages');
    expect(adminUsers.statusCode).toBe(200);
    expect(adminUsers.headers['content-type']).toContain('application/javascript');
    expect(adminUsers.body).toContain('/api/admin/users');
    expect(adminUsers.body).toContain('confirmMessage');
    expect(adminUsers.body).toContain('window.confirm');
    expect(adminUsers.body).toContain('select-current-page-users');
    expect(adminUsers.body).toContain('currentPageUserCheckboxes');
    expect(adminUsers.body).toContain('indeterminate');
    expect(adminUsers.body).toContain('RojNotify');
    expect(adminUsers.body).not.toContain('window.alert');
    expect(adminProblems.body).toContain('RojNotify');
    expect(adminProblems.body).not.toContain('window.alert');
    const missing = await app.inject({ method: 'GET', url: '/assets/missing.js' });
    expect(missing.statusCode).toBe(404);
    expect(missing.headers['cache-control']).toBeUndefined();
  });

  it('serves the local problem editor bundle through the asset manifest', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/assets/editor/problem-editor.js',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/javascript');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toContain('CodeMirror');
    expect(response.body).toContain('/api/submissions');
    expect(response.body).toContain('RojNotify');
    expect(response.body).toContain('setTimeout');
  });

  it('serves whitelisted local KaTeX font assets only', async () => {
    const app = buildApp(createServices());

    const font = await app.inject({
      method: 'GET',
      url: '/assets/fonts/KaTeX_Main-Regular.woff2',
    });
    const missing = await app.inject({
      method: 'GET',
      url: '/assets/fonts/not-found.woff2',
    });

    expect(font.statusCode).toBe(200);
    expect(font.headers['content-type']).toContain('font/woff2');
    expect(font.headers['cache-control']).toBe('no-store');
    expect(font.rawPayload.length).toBeGreaterThan(0);
    expect(missing.statusCode).toBe(404);
    expect(missing.headers['cache-control']).toBeUndefined();
  });
});
