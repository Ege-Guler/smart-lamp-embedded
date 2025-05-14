import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { LightService, Light } from '../../services/light.service';

@Component({
  selector: 'app-light-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSlideToggleModule,
    MatIconModule,
    MatSliderModule,
    FormsModule
  ],
  templateUrl: './light-list.component.html',
  styleUrls: ['./light-list.component.scss']
})
export class LightListComponent implements OnInit {
  lights: Light[] = [];

  constructor(private lightService: LightService) {}

  ngOnInit() {
    this.lightService.lights$.subscribe(lights => {
      this.lights = lights;
      setTimeout(() => {}, 0); // Defer change detection to the next event loop
    });
  }

  onToggleChange(light: Light): void {
    const updatedLight = { ...light };
    this.lightService.updateLight(updatedLight);
    console.log(`${light.name} toggled to ${light.isOn}`);
  }

  onBrightnessChange(light: Light): void {
    const updatedLight = { ...light };
    this.lightService.updateLight(updatedLight);
    console.log(`${light.name} brightness changed to ${light.brightness}`);
  }
}
