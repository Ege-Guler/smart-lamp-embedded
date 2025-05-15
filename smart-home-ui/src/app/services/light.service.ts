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
    { id: '2', name: 'Bedroom Light', location: 'Bed Room 1', color: '#00C58E', isOn: false, brightness: 60 },
    { id: '3', name: 'Bathroom Light', location: 'Bathroom', color: '#FACC15', isOn: true, brightness: 100 },
    { id: '4', name: 'Guest Room Light', location: 'Bed Room 2', color: '#3B82F6', isOn: false, brightness: 40 }
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

    // Publish MQTT message to turn off all lights
    this.mqttService.publishMessage('lights/all/command', JSON.stringify({ 
      action: 'turn_off',
      timestamp: new Date().toISOString()
    }));
  }

  updateLight(updatedLight: Light): void {
    const currentLights = this.lightsSubject.value;
    const updatedLights = currentLights.map(light =>
      light.id === updatedLight.id ? updatedLight : light
    );
    this.lightsSubject.next(updatedLights);

    // Publish MQTT message for the specific light
    this.mqttService.publishMessage(`lights/${updatedLight.id}/command`, JSON.stringify({
      isOn: updatedLight.isOn,
      brightness: updatedLight.brightness,
      color: updatedLight.color,
      timestamp: new Date().toISOString()
    }));
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