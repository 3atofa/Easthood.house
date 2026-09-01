import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  apiErrorMessage,
  applyServerErrors
} from '../../../core/utils/form-errors';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html'
})
export class LoginComponent {

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly site = environment.site;
  readonly year = new Date().getFullYear();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  /** What the studio does, shown on the content column. */
  readonly highlights = [
    {
      icon: 'fa-inbox',
      title: 'Enquiries',
      copy: 'Every project enquiry from the site, in one inbox.'
    },
    {
      icon: 'fa-layer-group',
      title: 'Work',
      copy: 'Publish and reorder the case studies visitors see.'
    },
    {
      icon: 'fa-tags',
      title: 'Services & packages',
      copy: 'Price the offer, set the discount, keep it current.'
    }
  ];

  togglePassword(): void {
    this.showPassword.update(shown => !shown);
  }

  fieldError(name: 'email' | 'password'): string | null {
    const control = this.form.controls[name];

    if (!control.touched || !control.errors) {
      return null;
    }

    if (control.errors['server']) return control.errors['server'] as string;
    if (control.errors['required']) return 'This field is required.';
    if (control.errors['email']) return 'Enter a valid email address.';
    if (control.errors['minlength']) return 'At least 8 characters.';

    return 'Check this field.';
  }

  submit(): void {
    if (this.loading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const returnUrl =
          this.route.snapshot.queryParamMap.get('returnUrl') ?? '/admin/dashboard';

        this.router.navigateByUrl(returnUrl);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
        applyServerErrors(this.form, err);
      }
    });
  }
}
