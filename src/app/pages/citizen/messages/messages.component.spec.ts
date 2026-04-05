import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitizenMessagesComponent } from './messages.component';

describe('CitizenMessagesComponent', () => {
  let component: CitizenMessagesComponent;
  let fixture: ComponentFixture<CitizenMessagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitizenMessagesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CitizenMessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
