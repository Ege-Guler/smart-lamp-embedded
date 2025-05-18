import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MqttClientService } from './mqtt.service';

export interface Light {
  id: string;
  name: string;
  location: string;
  color: string;
  isOn: boolean;
  brightness: number;
}

@Injectable({
  providedIn: 'root'
})
export class LightService {
  private lightsSubject = new BehaviorSubject<Light[]>([
    { id: '1', name: 'Living Room Light', location: 'Living Room', color: '#FF4D4F', isOn: true, brightness: 80 },
  ]);

  lights$: Observable<Light[]> = this.lightsSubject.asObservable();

  constructor(private mqttService: MqttClientService) {
    // Subscribe to light status updates from MQTT
    this.mqttService.subscribeTopic('lights/+/status').subscribe(message => {
      try {
        const topic = message.topic;
        const lightId = topic.split('/')[1];
        const payload = JSON.parse(message.payload.toString());
        
        this.updateLightFromMqtt(lightId, payload);
      } catch (e) {
        console.error('Error processing MQTT message:', e);
      }
    });
  }

  turnOffAllLights(): void {
    const currentLights = this.lightsSubject.value;
    const updatedLights = currentLights.map(light => ({
      ...light,
      isOn: false
    }));
    this.lightsSubject.next(updatedLights);

    // Send proper RGBA format to lamp/config topic
    this.mqttService.publishMessage('lamp/config', JSON.stringify({
      r: 0,
      g: 0,
      b: 0,
      a: 0
    }));
  }

  updateLight(updatedLight: Light): void {
    const currentLights = this.lightsSubject.value;
    const updatedLights = currentLights.map(light =>
      light.id === updatedLight.id ? updatedLight : light
    );
    this.lightsSubject.next(updatedLights);

    // Convert hex color to RGB values
    const rgbColor = this.hexToRgb(updatedLight.color);
    
    if (rgbColor && updatedLight.isOn) {
      // Send RGBA values to the lamp/config topic as specified
      this.mqttService.publishMessage('lamp/config', JSON.stringify({
        r: rgbColor.r,
        g: rgbColor.g,
        b: rgbColor.b,
        a: Math.round(updatedLight.brightness * 2.55) // Convert 0-100 to 0-255
      }));
    } else if (!updatedLight.isOn) {
      // Turn off the light by setting brightness to 0
      this.mqttService.publishMessage('lamp/config', JSON.stringify({
        r: 0,
        g: 0,
        b: 0,
        a: 0
      }));
    }
  }

  // Convert hex color to RGB values for MQTT
  private hexToRgb(hex: string): { r: number, g: number, b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private updateLightFromMqtt(lightId: string, payload: any): void {
    const currentLights = this.lightsSubject.value;
    const updatedLights = currentLights.map(light => {
      if (light.id === lightId) {
        return {
          ...light,
          isOn: payload.isOn !== undefined ? payload.isOn : light.isOn,
          brightness: payload.brightness !== undefined ? payload.brightness : light.brightness,
          color: payload.color !== undefined ? payload.color : light.color
        };
      }
      return light;
    });
    this.lightsSubject.next(updatedLights);
  }
} 