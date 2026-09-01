import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  BillingPeriod,
  PackageItem,
  ServiceItem
} from '../../../core/models/service.model';
import { ServicesService } from '../../../core/services/services.service';
import {
  apiErrorMessage,
  applyServerErrors
} from '../../../core/utils/form-errors';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

@Component({
  selector: 'app-packages',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
    ConfirmDialogComponent,
    EmptyStateComponent
  ],
  templateUrl: './packages.component.html'
})
export class PackagesComponent {

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ServicesService);

  readonly rows = signal<PackageItem[]>([]);
  readonly services = signal<ServiceItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly billingPeriods: BillingPeriod[] = [
    'one-off',
    'monthly',
    'quarterly',
    'yearly'
  ];

  readonly formOpen = signal(false);
  readonly editing = signal<PackageItem | null>(null);
  readonly saving = signal(false);

  readonly deleting = signal<PackageItem | null>(null);
  readonly deleteBusy = signal(false);

  /** Which services are ticked in the modal. */
  readonly selectedIds = signal<string[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    currency: ['EGP', Validators.required],
    billingPeriod: ['one-off' as BillingPeriod],
    isPopular: [false],
    isActive: [true],
    sortOrder: [0],
    features: this.fb.array<string>([])
  });

  get features(): FormArray {
    return this.form.get('features') as FormArray;
  }

  /** What the ticked services cost bought separately. */
  readonly selectedTotal = computed(() =>
    this.services()
      .filter(service => this.selectedIds().includes(service.id))
      .reduce((sum, service) => sum + service.price, 0)
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      packages: this.api.listPackages({ active: 'all' }),
      services: this.api.list()
    }).subscribe({
      next: ({ packages, services }) => {
        this.rows.set(packages);
        this.services.set(services);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      }
    });
  }

  // ---- service picker ----
  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  toggleService(id: string): void {
    this.selectedIds.update(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  }

  /**
   * Live saving as the price or the selection changes, so the number the
   * client will see is never a surprise at save time.
   */
  get preview() {
    const total = this.selectedTotal();
    const price = Number(this.form.controls.price.value) || 0;
    const savings = Math.max(0, total - price);

    return {
      total,
      price,
      savings,
      percent: total > 0 ? Math.round((savings / total) * 1000) / 10 : 0,
      overpriced: total > 0 && price > total
    };
  }

  openCreate(): void {
    this.editing.set(null);
    this.selectedIds.set([]);
    this.form.reset({
      name: '',
      description: '',
      price: 0,
      currency: 'EGP',
      billingPeriod: 'one-off',
      isPopular: false,
      isActive: true,
      sortOrder: this.rows().length + 1
    });
    this.setArray(this.features, ['']);
    this.formOpen.set(true);
  }

  openEdit(pkg: PackageItem): void {
    this.editing.set(pkg);
    this.selectedIds.set((pkg.services ?? []).map(s => s.id));
    this.form.reset({
      name: pkg.name,
      description: pkg.description ?? '',
      price: pkg.price,
      currency: pkg.currency,
      billingPeriod: pkg.billingPeriod,
      isPopular: pkg.isPopular,
      isActive: pkg.isActive,
      sortOrder: pkg.sortOrder
    });
    this.setArray(this.features, pkg.features ?? []);
    this.formOpen.set(true);
  }

  save(): void {
    if (this.saving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.selectedIds().length) {
      this.error.set('Choose at least one service for this package.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();

    const payload = {
      ...raw,
      description: raw.description?.trim() || null,
      features: (raw.features ?? []).map(f => String(f).trim()).filter(Boolean),
      serviceIds: this.selectedIds()
    };

    const pkg = this.editing();

    const request$ = pkg
      ? this.api.updatePackage(pkg.id, payload as never)
      : this.api.createPackage(payload as never);

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

  askDelete(pkg: PackageItem, event: Event): void {
    event.stopPropagation();
    this.deleting.set(pkg);
  }

  confirmDelete(): void {
    const pkg = this.deleting();
    if (!pkg) return;

    this.deleteBusy.set(true);

    this.api.removePackage(pkg.id).subscribe({
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

  addFeature(): void {
    this.features.push(this.fb.nonNullable.control(''));
  }

  removeFeature(index: number): void {
    this.features.removeAt(index);
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
