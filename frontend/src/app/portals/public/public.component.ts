import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FooterComponent } from '../../shared/footer/footer.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

/**
 * PUBLIC PORTAL SHELL
 *
 * Everything a visitor sees renders inside here, so the navbar and footer
 * exist exactly once in the app and every public page inherits them.
 */
@Component({
  selector: 'app-public',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './public.component.html',
  styleUrl: './public.component.css'
})
export class PublicComponent {}
