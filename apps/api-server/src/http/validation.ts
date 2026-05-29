import type { FastifyReply } from 'fastify';
import type { z } from 'zod';

export function sendValidationError(
  reply: FastifyReply,
  message: string,
  issues: z.core.$ZodIssue[],
) {
  return reply.code(400).send({
    message,
    issues,
  });
}
