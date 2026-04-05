import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolunteerMessagesComponent } from './messages.component';

describe('VolunteerMessagesComponent', () => {
  let component: VolunteerMessagesComponent;
  let fixture: ComponentFixture<VolunteerMessagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteerMessagesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VolunteerMessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
