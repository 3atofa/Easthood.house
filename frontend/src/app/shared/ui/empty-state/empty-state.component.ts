import { Component, Input } from '@angular/core';

/** Shown wherever a list has nothing in it, so a table is never just blank. */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center px-6 py-16 text-center">

      <span class="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 text-[18px] text-white/25">
        <i class="fa-solid" [class]="icon"></i>
      </span>

      <p class="text-[14px] font-medium text-white/80">{{ title }}</p>

      @if (message) {
        <p class="mt-2 max-w-[42ch] text-[12px] leading-relaxed text-white/40">
          {{ message }}
        </p>
      }

    </div>
  `
})
export class EmptyStateComponent {

  @Input() icon = 'fa-inbox';
  @Input({ required: true }) title = '';
  @Input() message = '';
}
