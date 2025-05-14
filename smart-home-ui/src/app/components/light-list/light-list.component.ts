import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatRippleModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms'; // For two-way binding with toggle

interface Light {
  name: string;
  isOn: boolean;
  color?: string; // Optional color for specific rooms
}

@Component({
  selector: 'app-light-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSlideToggleModule,
    MatIconModule,
    MatListModule,
    MatRippleModule,
    FormsModule
  ],
  templateUrl: './light-list.component.html',
  styleUrl: './light-list.component.scss'
})
export class LightListComponent implements OnInit {
  lights: Light[] = [
    { name: 'Living room', isOn: false, color: '#FF4D4F' }, // Red
    { name: 'Kitchen', isOn: true },
    { name: 'Bathroom', isOn: false, color: '#FACC15' }, // Yellow
    { name: 'Bed room 1', isOn: true, color: '#00C58E' }, // Green
    { name: 'Bed room 2', isOn: false, color: '#3B82F6' }  // Blue (when on)
  ];

  ngOnInit(): void {
    // Initialization logic here (if needed)
  }

  getToggleColor(light: Light): string {
    if (light.isOn && light.color) {
      return light.color;
    }
    return '#D1D5DB'; // Toggle Off color
  }
}