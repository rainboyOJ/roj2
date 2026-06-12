// 用 zod 把用户提交的表单 / JSON 先做一层结构校验。
import { z } from 'zod';

export const createSubmissionSchema = z.object({
  pid: z.string().min(1),
  language: z.enum(['cpp', 'python']),
  sourceCode: z.string().min(1),
});

export const registerSchema = z.object({
  username: z.string().regex(/^[a-z0-9_]{3,24}$/),
  name: z.string().min(1),
  gender: z.enum(['male', 'female']),
  className: z.string().min(1),
  grade: z.string().min(1),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const createGradeSchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean(),
  order: z.number().int(),
});

export const createClassSchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean(),
  order: z.number().int(),
});

export const enabledLanguagesSchema = z.object({
  enabledLanguages: z.array(z.enum(['cpp', 'python'])).min(1),
});

export const paginationSettingsSchema = z.object({
  listPageSize: z.union([z.literal(20), z.literal(50), z.literal(100)]),
});

export const submissionSettingsSchema = z.object({
  submissionIntervalSeconds: z.number().int().min(0),
});

export const createProblemSchema = z.object({
  pid: z.string().min(1),
  title: z.string().min(1),
  statementMarkdown: z.string().min(1),
  allowLanguages: z.array(z.enum(['cpp', 'python'])).min(1),
  isVisible: z.boolean(),
});

export const createProblemSetSchema = z.object({
  title: z.string().min(1),
  contentMarkdown: z.string().min(1),
});

export const updateClassNameSchema = z.object({
  className: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

export const updateMyPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
