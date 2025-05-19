import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, interval } from 'rxjs';
import { MqttClientService } from './mqtt.service';

export interface EnergyConsumption {
  uptime: number;
  energy_usage_whr_life_time: number;
  energy_usage_whr_since_start: number;
  wattage: number;
}

export interface CyclicEnergyPoint {
  timestamp: Date;
  energy: number;
  uptime: number;
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
  
  // Cyclic array to store the last 10 energy consumption data points
  private cyclicEnergyArray: EnergyConsumption[] = [];
  private maxCyclicSize = 10;
  private currentIndex = 0;
  
  // Observable for the cyclic array data formatted for plotting
  private cyclicEnergyDataSubject = new BehaviorSubject<CyclicEnergyPoint[]>([]);
  cyclicEnergyData$: Observable<CyclicEnergyPoint[]> = this.cyclicEnergyDataSubject.asObservable();
  
  private subscriptions: Subscription[] = [];
  
  constructor(private mqttService: MqttClientService) {
    // Subscribe to lamp/energyConsumption topic to receive energy data
    this.subscriptions.push(
      this.mqttService.subscribeTopic('lamp/energyConsumption').subscribe(message => {
        try {
          const payload = JSON.parse(message.payload.toString());
          this.energyDataSubject.next(payload);
          
          // Add to cyclic array
          this.addToCyclicArray(payload);
          
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
    
    // Request energy consumption data initially and then every 30 seconds (reduced from 45)
    this.requestEnergyData();
    this.subscriptions.push(
      interval(30000).subscribe(() => {
        this.requestEnergyData();
      })
    );
    
    // For testing: generate some simulated data for the cyclic array initially
    this.generateSimulatedData();
  }
  
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  // Public method to refresh energy consumption data
  refreshEnergyData(): void {
    this.requestEnergyData();
  }
  
  // Reset energy consumption data to default values
  resetEnergyData(): void {
    // Reset main energy data to null to show N/A in the UI
    this.energyDataSubject.next(null);
    
    // Clear wattage history
    this.wattageHistorySubject.next([]);
    
    // Clear cyclic energy array
    this.cyclicEnergyArray = [];
    this.currentIndex = 0;
    
    // Clear cyclic energy data for charts
    this.cyclicEnergyDataSubject.next([]);
    
    // Then request fresh data
    this.requestEnergyData();
  }
  
  private requestEnergyData(): void {
    // Send energy consumption request to lamp/request topic
    this.mqttService.publishMessage('lamp/request', JSON.stringify({
      type: 'energy_consumption'
    }));
    console.log('Energy consumption request sent to lamp');
  }
  
  // Add energy consumption data to the cyclic array
  private addToCyclicArray(data: EnergyConsumption): void {
    // Store in cyclic array
    this.cyclicEnergyArray[this.currentIndex] = data;
    
    // Move index for next insertion
    this.currentIndex = (this.currentIndex + 1) % this.maxCyclicSize;
    
    // Log the entire array with focus on session energy
    console.log('Cyclic Energy Array (10 most recent session energy points):');
    const validData = this.cyclicEnergyArray.filter(item => item !== undefined);
    console.table(validData.map(item => ({ 
      uptime: item.uptime,
      session_energy_mwh: Math.round(item.energy_usage_whr_since_start * 1000)
    })));
    
    // Calculate some stats if we have data
    if (validData.length > 0) {
      const avgEnergy = validData.reduce((sum, item) => sum + item.energy_usage_whr_since_start, 0) / validData.length;
      const maxEnergy = Math.max(...validData.map(item => item.energy_usage_whr_since_start));
      const minEnergy = Math.min(...validData.map(item => item.energy_usage_whr_since_start));
      
      console.log('Session Energy Stats from Cyclic Array:');
      console.log(`- Avg Session Energy: ${this.formatEnergy(avgEnergy)}`);
      console.log(`- Max Session Energy: ${this.formatEnergy(maxEnergy)}`);
      console.log(`- Min Session Energy: ${this.formatEnergy(minEnergy)}`);
    }
    
    // Update the cyclic energy data subject with formatted data for the chart
    this.updateCyclicEnergyData();
  }
  
  // Format the cyclic array data for plotting
  private updateCyclicEnergyData(): void {
    const validData = this.cyclicEnergyArray.filter(item => item !== undefined);
    
    if (validData.length === 0) {
      return;
    }
    
    // Calculate timestamps based on uptimes
    const now = Date.now();
    const latestUptime = Math.max(...validData.map(item => item.uptime));
    
    const formattedData: CyclicEnergyPoint[] = validData.map(item => ({
      timestamp: new Date(now - (latestUptime - item.uptime)),
      energy: item.energy_usage_whr_since_start, // This is session energy
      uptime: item.uptime
    }));
    
    // Sort by timestamp
    formattedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Log the formatted data that will be used for the chart
    console.log('Formatted data for energy chart:', formattedData.map(item => ({
      time: item.timestamp.toISOString(),
      session_energy_mwh: Math.round(item.energy * 1000)
    })));
    
    this.cyclicEnergyDataSubject.next(formattedData);
  }
  
  // Generate simulated data to ensure we have some points initially
  private generateSimulatedData(): void {
    // Generate 5 simulated data points with increasing energy values
    const baseTime = Date.now();
    const baseEnergy = 0.1; // 100 mWh
    
    for (let i = 0; i < 5; i++) {
      const simulatedData: EnergyConsumption = {
        uptime: baseTime - (5 - i) * 60000, // 1 minute apart
        energy_usage_whr_life_time: baseEnergy * 10 + i * 0.1,
        energy_usage_whr_since_start: baseEnergy + i * 0.05, // Increasing energy
        wattage: 0.1 + Math.random() * 0.1 // 100-200 mW
      };
      
      this.addToCyclicArray(simulatedData);
    }
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