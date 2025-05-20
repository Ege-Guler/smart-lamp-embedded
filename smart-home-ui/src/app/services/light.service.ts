import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

  get lights$(): Observable<Light[]> {
    return this.lightsSubject.pipe(
      map(lightsArray => lightsArray.map(light => ({ ...light })))
    );
  }

  // Key prefix for localStorage
  private readonly PREFERENCES_KEY_PREFIX = 'lightBrightnessPreferences_';

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
      // Record brightness preference if changed by user
      // We assume if updateLight is called and brightness is part of updatedLight, it's a user change.
      // This might need refinement if there are other paths that call updateLight.
      const originalLight = currentLights.find(light => light.id === updatedLight.id);
      if (originalLight && originalLight.brightness !== updatedLight.brightness) {
        this.recordBrightnessPreference(updatedLight.id, updatedLight.brightness);
      }

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

  private recordBrightnessPreference(lightId: string, brightness: number): void {
    const currentHour = new Date().getHours();
    const storageKey = `${this.PREFERENCES_KEY_PREFIX}${lightId}`;
    try {
      const preferencesString = localStorage.getItem(storageKey);
      let preferences: { [hour: number]: number[] } = preferencesString ? JSON.parse(preferencesString) : {};

      if (!preferences[currentHour]) {
        preferences[currentHour] = [];
      }
      // Store last N readings, e.g., 5, to avoid skewing too much by old data
      // and to keep it simple. For more advanced, use a rolling average or more complex model.
      preferences[currentHour].push(brightness);
      if (preferences[currentHour].length > 5) {
        preferences[currentHour].shift(); // Keep only the last 5 readings
      }

      localStorage.setItem(storageKey, JSON.stringify(preferences));
      console.log(`Recorded brightness ${brightness} for light ${lightId} at hour ${currentHour}`);
    } catch (e) {
      console.error('Error recording brightness preference:', e);
    }
  }

  // k-NN based learned brightness prediction
  getLearnedBrightness(lightId: string, k: number = 5): number | null {
    const currentHour = new Date().getHours();
    const storageKey = `${this.PREFERENCES_KEY_PREFIX}${lightId}`;

    try {
      let preferencesString = localStorage.getItem(storageKey);
      
      // If no preferences exist in localStorage, create and store dummy preferences first
      if (!preferencesString) {
        console.log(`No preferences found for ${lightId}. Creating and storing dummy data for k-NN.`);
        const dummyPrefsPerHour: { [hour: number]: number[] } = {};
        for (let hour_idx = 0; hour_idx < 24; hour_idx++) {
          let dummyBrightness = 50; // Default fallback
          if (hour_idx >= 0 && hour_idx <= 4) dummyBrightness = 10;    // Deep Night
          else if (hour_idx >= 5 && hour_idx <= 7) dummyBrightness = 40; // Early Morning
          else if (hour_idx >= 8 && hour_idx <= 11) dummyBrightness = 60; // Morning
          else if (hour_idx >= 12 && hour_idx <= 16) dummyBrightness = 90; // Afternoon
          else if (hour_idx >= 17 && hour_idx <= 19) dummyBrightness = 70; // Late Afternoon/Early Evening
          else if (hour_idx >= 20 && hour_idx <= 22) dummyBrightness = 40; // Evening
          else if (hour_idx === 23) dummyBrightness = 10;           // Late Night
          dummyPrefsPerHour[hour_idx] = [dummyBrightness];
        }
        preferencesString = JSON.stringify(dummyPrefsPerHour);
        localStorage.setItem(storageKey, preferencesString);
      }

      // preferencesString is now guaranteed to be non-null
      const preferences: { [hour: number]: number[] } = JSON.parse(preferencesString!);

      // Flatten the preferences into a list of data points for k-NN
      const allDataPoints: Array<{ hour: number, brightness: number }> = [];
      for (const hourStr in preferences) {
        if (preferences.hasOwnProperty(hourStr)) {
          const hourVal = parseInt(hourStr, 10);
          preferences[hourVal].forEach(brightness => {
            allDataPoints.push({ hour: hourVal, brightness });
          });
        }
      }

      if (allDataPoints.length === 0) {
        console.warn(`No data points found for light ${lightId} for k-NN.`);
        return null;
      }

      // k-NN Algorithm
      const K_NEIGHBORS = Math.min(k, allDataPoints.length); // Ensure k is not more than available points

      // Calculate distances to the currentHour for all data points
      const distances: Array<{ point: { hour: number, brightness: number }, distance: number }> = allDataPoints.map(point => {
        const diff = Math.abs(point.hour - currentHour);
        const distance = Math.min(diff, 24 - diff); // Distance for circular hours (e.g. 23:00 to 00:00 is 1 hour)
        return { point, distance };
      });

      // Sort by distance
      distances.sort((a, b) => a.distance - b.distance);

      // Take top K neighbors
      const neighbors = distances.slice(0, K_NEIGHBORS).map(d => d.point);

      if (neighbors.length === 0) {
        return null; // Should not happen if allDataPoints was not empty
      }

      // Average brightness of neighbors
      const sumBrightness = neighbors.reduce((acc, n) => acc + n.brightness, 0);
      const predictedBrightness = Math.round(sumBrightness / neighbors.length);

      // console.log(`k-NN (${K_NEIGHBORS} neighbors) for light ${lightId} (hour ${currentHour}): Data points considered for avg: ${neighbors.map(n=>`h:${n.hour},b:${n.brightness}`)} -> Predicted: ${predictedBrightness}`);
      return predictedBrightness;

    } catch (e) {
      console.error('Error in k-NN getLearnedBrightness:', e);
      return null;
    }
  }
} 