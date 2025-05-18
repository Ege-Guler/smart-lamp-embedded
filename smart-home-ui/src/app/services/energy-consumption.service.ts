import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, interval } from 'rxjs';
import { MqttClientService } from './mqtt.service';

export interface EnergyConsumption {
  uptime: number;
  energy_usage_whr_life_time: number;
  energy_usage_whr_since_start: number;
  wattage: number;
}

@Injectable({
  providedIn: 'root'
})
export class EnergyConsumptionService implements OnDestroy {
  private energyDataSubject = new BehaviorSubject<EnergyConsumption | null>(null);
  energyData$: Observable<EnergyConsumption | null> = this.energyDataSubject.asObservable();
  
  // Store historical wattage data for the chart
  private wattageHistorySubject = new BehaviorSubject<{time: Date, value: number}[]>([]);
  wattageHistory$: Observable<{time: Date, value: number}[]> = this.wattageHistorySubject.asObservable();
  
  private subscriptions: Subscription[] = [];
  
  constructor(private mqttService: MqttClientService) {
    // Subscribe to lamp/energyConsumption topic to receive energy data
    this.subscriptions.push(
      this.mqttService.subscribeTopic('lamp/energyConsumption').subscribe(message => {
        try {
          const payload = JSON.parse(message.payload.toString());
          this.energyDataSubject.next(payload);
          
          // Add wattage data to history
          if (payload.wattage !== undefined) {
            const currentHistory = this.wattageHistorySubject.value;
            const newHistory = [...currentHistory, { time: new Date(), value: payload.wattage }];
            
            // Keep only the last 20 data points
            if (newHistory.length > 20) {
              newHistory.shift();
            }
            
            this.wattageHistorySubject.next(newHistory);
          }
          
          console.log('Received energy consumption data:', payload);
        } catch (e) {
          console.error('Error processing energy consumption message:', e);
        }
      })
    );
    
    // Request energy consumption data initially and then every 45 seconds
    this.requestEnergyData();
    this.subscriptions.push(
      interval(45000).subscribe(() => {
        this.requestEnergyData();
      })
    );
  }
  
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  private requestEnergyData(): void {
    // Send energy consumption request to lamp/request topic
    this.mqttService.publishMessage('lamp/request', JSON.stringify({
      type: 'energy_consumption'
    }));
    console.log('Energy consumption request sent to lamp');
  }
  
  formatWattage(wattage: number): string {
    if (wattage < 1) {
      return `${Math.round(wattage * 1000)} mW`;
    } else {
      return `${wattage.toFixed(2)} W`;
    }
  }
  
  formatEnergy(wattHours: number): string {
    if (wattHours < 1) {
      return `${Math.round(wattHours * 1000)} mWh`;
    } else if (wattHours < 1000) {
      return `${wattHours.toFixed(2)} Wh`;
    } else {
      return `${(wattHours / 1000).toFixed(2)} kWh`;
    }
  }
} 