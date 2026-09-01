import { CommonModule } from '@angular/common';
import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import {
  apiErrorMessage,
  applyServerErrors
} from '../../../core/utils/form-errors';
import { OtpInputComponent } from '../../../shared/ui/otp-input/otp-input.component';

type Step = 'email' | 'code' | 'password' | 'done';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, OtpInputComponent],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent {

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild(OtpInputComponent) otpInput?: OtpInputComponent;

  readonly site = environment.site;
  readonly year = new Date().getFullYear();

  readonly step = signal<Step>('email');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly email = signal('');
  readonly code = signal('');
  readonly resetToken = signal<string | null>(null);
  readonly showPassword = signal(false);

  /** Seconds until another code can be requested. */
  readonly cooldown = signal(0);
  private cooldownTimer?: ReturnType<typeof setInterval>;

  readonly canResend = computed(() => this.cooldown() === 0 && !this.loading());
  readonly codeComplete = computed(() => this.code().length === 6);

  readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  readonly passwordForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  readonly stepIndex = computed(() => {
    switch (this.step()) {
      case 'email':
        return 1;
      case 'code':
        return 2;
      default:
        return 3;
    }
  });

  // ---------- step 1: ask for the code ----------
  submitEmail(): void {
    if (this.loading()) return;

    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const email = this.emailForm.controls.email.value.trim().toLowerCase();

    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.email.set(email);
        this.loading.set(false);
        this.step.set('code');
        this.startCooldown(60);
        // Deliberately vague: the API will not say whether the account
        // exists, and neither will we.
        this.notice.set(
          `If that address has an account, a 6-digit code is on its way to ${email}.`
        );
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
        applyServerErrors(this.emailForm, err);
      }
    });
  }

  // ---------- step 2: verify the code ----------
  onCode(value: string): void {
    this.code.set(value);

    if (this.error()) {
      this.error.set(null);
    }
  }

  /** Fired by the OTP component the moment the last box is filled. */
  onCodeComplete(value: string): void {
    this.code.set(value);
    this.submitCode();
  }

  submitCode(): void {
    if (this.loading() || !this.codeComplete()) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth.verifyOtp(this.email(), this.code()).subscribe({
      next: ({ resetToken }) => {
        this.resetToken.set(resetToken);
        this.loading.set(false);
        this.notice.set(null);
        this.step.set('password');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
        // Clear the boxes and return focus to the first, so the next attempt
        // starts clean rather than editing a wrong code.
        this.code.set('');
        this.otpInput?.reset();
      }
    });
  }

  resend(): void {
    if (!this.canResend()) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth.forgotPassword(this.email()).subscribe({
      next: () => {
        this.loading.set(false);
        this.startCooldown(60);
        this.code.set('');
        this.otpInput?.reset();
        this.notice.set('A new code is on its way. The previous one no longer works.');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
      }
    });
  }

  // ---------- step 3: set the new password ----------
  submitPassword(): void {
    if (this.loading()) return;

    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    if (newPassword !== confirmPassword) {
      this.passwordForm.controls.confirmPassword.setErrors({
        mismatch: 'The two passwords do not match.'
      });
      return;
    }

    const token = this.resetToken();

    if (!token) {
      this.error.set('That session expired. Start again.');
      this.step.set('email');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auth.resetPassword(token, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('done');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err));
        applyServerErrors(this.passwordForm, err);
      }
    });
  }

  goToLogin(): void {
    this.router.navigateByUrl('/admin/login');
  }

  back(): void {
    this.error.set(null);
    this.notice.set(null);

    if (this.step() === 'code') {
      this.step.set('email');
    } else if (this.step() === 'password') {
      this.step.set('code');
    }
  }

  fieldError(form: 'email' | 'password', name: string): string | null {
    // Widened to FormGroup: the two typed groups have different generics,
    // so the union's get() overloads are not callable without this.
    const group: FormGroup =
      form === 'email' ? this.emailForm : this.passwordForm;

    const control = group.get(name);

    if (!control?.touched || !control.errors) return null;

    if (control.errors['server']) return control.errors['server'] as string;
    if (control.errors['mismatch']) return control.errors['mismatch'] as string;
    if (control.errors['required']) return 'This field is required.';
    if (control.errors['email']) return 'Enter a valid email address.';
    if (control.errors['minlength']) return 'At least 8 characters.';

    return 'Check this field.';
  }

  private startCooldown(seconds: number): void {
    clearInterval(this.cooldownTimer);
    this.cooldown.set(seconds);

    this.cooldownTimer = setInterval(() => {
      this.cooldown.update(value => {
        if (value <= 1) {
          clearInterval(this.cooldownTimer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }
}
