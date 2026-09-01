import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

interface AdminLink {
  label: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
}

/**
 * ADMIN PORTAL SHELL — dark EAST HOOD, Tailwind + Font Awesome.
 * Reached only through authGuard, so a user is always present here.
 */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin.component.html'
})
export class AdminComponent {

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.currentUser;

  readonly sidebarOpen = signal(false);
  readonly menuOpen = signal(false);

  private readonly allLinks: AdminLink[] = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'fa-chart-simple' },
    { label: 'Enquiries', path: '/admin/contact-requests', icon: 'fa-inbox' },
    { label: 'Work', path: '/admin/projects', icon: 'fa-layer-group' },
    { label: 'Articles', path: '/admin/articles', icon: 'fa-newspaper' },
    { label: 'Services', path: '/admin/services', icon: 'fa-tags' },
    { label: 'Packages', path: '/admin/packages', icon: 'fa-boxes-stacked' },
    { label: 'Users', path: '/admin/users', icon: 'fa-user-group', adminOnly: true }
  ];

  /** Editors never see the Users entry — the API refuses it either way. */
  get links(): AdminLink[] {
    return this.allLinks.filter(
      link => !link.adminOnly || this.auth.hasRole('admin')
    );
  }

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.sidebarOpen.set(false);
        this.menuOpen.set(false);
      });
  }

  get initials(): string {
    const name = this.user()?.name ?? '';

    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  logout(): void {
    this.auth.logout();
  }
}
