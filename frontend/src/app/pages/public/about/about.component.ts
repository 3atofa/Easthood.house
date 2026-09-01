import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/seo/seo.service';


@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent {

  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: 'About',
      description:
        'EAST HOOD is a branding, strategy and production house in Cairo. We turn ideas into identities, identities into experiences, and experiences into brands people remember.',
      path: '/about',
      type: 'website'
    });

    this.seo.setJsonLd([
      this.seo.organization(),
      this.seo.breadcrumbs([{ label: 'About', path: '/about' }])
    ]);
  }


  readonly principles = [
    {
      index: '01',
      title: 'Point of view first',
      copy: 'Strategy before decoration. If a brand cannot say what it stands for in one line, nothing downstream will hold.'
    },
    {
      index: '02',
      title: 'Built to be remembered',
      copy: 'Identity systems designed for recall, not for a single launch deck. Distinct at a glance, consistent everywhere.'
    },
    {
      index: '03',
      title: 'Made, not outsourced',
      copy: 'Strategy, design and production sit in one room, so the idea that survives the pitch is the idea that ships.'
    }
  ];

  readonly stats = [
    { value: '2018', label: 'FOUNDED' },
    { value: '60+', label: 'PROJECTS' },
    { value: '12', label: 'MARKETS' },
    { value: '4', label: 'DISCIPLINES' }
  ];
}
