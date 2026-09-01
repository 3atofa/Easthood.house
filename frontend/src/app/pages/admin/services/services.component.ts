import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { ServiceItem } from '../../../core/models/service.model';
import { ServicesService } from '../../../core/services/services.service';
import {
  apiErrorMessage,
  applyServerErrors
} from '../../../core/utils/form-errors';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
    ConfirmDialogComponent,
    EmptyStateComponent
  ],
  templateUrl: './services.component.html'
})
export class ServicesComponent {

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ServicesService);

  readonly rows = signal<ServiceItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly formOpen = signal(false);
  readonly editing = signal<ServiceItem | null>(null);
  readonly saving = signal(false);

  readonly deleting = signal<ServiceItem | null>(null);
  readonly deleteBusy = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    code: [''],
    summary: ['', [Validators.required, Validators.minLength(10)]],
    icon: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    currency: ['EGP', Validators.required],
    sortOrder: [0],
    isPublished: [true],
    deliverables: this.fb.array<string>([])
  });

  get deliverables(): FormArray {
    return this.form.get('deliverables') as FormArray;
  }

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.list().subscribe({
      next: services => {
        this.rows.set(services);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  /** Sum of every published service — the ceiling any bundle prices under. */
  get catalogueTotal(): number {
    return this.rows().reduce((sum, service) => sum + service.price, 0);
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      title: '',
      code: '',
      summary: '',
      icon: '',
      price: 0,
      currency: 'EGP',
      sortOrder: this.rows().length + 1,
      isPublished: true
    });
    this.setArray(this.deliverables, ['']);
    this.formOpen.set(true);
  }

  openEdit(service: ServiceItem): void {
    this.editing.set(service);
    this.form.reset({
      title: service.title,
      code: service.code ?? '',
      summary: service.summary,
      icon: service.icon ?? '',
      price: service.price,
      currency: service.currency,
      sortOrder: service.sortOrder,
      isPublished: service.isPublished
    });
    this.setArray(this.deliverables, service.deliverables ?? []);
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

    const payload = {
      ...raw,
      code: raw.code?.trim() || null,
      icon: raw.icon?.trim() || null,
      deliverables: (raw.deliverables ?? [])
        .map(d => String(d).trim())
        .filter(Boolean)
    };

    const service = this.editing();

    const request$ = service
      ? this.api.update(service.id, payload as never)
      : this.api.create(payload as never);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.load();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err));
        applyServerErrors(this.form, err);
      }
    });
  }

  askDelete(service: ServiceItem, event: Event): void {
    event.stopPropagation();
    this.deleting.set(service);
  }

  confirmDelete(): void {
    const service = this.deleting();
    if (!service) return;

    this.deleteBusy.set(true);

    this.api.remove(service.id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.deleteBusy.set(false);
        this.deleting.set(null);
        this.error.set(apiErrorMessage(err));
      }
    });
  }

  addTo(array: FormArray): void {
    array.push(this.fb.nonNullable.control(''));
  }

  removeAt(array: FormArray, index: number): void {
    array.removeAt(index);
  }

  invalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.touched && control.invalid;
  }

  private setArray(array: FormArray, values: string[]): void {
    array.clear();
    values.forEach(value => array.push(this.fb.nonNullable.control(value)));
  }
}
