import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChildren,
  booleanAttribute,
  numberAttribute,
  signal
} from '@angular/core';

/**
 * One-time-code input.
 *
 * DIRECTION IS THE WHOLE POINT OF THIS COMPONENT.
 *
 * A verification code is a number, and numbers read left-to-right in every
 * script — including Arabic, where digits are the one thing that does not
 * mirror. But a row of inputs inside an `dir="rtl"` page lays out
 * right-to-left, so box 1 renders on the RIGHT. The user then types the
 * first digit into what looks like the last box, the code reads backwards
 * against the email that sent it, and pasting fills in reverse.
 *
 * So the row is pinned with `dir="ltr"`, and every index in this class is a
 * logical position that matches the visual one: index 0 is always the
 * leftmost box and always the first digit. Nothing here depends on the
 * surrounding page's direction.
 */
@Component({
  selector: 'app-otp-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './otp-input.component.html'
})
export class OtpInputComponent implements AfterViewInit {

  @Input({ transform: numberAttribute }) length = 6;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) autoFocus = true;

  /** Renders the boxes in an error state without owning the message. */
  @Input({ transform: booleanAttribute }) invalid = false;

  /** Emits on every change; the value is padded to `length` with ''. */
  @Output() valueChange = new EventEmitter<string>();

  /** Emits once, when the last box is filled. */
  @Output() completed = new EventEmitter<string>();

  @ViewChildren('box') boxes!: QueryList<ElementRef<HTMLInputElement>>;

  readonly digits = signal<string[]>([]);

  get slots(): number[] {
    return Array.from({ length: this.length }, (_, i) => i);
  }

  get value(): string {
    return this.digits().join('');
  }

  get isComplete(): boolean {
    return this.value.length === this.length;
  }

  constructor() {
    this.digits.set(new Array(this.length).fill(''));
  }

  ngAfterViewInit(): void {
    // Reset now that `length` is bound.
    if (this.digits().length !== this.length) {
      this.digits.set(new Array(this.length).fill(''));
    }

    if (this.autoFocus && !this.disabled) {
      queueMicrotask(() => this.focusAt(0));
    }
  }

  /** Clears every box and returns to the first. Called after a failed code. */
  reset(): void {
    this.digits.set(new Array(this.length).fill(''));
    this.emit();
    this.focusAt(0);
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;

    // Keep digits only. A phone keyboard can still deliver '+' or ','.
    const cleaned = input.value.replace(/\D/g, '');

    if (!cleaned) {
      input.value = '';
      this.setDigit(index, '');
      return;
    }

    // Several characters at once — an autofilled SMS code, or a fast typist.
    // They fill FORWARD from here, never backwards.
    if (cleaned.length > 1) {
      this.fillFrom(index, cleaned);
      return;
    }

    input.value = cleaned;
    this.setDigit(index, cleaned);

    if (index < this.length - 1) {
      this.focusAt(index + 1);
    }

    this.maybeComplete();
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    const key = event.key;

    if (key === 'Backspace') {
      event.preventDefault();

      if (this.digits()[index]) {
        // Clear this box and stay put.
        this.setDigit(index, '');
        this.syncBox(index);
        return;
      }

      // Already empty: step back and clear that one.
      if (index > 0) {
        this.setDigit(index - 1, '');
        this.syncBox(index - 1);
        this.focusAt(index - 1);
      }

      return;
    }

    if (key === 'Delete') {
      event.preventDefault();
      this.setDigit(index, '');
      this.syncBox(index);
      return;
    }

    /**
     * Arrow keys move by VISUAL position, and because the row is dir="ltr"
     * that is also logical position. ArrowLeft always goes to the earlier
     * digit, which is what a user expects even on an Arabic page.
     */
    if (key === 'ArrowLeft') {
      event.preventDefault();
      this.focusAt(index - 1);
      return;
    }

    if (key === 'ArrowRight') {
      event.preventDefault();
      this.focusAt(index + 1);
      return;
    }

    if (key === 'Home') {
      event.preventDefault();
      this.focusAt(0);
      return;
    }

    if (key === 'End') {
      event.preventDefault();
      this.focusAt(this.length - 1);
      return;
    }

    // Let control combinations, tab and Enter through untouched.
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (key.length === 1 && !/\d/.test(key)) {
      event.preventDefault();
    }
  }

  /**
   * Paste always starts at the FIRST box, whichever one received the event.
   * Someone copying a code from their mail app expects the whole thing to
   * land in order, not to be spliced in from wherever the cursor happened
   * to be.
   */
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const text = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');

    if (!text) {
      return;
    }

    this.fillFrom(0, text);
  }

  onFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  private fillFrom(start: number, source: string): void {
    const next = [...this.digits()];

    let cursor = start;

    for (const char of source) {
      if (cursor >= this.length) {
        break;
      }

      next[cursor] = char;
      cursor++;
    }

    this.digits.set(next);
    this.syncAll();
    this.emit();

    // Land on the first empty box, or the last one if the code is complete.
    const firstEmpty = next.findIndex(d => !d);
    this.focusAt(firstEmpty === -1 ? this.length - 1 : firstEmpty);

    this.maybeComplete();
  }

  private setDigit(index: number, value: string): void {
    const next = [...this.digits()];
    next[index] = value;
    this.digits.set(next);
    this.emit();
  }

  private emit(): void {
    this.valueChange.emit(this.value);
  }

  private maybeComplete(): void {
    if (this.isComplete) {
      this.completed.emit(this.value);
    }
  }

  private focusAt(index: number): void {
    if (index < 0 || index >= this.length) {
      return;
    }

    const box = this.boxes?.get(index)?.nativeElement;

    box?.focus();
    box?.select();
  }

  /** Pushes model state back into one DOM input. */
  private syncBox(index: number): void {
    const box = this.boxes?.get(index)?.nativeElement;

    if (box) {
      box.value = this.digits()[index] ?? '';
    }
  }

  private syncAll(): void {
    this.digits().forEach((_, index) => this.syncBox(index));
  }
}
