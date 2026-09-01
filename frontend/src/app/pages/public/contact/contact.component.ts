import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  ContactRequestPayload,
  ProjectType
} from '../../../core/models/contact-request.model';
import { SeoService } from '../../../core/seo/seo.service';
import { ContactService } from '../../../core/services/contact.service';
import {
  apiErrorMessage,
  applyServerErrors
} from '../../../core/utils/form-errors';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {

  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);
  private readonly contact = inject(ContactService);

  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  readonly projectTypes: { value: ProjectType; label: string }[] = [
    { value: 'branding', label: 'Branding' },
    { value: 'web-design', label: 'Web design' },
    { value: 'campaign', label: 'Campaign' },
    { value: 'production', label: 'Production' },
    { value: 'other', label: 'Something else' }
  ];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],

    /**
     * Loose on purpose. Phone formats differ wildly by country, and a strict
     * pattern rejects real numbers — which on a contact form means losing
     * the enquiry, not catching a typo. Shape only; the API agrees.
     */
    phone: [
      '',
      [Validators.required, Validators.pattern(/^\+?[\d\s()./-]{6,32}$/)]
    ],

    projectType: ['' as ProjectType | '', Validators.required],
    message: [
      '',
      [Validators.required, Validators.minLength(20), Validators.maxLength(5000)]
    ]
  });

  constructor() {
    this.seo.apply({
      title: 'Start a Project',
      description:
        'Tell us about the project. Branding, web design, campaign or production — EAST HOOD replies to every enquiry, usually within one working day.',
      path: '/contact',
      type: 'website'
    });

    this.seo.setJsonLd([
      this.seo.organization(),
      this.seo.breadcrumbs([{ label: 'Contact', path: '/contact' }])
    ]);
  }

  get messageLength(): number {
    return this.form.controls.message.value.length;
  }

  chooseType(value: ProjectType): void {
    this.form.controls.projectType.setValue(value);
    this.form.controls.projectType.markAsTouched();
  }

  invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.touched && control.invalid;
  }

  message(name: string): string {
    const control = this.form.get(name);

    if (!control?.errors) {
      return '';
    }

    if (control.errors['server']) return control.errors['server'] as string;
    if (control.errors['required']) return 'This field is required.';
    if (control.errors['email']) return 'Enter a valid email address.';
    if (control.errors['pattern']) return 'Enter a phone number we can reach you on.';
    if (control.errors['minlength']) {
      return name === 'message'
        ? 'Tell us a little more — at least 20 characters.'
        : 'That is too short.';
    }
    if (control.errors['maxlength']) return 'That is too long.';

    return 'Check this field.';
  }

  submit(): void {
    if (this.loading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please complete the highlighted fields.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.sent.set(false);

    this.contact
      .submit(this.form.getRawValue() as ContactRequestPayload)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.sent.set(true);
          this.form.reset({ projectType: '' });
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err));
          applyServerErrors(this.form, err);
        }
      });
  }
}
