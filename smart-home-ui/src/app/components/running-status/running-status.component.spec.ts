import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunningStatusComponent } from './running-status.component';

describe('RunningStatusComponent', () => {
  let component: RunningStatusComponent;
  let fixture: ComponentFixture<RunningStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RunningStatusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RunningStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
