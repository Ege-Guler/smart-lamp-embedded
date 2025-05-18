import { Component, Renderer2, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LightService, Light } from '../../services/light.service';

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './quick-actions.component.html',
  styleUrls: ['./quick-actions.component.scss']
})
export class QuickActionsComponent {
  actions = [
    {
      icon: 'wb_sunny',
      label: 'Morning Mode',
      color: '#FACC15',
      tooltip: 'Set light to morning brightness'
    },
    {
      icon: 'nightlight',
      label: 'Night Mode',
      color: '#9CA3AF',
      tooltip: 'Set light to night mode'
    },
    {
      icon: 'eco',
      label: 'Work Mode',
      color: '#10B981',
      tooltip: 'Set light to work mode'
    },
    {
      icon: 'power_settings_new',
      label: 'All Off',
      color: '#FF4D4F',
      tooltip: 'Turn off all lights'
    }
  ];

  // Preset configurations for different modes
  private morningMode = {
    color: '#FFD54F', // Warm yellow
    brightness: 70
  };

  private nightMode = {
    color: '#5C6BC0', // Soft blue
    brightness: 30
  };

  private workMode = {
    color: '#4DD0E1', // Cool cyan
    brightness: 90
  };

  // Store the current lights
  private currentLights: Light[] = [];

  constructor(
    private lightService: LightService,
    private renderer: Renderer2,
    private el: ElementRef
  ) {
    // Subscribe to the lights observable to keep track of current lights
    this.lightService.lights$.subscribe(lights => {
      this.currentLights = lights;
    });
  }

  onActionClick(action: any): void {
    console.log('Action clicked:', action.label);
    
    if (this.currentLights.length === 0) return;
    
    // We have only one light now (Living Room Light)
    const light = this.currentLights[0];
    
    switch(action.label) {
      case 'Morning Mode':
        this.setLightMode(light, this.morningMode);
        break;
      case 'Night Mode':
        this.setLightMode(light, this.nightMode);
        break;
      case 'Work Mode':
        this.setLightMode(light, this.workMode);
        break;
      case 'All Off':
        this.lightService.turnOffAllLights();
        break;
    }
    
    // Force a repaint by temporarily adding and removing a class
    const body = document.body;
    body.classList.add('force-repaint');
    
    // Use requestAnimationFrame to ensure changes are applied in the next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        body.classList.remove('force-repaint');
      });
    });
  }
  
  private setLightMode(light: Light, mode: {color: string, brightness: number}): void {
    const updatedLight = { 
      ...light, 
      color: mode.color, 
      brightness: mode.brightness,
      isOn: true
    };
    
    this.lightService.updateLight(updatedLight);
  }
}
