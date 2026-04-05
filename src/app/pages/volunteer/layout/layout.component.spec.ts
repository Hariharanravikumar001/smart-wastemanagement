import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolunteerLayoutComponent } from './layout.component';

describe('VolunteerLayoutComponent', () => {
  let component: VolunteerLayoutComponent;
  let fixture: ComponentFixture<VolunteerLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteerLayoutComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VolunteerLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
