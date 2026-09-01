import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';

/**
 * ============================================================
 * EAST HOOD — ROUTING
 *
 * Two portals, each with its own shell:
 *
 *   ''       -> PublicComponent  (navbar + footer)
 *   'admin'  -> AdminComponent   (sidebar + topbar, authGuard)
 *
 * Everything is lazy loaded, so the admin bundle never ships to
 * a visitor who only ever sees the public site.
 * ============================================================
 */
export const routes: Routes = [

  // ----------------------------------------------------------
  // PUBLIC PORTAL
  // ----------------------------------------------------------
  {
    path: '',
    loadComponent: () =>
      import('./portals/public/public.component').then(m => m.PublicComponent),
    children: [
      {
        path: '',
        title: 'EAST HOOD — Branding, Strategy & Production',
        loadComponent: () =>
          import('./pages/public/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'work',
        title: 'Work — EAST HOOD',
        loadComponent: () =>
          import('./pages/public/work/work.component').then(m => m.WorkComponent)
      },
      {
        path: 'work/:slug',
        title: 'Case Study — EAST HOOD',
        loadComponent: () =>
          import('./pages/public/work-detail/work-detail.component')
            .then(m => m.WorkDetailComponent)
      },
      {
        path: 'articles',
        title: 'Insights — EAST HOOD',
        loadComponent: () =>
          import('./pages/public/articles/articles.component')
            .then(m => m.ArticlesComponent)
      },
      {
        path: 'articles/:slug',
        title: 'Article — EAST HOOD',
        loadComponent: () =>
          import('./pages/public/article-detail/article-detail.component')
            .then(m => m.ArticleDetailComponent)
      },
      {
        path: 'services',
        title: 'Capabilities — EAST HOOD',
        loadComponent: () =>
          import('./pages/public/services/services.component')
            .then(m => m.ServicesComponent)
      },
      {
        path: 'about',
        title: 'About — EAST HOOD',
        loadComponent: () =>
          import('./pages/public/about/about.component').then(m => m.AboutComponent)
      },
      {
        path: 'contact',
        title: 'Start a Project — EAST HOOD',
        data: { navTheme: 'light' },
        loadComponent: () =>
          import('./pages/public/contact/contact.component')
            .then(m => m.ContactComponent)
      },
      {
        path: 'privacy',
        title: 'Privacy Policy — EAST HOOD',
        loadComponent: () =>
          import('./pages/public/legal/privacy/privacy.component')
            .then(m => m.PrivacyComponent)
      },
      {
        path: 'terms',
        title: 'Terms of Use — EAST HOOD',
        loadComponent: () =>
          import('./pages/public/legal/terms/terms.component')
            .then(m => m.TermsComponent)
      },
      {
        path: '404',
        title: 'Page Not Found — EAST HOOD',
        loadComponent: () =>
          import('./pages/public/not-found/not-found.component')
            .then(m => m.NotFoundComponent)
      }
    ]
  },

  // ----------------------------------------------------------
  // ADMIN LOGIN — outside the shell, blocked for signed-in users
  // ----------------------------------------------------------
  {
    path: 'admin/login',
    title: 'Sign in — EAST HOOD Admin',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/admin/login/login.component').then(m => m.LoginComponent)
  },

  {
    path: 'admin/forgot-password',
    title: 'Reset Password — EAST HOOD Admin',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/admin/forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent)
  },

  // ----------------------------------------------------------
  // ADMIN PORTAL — everything below requires a session
  // ----------------------------------------------------------
  {
    path: 'admin',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./portals/admin/admin.component').then(m => m.AdminComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        title: 'Dashboard — EAST HOOD Admin',
        loadComponent: () =>
          import('./pages/admin/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'contact-requests',
        title: 'Enquiries — EAST HOOD Admin',
        loadComponent: () =>
          import('./pages/admin/contact-requests/contact-requests.component')
            .then(m => m.ContactRequestsComponent)
      },
      {
        path: 'projects',
        title: 'Work — EAST HOOD Admin',
        loadComponent: () =>
          import('./pages/admin/projects/projects.component')
            .then(m => m.ProjectsComponent)
      },
      {
        path: 'articles',
        title: 'Articles — EAST HOOD Admin',
        loadComponent: () =>
          import('./pages/admin/articles/articles.component')
            .then(m => m.AdminArticlesComponent)
      },
      {
        path: 'services',
        title: 'Services — EAST HOOD Admin',
        loadComponent: () =>
          import('./pages/admin/services/services.component')
            .then(m => m.ServicesComponent)
      },
      {
        path: 'packages',
        title: 'Packages — EAST HOOD Admin',
        loadComponent: () =>
          import('./pages/admin/packages/packages.component')
            .then(m => m.PackagesComponent)
      },
      {
        // Managing accounts is admin-only; the API enforces it too.
        path: 'users',
        title: 'Users — EAST HOOD Admin',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () =>
          import('./pages/admin/users/users.component')
            .then(m => m.UsersComponent)
      }
    ]
  },

  // ----------------------------------------------------------
  // FALLBACK
  // ----------------------------------------------------------
  {
    path: '**',
    redirectTo: '404'
  }
];
