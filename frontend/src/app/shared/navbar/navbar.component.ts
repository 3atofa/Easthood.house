import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  computed,
  inject,
  signal
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';
import { filter } from 'rxjs';

import { environment } from '../../../environments/environment';

export type NavTheme = 'dark' | 'light';

interface NavLink {
  label: string;
  path: string;
  index: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly site = environment.site;

  readonly links: NavLink[] = [
    { label: 'WORK', path: '/work', index: '01' },
    { label: 'SERVICES', path: '/services', index: '02' },
    { label: 'INSIGHTS', path: '/articles', index: '03' },
    { label: 'ABOUT', path: '/about', index: '04' },
    { label: 'CONTACT', path: '/contact', index: '05' }
  ];

  /** Hidden while scrolling down, revealed the moment the user scrolls up. */
  readonly hidden = signal(false);

  /** True once the page has left the very top — switches to the solid bar. */
  readonly scrolled = signal(false);

  readonly menuOpen = signal(false);

  /**
   * Pages render on light or dark grounds, so the bar takes its ink from
   * the active route's `data.navTheme` (see app.routes.ts).
   */
  readonly theme = signal<NavTheme>('dark');

  /** The overlay menu must never sit under a hidden bar. */
  readonly barVisible = computed(() => this.menuOpen() || !this.hidden());

  private lastScrollY = 0;

  /** Ignore jitter: only react to movements bigger than this. */
  private readonly delta = 8;

  /** Never hide the bar inside the first screenful. */
  private readonly hideAfter = 120;

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.theme.set(this.resolveTheme());
        this.closeMenu();
        this.hidden.set(false);
        this.lastScrollY = 0;
        this.scrolled.set(false);
      });
  }

  /** Walks to the deepest activated route and reads its nav theme. */
  private resolveTheme(): NavTheme {
    let route = this.route;

    while (route.firstChild) {
      route = route.firstChild;
    }

    return (route.snapshot.data['navTheme'] as NavTheme) ?? 'dark';
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const y = window.scrollY || 0;

    this.scrolled.set(y > 40);

    if (Math.abs(y - this.lastScrollY) < this.delta) {
      return;
    }

    if (this.menuOpen()) {
      this.lastScrollY = y;
      return;
    }

    const scrollingDown = y > this.lastScrollY;

    this.hidden.set(scrollingDown && y > this.hideAfter);

    this.lastScrollY = y;
  }

  /**
   * The burger only exists below 900px. If the viewport grows while the
   * overlay is open the close button disappears with it, so close it here.
   * Must match the .menu-button / .desktop-nav breakpoint in the stylesheet.
   */
  @HostListener('window:resize')
  onResize(): void {
    if (this.menuOpen() && window.innerWidth >= 900) {
      this.closeMenu();
    }
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }

  toggleMenu(): void {
    this.menuOpen() ? this.closeMenu() : this.openMenu();
  }

  openMenu(): void {
    this.menuOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeMenu(): void {
    if (!this.menuOpen()) {
      return;
    }

    this.menuOpen.set(false);
    document.body.style.overflow = '';
  }
}
