import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  booleanAttribute
} from '@angular/core';

import { ModalComponent } from '../modal/modal.component';

export type ConfirmTone = 'danger' | 'warning' | 'neutral';

/**
 * Destructive-action confirmation. Deliberately separate from ModalComponent
 * so a delete can never be dismissed by accident: the backdrop and Escape
 * are disabled while the request is in flight.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './confirm-dialog.component.html'
})
export class ConfirmDialogComponent {

  @Input({ required: true }) title = '';
  @Input({ required: true }) message = '';

  /** Extra line for consequences the user cannot undo. */
  @Input() detail = '';

  @Input() confirmLabel = 'Delete';
  @Input() cancelLabel = 'Cancel';
  @Input() tone: ConfirmTone = 'danger';

  @Input({ transform: booleanAttribute }) busy = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  get icon(): string {
    switch (this.tone) {
      case 'warning':
        return 'fa-triangle-exclamation';
      case 'neutral':
        return 'fa-circle-question';
      default:
        return 'fa-trash-can';
    }
  }

  get confirmClass(): string {
    switch (this.tone) {
      case 'warning':
        return 'border-[#e0be6e] bg-[#e0be6e] text-[#050505] hover:bg-transparent hover:text-[#e0be6e]';
      case 'neutral':
        return 'border-[#f2eee8] bg-[#f2eee8] text-[#050505] hover:bg-transparent hover:text-[#f2eee8]';
      default:
        return 'border-[#c4453a] bg-[#c4453a] text-white hover:bg-transparent hover:text-[#e0685f]';
    }
  }
}
