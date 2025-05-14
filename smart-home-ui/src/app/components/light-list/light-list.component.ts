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
    // Update the brightness indicator visual as well
    if (!light.isOn) {
      light.brightness = light.brightness === 0 ? 50 : light.brightness; // Set to 50% if it was 0
    }
    
    const updatedLight = { ...light };
    this.lightService.updateLight(updatedLight);
    
    // Provide tactile feedback if available
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50); // Short vibration for feedback on mobile
    }
    
    console.log(`${light.name} toggled to ${light.isOn}`);
  }

  onSliderInput(light: Light): void {
    // Visual feedback during sliding
    console.log(`${light.name} brightness sliding to ${light.brightness}`);
    
    // Real-time update of the icon opacity without updating the service
    // The icon opacity will change immediately during sliding
  }

  onBrightnessChange(light: Light): void {
    // This is called when the slider is released
    const updatedLight = { ...light };
    this.lightService.updateLight(updatedLight);
    console.log(`${light.name} brightness changed to ${light.brightness}`);
    
    // Provide minimal tactile feedback on slider change completion
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10); // Very short vibration for subtle feedback
    }
  }
  
  // Get brightness-based color for visual feedback
  getBrightnessColor(light: Light): string {
    if (!light.isOn) return '#D1D5DB';
    
    // Adjust color brightness based on the light's brightness
    const brightnessPercent = light.brightness / 100;
    
    if (brightnessPercent < 0.3) return '#FEF3C7';
    if (brightnessPercent < 0.6) return '#FCD34D';
    if (brightnessPercent < 0.9) return '#F59E0B';
    return '#FBBF24';
  }
}
