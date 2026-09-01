import { CanDeactivateFn } from '@angular/router';

export interface CanComponentDeactivate {
  canDeactivate(): boolean;
}

/** Attach to forms that should warn before losing a half-typed draft. */
export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = component =>
  component.canDeactivate()
    ? true
    : confirm('You have unsaved changes. Leave this page?');
