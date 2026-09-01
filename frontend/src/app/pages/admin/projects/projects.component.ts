import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { WorkProject } from '../../../core/models/work.model';
import { WorkService } from '../../../core/services/work.service';
import {
  apiErrorMessage,
  applyServerErrors
} from '../../../core/utils/form-errors';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
    ConfirmDialogComponent,
    EmptyStateComponent
  ],
  templateUrl: './projects.component.html'
})
export class ProjectsComponent {

  private readonly fb = inject(FormBuilder);
  private readonly work = inject(WorkService);

  readonly rows = signal<WorkProject[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly editing = signal<WorkProject | null>(null);
  readonly formOpen = signal(false);
  readonly saving = signal(false);

  readonly deleting = signal<WorkProject | null>(null);
  readonly deleteBusy = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    client: ['Confidential', Validators.required],
    category: ['', Validators.required],
    year: ['', [Validators.required, Validators.pattern(/^\d{4}(-\d{4})?$/)]],
    excerpt: ['', [Validators.required, Validators.minLength(10)]],
    cover: [''],
    sortOrder: [0],
    isPublished: [false],
    services: this.fb.array<string>([]),
    body: this.fb.array<string>([])
  });

  get servicesArray(): FormArray {
    return this.form.get('services') as FormArray;
  }

  get bodyArray(): FormArray {
    return this.form.get('body') as FormArray;
  }

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.work.list({ limit: 100 }).subscribe({
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

  // ---- form ----
  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      title: '',
      client: 'Confidential',
      category: '',
      year: String(new Date().getFullYear()),
      excerpt: '',
      cover: '',
      sortOrder: this.rows().length + 1,
      isPublished: false
    });
    this.setArray(this.servicesArray, []);
    this.setArray(this.bodyArray, ['']);
    this.formOpen.set(true);
  }

  openEdit(project: WorkProject): void {
    this.editing.set(project);
    this.form.patchValue({
      title: project.title,
      client: project.client,
      category: project.category,
      year: project.year,
      excerpt: project.excerpt,
      cover: project.cover ?? '',
      sortOrder: project.sortOrder,
      isPublished: project.isPublished
    });
    this.setArray(this.servicesArray, project.services ?? []);
    this.setArray(this.bodyArray, project.body?.length ? project.body : ['']);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  addService(): void {
    this.servicesArray.push(this.fb.nonNullable.control(''));
  }

  addParagraph(): void {
    this.bodyArray.push(this.fb.nonNullable.control(''));
  }

  removeAt(array: FormArray, index: number): void {
    array.removeAt(index);
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();

    // Blank rows are an artefact of the repeater, not content.
    const payload = {
      ...raw,
      cover: raw.cover?.trim() || null,
      services: (raw.services ?? []).map(s => String(s).trim()).filter(Boolean),
      body: (raw.body ?? []).map(p => String(p).trim()).filter(Boolean)
    };

    const project = this.editing();

    const request$ = project
      ? this.work.update(project.id, payload as never)
      : this.work.create(payload as never);

    request$.subscribe({
      next: saved => {
        this.rows.update(rows =>
          project
            ? rows.map(row => (row.id === saved.id ? saved : row))
            : [...rows, saved]
        );
        this.saving.set(false);
        this.closeForm();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err));
        applyServerErrors(this.form, err);
      }
    });
  }

  togglePublished(project: WorkProject, event: Event): void {
    event.stopPropagation();

    this.work
      .update(project.id, { isPublished: !project.isPublished } as never)
      .subscribe({
        next: saved =>
          this.rows.update(rows =>
            rows.map(row => (row.id === saved.id ? saved : row))
          ),
        error: (err: unknown) => this.error.set(apiErrorMessage(err))
      });
  }

  // ---- delete ----
  askDelete(project: WorkProject, event: Event): void {
    event.stopPropagation();
    this.deleting.set(project);
  }

  confirmDelete(): void {
    const project = this.deleting();

    if (!project) {
      return;
    }

    this.deleteBusy.set(true);

    this.work.remove(project.id).subscribe({
      next: () => {
        this.rows.update(rows => rows.filter(row => row.id !== project.id));
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

  fieldInvalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.touched && control.invalid;
  }

  fieldMessage(name: string): string {
    const control = this.form.get(name);

    if (!control?.errors) {
      return '';
    }

    if (control.errors['server']) return control.errors['server'] as string;
    if (control.errors['required']) return 'Required.';
    if (control.errors['minlength']) return 'Too short.';
    if (control.errors['pattern']) return 'Use a year like 2026 or 2025-2026.';

    return 'Check this field.';
  }

  private setArray(array: FormArray, values: string[]): void {
    array.clear();
    values.forEach(value => array.push(this.fb.nonNullable.control(value)));
  }
}
