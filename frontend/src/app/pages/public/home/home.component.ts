import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject
} from '@angular/core';

import { SeoService } from '../../../core/seo/seo.service';

/** Index of the slide that holds the film. */
const VIDEO_SLIDE = 1;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewInit, OnDestroy {

  private readonly seo = inject(SeoService);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Computed once. Server rendering uses a DOM shim whose elements have no
   * media API at all — no play(), no pause(), and `paused` is undefined —
   * so every line that touches the video has to be behind this.
   */
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  @ViewChild('heroVideo') videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('heroSection') sectionRef?: ElementRef<HTMLElement>;

  currentSlide = 0;
  isAnimating = false;

  /** Public: the counter in the template renders it. */
  readonly totalSlides = 3;

  /**
   * The track is `totalSlides * 100%` wide and each slide is an equal
   * fraction of it, so moving on by one slide is a shift of
   * `100 / totalSlides` percent. Deriving it here rather than hard-coding
   * 50 means adding a fourth slide is a one-number change.
   */
  get trackTransform(): string {
    return `translateX(-${(this.currentSlide * 100) / this.totalSlides}%)`;
  }

  /** True while any part of the hero is on screen. */
  private heroVisible = true;

  private observer?: IntersectionObserver;

  constructor() {
    this.seo.apply({
      title: 'EAST HOOD — Branding, Strategy & Production',
      exactTitle: true,
      description:
        'EAST HOOD is a branding, strategy and production house built for brands that refuse to disappear into the noise. Strategy, identity, creative direction and film.',
      path: '/',
      type: 'website'
    });

    this.seo.setJsonLd([this.seo.organization(), this.seo.webSite()]);
  }

  // ================================================================
  // VIDEO PLAYBACK
  //
  // The film runs only when all three of these hold:
  //
  //   1. the video slide is the one being shown,
  //   2. the hero is actually on screen,
  //   3. the browser tab is in the foreground.
  //
  // Left on `autoplay` it plays from the moment the page loads — behind
  // slide 1, off the bottom of a scrolled page, in a background tab —
  // burning bandwidth and battery for something nobody is watching.
  // ================================================================

  ngAfterViewInit(): void {
    // IntersectionObserver does not exist during server rendering.
    if (!this.isBrowser) {
      return;
    }

    const section = this.sectionRef?.nativeElement;

    if (section && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        entries => {
          this.heroVisible = entries.some(entry => entry.isIntersecting);
          this.syncVideo();
        },
        // A sliver counts as visible: pausing the moment the top edge
        // leaves would stop the film while it is still half on screen.
        { threshold: 0.15 }
      );

      this.observer.observe(section);
    }

    this.syncVideo();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();

    /**
     * This runs on the SERVER as well — Angular tears the application down
     * after every SSR render. There the ViewChild resolves to a DOM-shim
     * element with no media methods, so calling pause() throws
     * `video.pause is not a function` and takes the render process with it.
     */
    if (!this.isBrowser) {
      return;
    }

    // Leaving the page must stop the download, not just hide the element.
    this.videoRef?.nativeElement?.pause();
  }

  /** A backgrounded tab should not keep streaming. */
  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    this.syncVideo();
  }

  private get shouldPlay(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    return (
      this.currentSlide === VIDEO_SLIDE &&
      this.heroVisible &&
      document.visibilityState === 'visible'
    );
  }

  private syncVideo(): void {
    // Same reason as ngOnDestroy: no media API outside the browser.
    if (!this.isBrowser) {
      return;
    }

    const video = this.videoRef?.nativeElement;

    // typeof check as well as the platform check — a slide can change
    // before the view has settled, and a half-built element is not worth
    // crashing the page over.
    if (!video || typeof video.play !== 'function') {
      return;
    }

    if (this.shouldPlay) {
      // play() rejects if the browser blocks it — a muted, inline video is
      // normally allowed, but a rejected promise must never surface as an
      // unhandled error in the console.
      video.play().catch(() => {});
      return;
    }

    if (!video.paused) {
      video.pause();
    }
  }

  // ================================================================
  // SLIDER
  // ================================================================

  /** Every slide change goes through here, so playback can never drift. */
  private setSlide(index: number): void {
    this.currentSlide = index;
    this.syncVideo();

    setTimeout(() => {
      this.isAnimating = false;
    }, 900);
  }

  nextSlide(): void {
    if (this.isAnimating) return;

    this.isAnimating = true;

    this.setSlide(
      this.currentSlide === this.totalSlides - 1 ? 0 : this.currentSlide + 1
    );
  }

  previousSlide(): void {
    if (this.isAnimating) return;

    this.isAnimating = true;

    this.setSlide(
      this.currentSlide === 0 ? this.totalSlides - 1 : this.currentSlide - 1
    );
  }

  goToSlide(slide: number): void {
    if (this.isAnimating || slide === this.currentSlide) {
      return;
    }

    this.isAnimating = true;

    this.setSlide(slide);
  }

  scrollToContent(): void {
    const element = document.getElementById('work');

    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      this.nextSlide();
    }

    if (event.key === 'ArrowLeft') {
      this.previousSlide();
    }
  }
}
