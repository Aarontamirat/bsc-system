import { z } from "zod";

export type FieldErrors = Record<string, string[]>;

export type ActionSuccess<T> = {
  success: true;
  data: T;
};

export type ActionFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function actionSuccess<T>(data: T): ActionSuccess<T> {
  return {
    success: true,
    data,
  };
}

export function actionFailure(
  error: string,
  fieldErrors?: FieldErrors,
): ActionFailure {
  return {
    success: false,
    error,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "_form";

    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }

    fieldErrors[path].push(issue.message);
  }

  return fieldErrors;
}
