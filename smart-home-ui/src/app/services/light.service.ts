import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

  constructor() {}

  turnOffAllLights(): void {
    const currentLights = this.lightsSubject.value;
    const updatedLights = currentLights.map(light => ({
      ...light,
      isOn: false
    }));
    this.lightsSubject.next(updatedLights);
  }

  updateLight(updatedLight: Light): void {
    const currentLights = this.lightsSubject.value;
    const updatedLights = currentLights.map(light =>
      light.id === updatedLight.id ? updatedLight : light
    );
    this.lightsSubject.next(updatedLights);
  }
} 