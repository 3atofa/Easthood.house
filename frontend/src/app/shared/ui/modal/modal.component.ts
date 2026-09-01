import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  booleanAttribute
} from '@angular/core';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * EAST HOOD admin modal.
 *
 * The layout is a fixed-height flex column: header and footer stay put and
 * only the BODY scrolls, so a long form never pushes its own Save button
 * off the screen. On phones it becomes a bottom sheet that can reach the
 * full viewport height.
 *
 * Content goes in via three slots:
 *   <div modal-body>   … required
 *   <div modal-footer> … optional actions
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html'
})
export class ModalComponent implements OnDestroy {

  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() icon = 'fa-pen-to-square';
  @Input() size: ModalSize = 'md';

  /** Set while a save is in flight — blocks casual dismissal. */
  @Input({ transform: booleanAttribute }) busy = false;

  /** Clicking the backdrop or pressing Escape closes, unless busy. */
  @Input({ transform: booleanAttribute }) dismissable = true;

  @Output() closed = new EventEmitter<void>();

  private readonly previousOverflow = document.body.style.overflow;

  constructor() {
    // The page behind must not scroll while the modal owns the screen.
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.previousOverflow;
  }

  get widthClass(): string {
    switch (this.size) {
      case 'sm':
        return 'sm:max-w-md';
      case 'lg':
        return 'sm:max-w-3xl';
      case 'xl':
        return 'sm:max-w-5xl';
      default:
        return 'sm:max-w-xl';
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dismiss();
  }

  dismiss(): void {
    if (this.busy || !this.dismissable) {
      return;
    }

    this.closed.emit();
  }
}
