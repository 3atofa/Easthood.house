import { Component } from '@angular/core';

import { LegalComponent, LegalSection } from '../legal.component';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [LegalComponent],
  template: `
    <app-legal
      title="Privacy Policy"
      updated="August 2026"
      path="/privacy"
      description="How EAST HOOD collects, uses and stores the information you send through this site, and how to ask us to delete it."
      [sections]="sections"
    />
  `
})
export class PrivacyComponent {

  readonly sections: LegalSection[] = [
    {
      heading: 'What we collect',
      body: [
        'When you send a project enquiry through this site we collect the name, email address, project type and message you choose to give us. We do not ask for anything else, and we do not buy data about you from anyone.',
        'Like most sites we also record basic technical information — browser, approximate region, pages visited — so we can keep the site working.'
      ]
    },
    {
      heading: 'How we use it',
      body: [
        'Enquiry details are used to reply to you and to scope the work you are asking about. Nothing more.',
        'We do not sell your information, and we do not share it with third parties except the service providers that host our site and deliver our email.'
      ]
    },
    {
      heading: 'How long we keep it',
      body: [
        'Enquiries are kept for as long as the conversation is live, and for a reasonable period afterwards for our records. You can ask us to delete yours at any time.'
      ]
    },
    {
      heading: 'Your rights',
      body: [
        'You can ask to see, correct or delete the information we hold about you. Write to hello@easthood.house and we will respond.'
      ]
    },
    {
      heading: 'Contact',
      body: [
        'Questions about this policy go to hello@easthood.house.'
      ]
    }
  ];
}
