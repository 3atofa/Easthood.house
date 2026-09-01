import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { SeoService } from '../../../core/seo/seo.service';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

  private readonly seo = inject(SeoService);

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


  currentSlide = 0;

  isAnimating = false;

  private readonly totalSlides = 2;

  nextSlide(): void {
    if (this.isAnimating) return;

    this.isAnimating = true;

    this.currentSlide =
      this.currentSlide === this.totalSlides - 1
        ? 0
        : this.currentSlide + 1;

    setTimeout(() => {
      this.isAnimating = false;
    }, 900);
  }

  previousSlide(): void {
    if (this.isAnimating) return;

    this.isAnimating = true;

    this.currentSlide =
      this.currentSlide === 0
        ? this.totalSlides - 1
        : this.currentSlide - 1;

    setTimeout(() => {
      this.isAnimating = false;
    }, 900);
  }

  goToSlide(slide: number): void {
    if (this.isAnimating || slide === this.currentSlide) {
      return;
    }

    this.isAnimating = true;
    this.currentSlide = slide;

    setTimeout(() => {
      this.isAnimating = false;
    }, 900);
  }

  scrollToContent(): void {
    const element = document.getElementById('work');

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth'
      });
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