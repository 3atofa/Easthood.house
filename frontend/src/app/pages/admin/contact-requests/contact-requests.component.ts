import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ContactRequest,
  ContactStatus
} from '../../../core/models/contact-request.model';
import { ContactService } from '../../../core/services/contact.service';
import { apiErrorMessage } from '../../../core/utils/form-errors';
import { ConfirmDialogComponent } from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';

@Component({
  selector: 'app-contact-requests',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalComponent,
    ConfirmDialogComponent,
    EmptyStateComponent
  ],
  templateUrl: './contact-requests.component.html'
})
export class ContactRequestsComponent {

  private readonly contact = inject(ContactService);

  /**
   * Strips everything a dialler cannot use. Declared here rather than
   * inline in the template because Angular templates cannot hold regex
   * literals.
   */
  readonly rxNonDial = /[^\d+]/g;

  readonly rows = signal<ContactRequest[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly search = signal('');
  readonly status = signal<ContactStatus | 'all'>('all');
  readonly page = signal(1);
  readonly limit = 20;

  readonly statuses: (ContactStatus | 'all')[] = [
    'all',
    'new',
    'in-review',
    'replied',
    'archived'
  ];

  readonly editableStatuses: ContactStatus[] = [
    'new',
    'in-review',
    'replied',
    'archived'
  ];

  // ---- modal state ----
  readonly selected = signal<ContactRequest | null>(null);
  readonly draftStatus = signal<ContactStatus>('new');
  readonly draftNote = signal('');
  readonly saving = signal(false);

  readonly deleting = signal<ContactRequest | null>(null);
  readonly deleteBusy = signal(false);

  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.contact
      .list({
        page: this.page(),
        limit: this.limit,
        search: this.search(),
        status: this.status()
      })
      .subscribe({
        next: result => {
          this.rows.set(result.items);
          this.total.set(result.meta?.total ?? result.items.length);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(apiErrorMessage(err));
          this.loading.set(false);
        }
      });
  }

  /** Debounced so typing does not fire a request per keystroke. */
  onSearch(value: string): void {
    this.search.set(value);

    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 350);
  }

  setStatus(value: ContactStatus | 'all'): void {
    this.status.set(value);
    this.page.set(1);
    this.load();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.page.set(page);
    this.load();
  }

  // ---- view / edit ----
  open(request: ContactRequest): void {
    this.selected.set(request);
    this.draftStatus.set(request.status);
    this.draftNote.set(request.adminNote ?? '');
  }

  close(): void {
    this.selected.set(null);
  }

  save(): void {
    const request = this.selected();

    if (!request || this.saving()) {
      return;
    }

    this.saving.set(true);

    this.contact
      .update(request.id, {
        status: this.draftStatus(),
        adminNote: this.draftNote().trim() || null
      })
      .subscribe({
        next: updated => {
          this.rows.update(rows =>
            rows.map(row => (row.id === updated.id ? updated : row))
          );
          this.saving.set(false);
          this.close();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(err));
        }
      });
  }

  // ---- delete ----
  askDelete(request: ContactRequest, event: Event): void {
    event.stopPropagation();
    this.deleting.set(request);
  }

  confirmDelete(): void {
    const request = this.deleting();

    if (!request) {
      return;
    }

    this.deleteBusy.set(true);

    this.contact.remove(request.id).subscribe({
      next: () => {
        this.rows.update(rows => rows.filter(row => row.id !== request.id));
        this.total.update(count => Math.max(0, count - 1));
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

  statusClass(status: string): string {
    switch (status) {
      case 'new':
        return 'border-[#78c8a0]/40 text-[#78c8a0]';
      case 'in-review':
        return 'border-[#e0be6e]/40 text-[#e0be6e]';
      case 'replied':
        return 'border-[#8caae6]/40 text-[#8caae6]';
      default:
        return 'border-white/15 text-white/45';
    }
  }
}
