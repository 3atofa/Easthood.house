import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { WorkDetailComponent } from './work-detail.component';

describe('WorkDetailComponent', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ slug: 'strategic-identity' }))
          }
        }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WorkDetailComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
