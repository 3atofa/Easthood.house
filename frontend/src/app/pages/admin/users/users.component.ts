import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { User, UserRole } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import {
  apiErrorMessage,
  applyServerErrors
} from '../../../core/utils/form-errors';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
    ConfirmDialogComponent,
    EmptyStateComponent
  ],
  templateUrl: './users.component.html'
})
export class UsersComponent {

  private readonly fb = inject(FormBuilder);
  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);

  readonly rows = signal<User[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly roles: UserRole[] = ['admin', 'editor'];

  readonly formOpen = signal(false);
  readonly editing = signal<User | null>(null);
  readonly saving = signal(false);
  readonly showPassword = signal(false);

  readonly deleting = signal<User | null>(null);
  readonly deleteBusy = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['editor' as UserRole, Validators.required],
    isActive: [true]
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.users.list({ limit: 100 }).subscribe({
      next: result => {
        this.rows.set(result.items);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  /** True for the row representing the signed-in account. */
  isSelf(user: User): boolean {
    return this.auth.currentUser()?.id === user.id;
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', email: '', password: '', role: 'editor', isActive: true });
    // Password is mandatory when creating an account.
    this.form.controls.password.setValidators([
      Validators.required,
      Validators.minLength(8)
    ]);
    this.form.controls.password.updateValueAndValidity();
    this.formOpen.set(true);
  }

  openEdit(user: User): void {
    this.editing.set(user);
    this.form.reset({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive
    });
    // On edit, an empty password simply means "leave it unchanged".
    this.form.controls.password.setValidators([Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    this.formOpen.set(true);
  }

  save(): void {
    if (this.saving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const user = this.editing();

    const request$ = user
      ? this.users.update(user.id, {
          name: raw.name,
          email: raw.email,
          role: raw.role,
          isActive: raw.isActive,
          ...(raw.password ? { password: raw.password } : {})
        })
      : this.users.create(raw);

    request$.subscribe({
      next: saved => {
        this.rows.update(rows =>
          user
            ? rows.map(row => (row.id === saved.id ? saved : row))
            : [...rows, saved]
        );
        this.saving.set(false);
        this.formOpen.set(false);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err));
        applyServerErrors(this.form, err);
      }
    });
  }

  askDelete(user: User, event: Event): void {
    event.stopPropagation();
    this.deleting.set(user);
  }

  confirmDelete(): void {
    const user = this.deleting();

    if (!user) return;

    this.deleteBusy.set(true);

    this.users.remove(user.id).subscribe({
      next: () => {
        this.rows.update(rows => rows.filter(row => row.id !== user.id));
        this.deleteBusy.set(false);
        this.deleting.set(null);
      },
      error: (err: unknown) => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.error.set(apiErrorMessage(err));
      }
    });
  }

  initials(user: User): string {
    return user.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.touched && control.invalid;
  }

  message(name: string): string {
    const control = this.form.get(name);

    if (!control?.errors) return '';
    if (control.errors['server']) return control.errors['server'] as string;
    if (control.errors['required']) return 'Required.';
    if (control.errors['email']) return 'Enter a valid email address.';
    if (control.errors['minlength']) return 'At least 8 characters.';

    return 'Check this field.';
  }
}
