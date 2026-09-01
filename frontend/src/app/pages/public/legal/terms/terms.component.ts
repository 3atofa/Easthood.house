import { Component } from '@angular/core';

import { LegalComponent, LegalSection } from '../legal.component';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [LegalComponent],
  template: `
    <app-legal
      title="Terms of Use"
      updated="August 2026"
      path="/terms"
      description="The terms that apply to using the EAST HOOD site, including intellectual property, enquiries and liability."
      [sections]="sections"
    />
  `
})
export class TermsComponent {

  readonly sections: LegalSection[] = [
    {
      heading: 'Using this site',
      body: [
        'This site is provided for information about EAST HOOD and its work. By using it you agree to these terms.'
      ]
    },
    {
      heading: 'Intellectual property',
      body: [
        'All content on this site — text, identity systems, film, photography and code — belongs to EAST HOOD or to the clients we produced it for. You may not reproduce it without written permission.',
        'Client work shown here is published with permission and remains the property of the respective brand owners.'
      ]
    },
    {
      heading: 'Enquiries',
      body: [
        'Sending an enquiry does not create a contract or a client relationship. Work begins only once a written agreement is signed by both sides.'
      ]
    },
    {
      heading: 'Liability',
      body: [
        'The site is provided as is. We take care to keep it accurate, but we do not guarantee that it is error free or continuously available, and we are not liable for losses arising from its use.'
      ]
    },
    {
      heading: 'Governing law',
      body: [
        'These terms are governed by the laws of the Arab Republic of Egypt.'
      ]
    }
  ];
}
