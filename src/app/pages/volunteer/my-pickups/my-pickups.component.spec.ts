import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyPickupsComponent } from './my-pickups.component';

describe('MyPickupsComponent', () => {
  let component: MyPickupsComponent;
  let fixture: ComponentFixture<MyPickupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyPickupsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MyPickupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
