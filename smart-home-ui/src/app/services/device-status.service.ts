import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, interval } from 'rxjs';
import { MqttClientService } from './mqtt.service';

export interface DeviceStatus {
  device: string;
  wifi_connected: string;
  ip_addr: string;
  mac_addr: string;
  heap_free: number;
  rssi: number;
  uptime: number;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceStatusService implements OnDestroy {
  private deviceStatusSubject = new BehaviorSubject<DeviceStatus | null>(null);
  deviceStatus$: Observable<DeviceStatus | null> = this.deviceStatusSubject.asObservable();
  
  private subscriptions: Subscription[] = [];
  
  constructor(private mqttService: MqttClientService) {
    // Subscribe to lamp/status topic to receive device status updates
    this.subscriptions.push(
      this.mqttService.subscribeTopic('lamp/status').subscribe(message => {
        try {
          const payload = JSON.parse(message.payload.toString());
          this.deviceStatusSubject.next(payload);
          console.log('Received device status:', payload);
        } catch (e) {
          console.error('Error processing device status message:', e);
        }
      })
    );
    
    // Request device status initially and then every 30 seconds
    this.requestDeviceStatus();
    this.subscriptions.push(
      interval(30000).subscribe(() => {
        this.requestDeviceStatus();
      })
    );
  }
  
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  private requestDeviceStatus(): void {
    // Send status request to lamp/request topic
    this.mqttService.publishMessage('lamp/request', JSON.stringify({
      type: 'status'
    }));
    console.log('Status request sent to lamp');
  }
  
  getFormattedUptime(milliseconds: number): string {
    if (!milliseconds) return 'Unknown';
    
    // Convert milliseconds to seconds
    const totalSeconds = Math.floor(milliseconds / 1000);
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  getSignalStrength(rssi: number): { strength: string, percentage: number } {
    if (!rssi) return { strength: 'Unknown', percentage: 0 };
    
    // RSSI typically ranges from -30 (excellent) to -90 (poor)
    if (rssi >= -50) {
      return { strength: 'Excellent', percentage: 100 };
    } else if (rssi >= -60) {
      return { strength: 'Good', percentage: 75 };
    } else if (rssi >= -70) {
      return { strength: 'Fair', percentage: 50 };
    } else {
      return { strength: 'Poor', percentage: 25 };
    }
  }
} 