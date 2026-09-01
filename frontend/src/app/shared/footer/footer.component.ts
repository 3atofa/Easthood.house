import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {

  readonly site = environment.site;

  readonly year = new Date().getFullYear();

  readonly navLinks = [
    { label: 'WORK', path: '/work' },
    { label: 'SERVICES', path: '/services' },
    { label: 'INSIGHTS', path: '/articles' },
    { label: 'ABOUT', path: '/about' },
    { label: 'CONTACT', path: '/contact' }
  ];

  readonly legalLinks = [
    { label: 'PRIVACY', path: '/privacy' },
    { label: 'TERMS', path: '/terms' }
  ];
}
