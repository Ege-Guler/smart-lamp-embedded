import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ColorPickerModule } from 'primeng/colorpicker';

export interface ColorPickerDialogData {
  color: string;
  name: string;
}

@Component({
  selector: 'app-color-picker-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    ColorPickerModule,
    FormsModule
  ],
  templateUrl: './color-picker-dialog.component.html',
  styleUrls: ['./color-picker-dialog.component.scss']
})
export class ColorPickerDialogComponent {
  @Input() visible = false;
  @Input() lightName = '';
  @Input() initialColor = '#FFFFFF';
  @Output() hideDialog = new EventEmitter<void>();
  @Output() colorSelected = new EventEmitter<string>();
  
  selectedColor: string;
  
  // Preset colors for the color picker
  presetColors = [
    '#FF4D4F', // red
    '#00C58E', // green
    '#FACC15', // yellow
    '#3B82F6', // blue
    '#FFB020', // orange
    '#9CA3AF', // gray
    '#10B981', // teal
    '#FF3D71'  // pink
  ];

  constructor() {
    this.selectedColor = this.initialColor;
  }

  ngOnInit() {
    this.selectedColor = this.initialColor;
  }

  ngOnChanges() {
    if (this.initialColor) {
      this.selectedColor = this.initialColor;
    }
  }

  onHide(): void {
    this.hideDialog.emit();
  }

  onCancel(): void {
    this.hideDialog.emit();
  }

  onApply(): void {
    this.colorSelected.emit(this.selectedColor);
    this.hideDialog.emit();
  }

  onColorChange(event: any): void {
    this.selectedColor = event.value;
  }
}
