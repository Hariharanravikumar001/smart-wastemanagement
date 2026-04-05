import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitizenLayoutComponent } from './layout.component';

describe('CitizenLayoutComponent', () => {
  let component: CitizenLayoutComponent;
  let fixture: ComponentFixture<CitizenLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitizenLayoutComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CitizenLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
