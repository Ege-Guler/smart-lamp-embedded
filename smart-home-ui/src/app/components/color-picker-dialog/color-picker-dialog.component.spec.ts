import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColorPickerDialogComponent } from './color-picker-dialog.component';

describe('ColorPickerDialogComponent', () => {
  let component: ColorPickerDialogComponent;
  let fixture: ComponentFixture<ColorPickerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorPickerDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColorPickerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
