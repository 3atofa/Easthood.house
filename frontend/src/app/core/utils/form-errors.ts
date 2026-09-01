import { HttpErrorResponse } from '@angular/common/http';
import { FormGroup } from '@angular/forms';

import { ApiErrorBody, FieldErrors } from '../models/api.model';

/** The message to show the user for any failed request. */
export const apiErrorMessage = (error: unknown): string => {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ApiErrorBody | undefined;

    if (body?.message) {
      return body.message;
    }

    if (error.status === 0) {
      return 'Cannot reach the server. Is the API running?';
    }
  }

  return 'Something went wrong. Please try again.';
};

/** Field-level messages the API returned, if any. */
export const apiFieldErrors = (error: unknown): FieldErrors => {
  if (error instanceof HttpErrorResponse) {
    return (error.error as ApiErrorBody | undefined)?.details ?? {};
  }

  return {};
};

/**
 * Pushes server-side validation messages onto the matching controls so the
 * form shows them exactly where the client-side ones appear.
 */
export const applyServerErrors = (form: FormGroup, error: unknown): void => {
  const details = apiFieldErrors(error);

  for (const [field, message] of Object.entries(details)) {
    const control = form.get(field);

    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: message });
      control.markAsTouched();
    }
  }
};
