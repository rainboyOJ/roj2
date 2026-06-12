import { ObjectId, type Collection } from 'mongodb';
import { renderMarkdown } from '@roj/markdown-renderer';
import type {
  ClassDocument,
  GradeDocument,
  ProblemDocument,
  SiteSettingsDocument,
  UserDocument,
} from '@roj/shared';

import { readDefaultProblemSeeds } from './default-problems.ts';
import {
  DEFAULT_LIST_PAGE_SIZE,
  DEFAULT_SUBMISSION_INTERVAL_SECONDS,
  parseEnabledLanguagesEnv,
} from './settings.ts';
import { hashPassword } from './users.ts';

export interface DemoSeedCollections {
  grades: Collection<GradeDocument>;
  classes: Collection<ClassDocument>;
  users: Collection<UserDocument>;
  problems: Collection<ProblemDocument>;
  settings: Collection<SiteSettingsDocument>;
}

export async function seedDemoData(collections: DemoSeedCollections) {
  const now = new Date();
  const demoUserId = new ObjectId().toHexString();
  const adminUserId = new ObjectId().toHexString();
  const defaultProblems = await readDefaultProblemSeeds();

  await collections.grades.updateOne(
    { name: '2024' },
    {
      $set: {
        name: '2024',
        isActive: true,
        order: 1,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: new ObjectId().toHexString(),
        createdAt: now,
      },
    },
    { upsert: true },
  );

  await collections.grades.updateOne(
    { name: '2025' },
    {
      $set: {
        name: '2025',
        isActive: true,
        order: 2,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: new ObjectId().toHexString(),
        createdAt: now,
      },
    },
    { upsert: true },
  );

  await collections.grades.updateOne(
    { name: '2026' },
    {
      $set: {
        name: '2026',
        isActive: true,
        order: 3,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: new ObjectId().toHexString(),
        createdAt: now,
      },
    },
    { upsert: true },
  );

  await Promise.all(Array.from({ length: 40 }, (_, index) => {
    const order = index + 1;
    const name = `${order} 班`;
    return collections.classes.updateOne(
      { name },
      {
        $setOnInsert: {
          _id: new ObjectId().toHexString(),
          name,
          isActive: true,
          order,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }));

  await collections.users.updateOne(
    { username: 'admin' },
    {
      $set: {
        username: 'admin',
        name: 'Administrator',
        gender: 'male',
        className: 'System',
        grade: '2025',
        passwordHash: hashPassword('admin123456'),
        role: 'admin',
        approvalStatus: 'approved',
        approvedBy: null,
        approvedAt: now,
        rejectedReason: null,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: adminUserId,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const adminUser = await collections.users.findOne({ username: 'admin' });
  if (!adminUser) {
    throw new Error('failed to seed admin user');
  }

  await collections.users.updateOne(
    { username: 'demo' },
    {
      $set: {
        username: 'demo',
        name: 'Demo User',
        gender: 'female',
        className: 'Class Demo',
        grade: '2025',
        passwordHash: hashPassword('demo123456'),
        role: 'student',
        approvalStatus: 'approved',
        approvedBy: adminUser._id,
        approvedAt: now,
        rejectedReason: null,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: demoUserId,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  for (const problem of defaultProblems) {
    await collections.problems.updateOne(
      { pid: problem.pid },
      {
        $set: {
          pid: problem.pid,
          title: problem.title,
          statementMarkdown: problem.statementMarkdown,
          statementHtml: renderMarkdown(problem.statementMarkdown),
          allowLanguages: problem.allowLanguages,
          isVisible: true,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId().toHexString(),
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }

  await collections.settings.updateOne(
    { _id: 'site_settings' },
    {
      $setOnInsert: {
        enabledLanguages: parseEnabledLanguagesEnv(process.env.ROJ_ENABLED_LANGUAGES),
        listPageSize: DEFAULT_LIST_PAGE_SIZE,
        submissionIntervalSeconds: DEFAULT_SUBMISSION_INTERVAL_SECONDS,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}
