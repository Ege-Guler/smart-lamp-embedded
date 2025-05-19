import { Component, Renderer2, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LightService, Light } from '../../services/light.service';
import { MqttClientService } from '../../services/mqtt.service';
import { DeviceStatusService } from '../../services/device-status.service';
import { EnergyConsumptionService } from '../../services/energy-consumption.service';

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
    },
    {
      icon: 'restart_alt',
      label: 'Reset',
      color: '#F59E0B',
      tooltip: 'Reset the lamp'
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
    private mqttService: MqttClientService,
    private deviceStatusService: DeviceStatusService,
    private energyConsumptionService: EnergyConsumptionService,
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
    
    if (this.currentLights.length === 0 && action.label !== 'Reset') return;
    
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
      case 'Reset':
        this.resetLamp();
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
  
  private resetLamp(): void {
    // Send reset command to lamp/request topic
    this.mqttService.publishMessage('lamp/request', JSON.stringify({
      type: 'reset'
    }));
    
    // Reset the UI values for light
    if (this.currentLights.length > 0) {
      const defaultLight: Light = {
        ...this.currentLights[0],
        color: '#FFFFFF',  // Default white color
        brightness: 50,    // Default 50% brightness
        isOn: true         // Turn light on by default
      };
      
      // Update the light in the service to reflect in UI
      this.lightService.updateLight(defaultLight);
    }
    
    // Reset device status to unknown values
    this.deviceStatusService.resetDeviceStatus();
    
    // Reset energy consumption data to default values
    this.energyConsumptionService.resetEnergyData();
    
    console.log('Reset command sent to lamp and all UI values reset to defaults');
  }
}
