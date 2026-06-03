import type { ZodType } from 'zod';

import { messageFromError } from '../../http/form-errors.ts';

export type AdminHtmlFormBody = Record<string, string | string[] | undefined>;

interface AdminHtmlFormActionInput<ParsedInput, FormValues> {
  schema: ZodType<ParsedInput>;
  rawBody: AdminHtmlFormBody;
  inputFromBody(rawBody: AdminHtmlFormBody): unknown;
  formValues(rawBody: AdminHtmlFormBody): FormValues;
  validationMessage: string;
  failureMessage: string;
  action(input: ParsedInput): Promise<void>;
  renderError(formValues: FormValues, formError: string): unknown;
  redirect(): unknown;
}

export async function handleAdminHtmlFormAction<ParsedInput, FormValues>(
  input: AdminHtmlFormActionInput<ParsedInput, FormValues>,
) {
  const formValues = input.formValues(input.rawBody);
  const parsed = input.schema.safeParse(input.inputFromBody(input.rawBody));

  if (!parsed.success) {
    return input.renderError(formValues, input.validationMessage);
  }

  try {
    await input.action(parsed.data);
  } catch (error) {
    return input.renderError(
      formValues,
      messageFromError(error, input.failureMessage),
    );
  }

  return input.redirect();
}
