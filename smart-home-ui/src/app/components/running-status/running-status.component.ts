import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MqttClientService } from '../../services/mqtt.service';
import { DeviceStatusService, DeviceStatus } from '../../services/device-status.service';
import { Subscription, interval } from 'rxjs';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-running-status',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    DatePipe
  ],
  templateUrl: './running-status.component.html',
  styleUrls: ['./running-status.component.scss']
})
export class RunningStatusComponent implements OnInit, OnDestroy {
  connectionStatusItems = [
    {
      icon: 'signal_cellular_alt',
      iconClass: 'icon-online blink-icon',
      label: 'RSSI',
      value: 'Unknown',
      valueClass: '',
      tooltip: 'Wi-Fi signal strength'
    },
    {
      icon: 'cloud',
      iconClass: 'icon-offline',
      label: 'MQTT',
      value: 'Disconnected',
      valueClass: 'offline',
      tooltip: 'MQTT broker connection status'
    },
    {
      icon: 'schedule',
      iconClass: 'icon-warning',
      label: 'Last Sync',
      value: 'Never',
      valueClass: '',
      tooltip: 'Last data synchronization time'
    },
    {
      icon: 'memory',
      iconClass: 'icon-online',
      label: 'Memory',
      value: '32%',
      valueClass: '',
      tooltip: 'System memory usage'
    }
  ];

  deviceStatusItems = [
    {
      icon: 'router',
      iconClass: 'icon-online',
      label: 'Device',
      value: 'Unknown',
      valueClass: '',
      tooltip: 'Smart lamp device name'
    },
    {
      icon: 'signal_wifi_4_bar',
      iconClass: 'icon-online',
      label: 'Wi-Fi',
      value: 'Not Connected',
      valueClass: '',
      tooltip: 'Connected Wi-Fi network'
    },
    {
      icon: 'lan',
      iconClass: 'icon-online',
      label: 'IP',
      value: 'Unknown',
      valueClass: '',
      tooltip: 'Device IP address'
    },
    {
      icon: 'timer',
      iconClass: 'icon-online',
      label: 'Uptime',
      value: 'Unknown',
      valueClass: '',
      tooltip: 'Device uptime'
    }
  ];

  private subscriptions: Subscription[] = [];
  private lastMessageTime: Date | null = null;
  deviceStatus: DeviceStatus | null = null;

  constructor(
    private mqttService: MqttClientService,
    private deviceStatusService: DeviceStatusService
  ) {}

  ngOnInit(): void {
    // Subscribe to MQTT connection status
    this.subscriptions.push(
      this.mqttService.connectionStatus$.subscribe(connected => {
        const mqttStatus = this.connectionStatusItems[1];
        mqttStatus.value = connected ? 'Connected' : 'Disconnected';
        mqttStatus.valueClass = connected ? 'online' : 'offline';
        mqttStatus.iconClass = connected ? 'icon-online' : 'icon-offline';
      })
    );

    // Subscribe to MQTT last message time
    this.subscriptions.push(
      this.mqttService.lastMessageTime$.subscribe(time => {
        this.lastMessageTime = time;
        const syncStatus = this.connectionStatusItems[2];
        if (time) {
          syncStatus.value = this.getTimeAgo(time);
          syncStatus.iconClass = 'icon-online';
        } else {
          syncStatus.value = 'Never';
          syncStatus.iconClass = 'icon-warning';
        }
      })
    );

    // Update the "Last Sync" time every minute
    this.subscriptions.push(
      interval(60000).subscribe(() => {
        if (this.lastMessageTime) {
          this.connectionStatusItems[2].value = this.getTimeAgo(this.lastMessageTime);
        }
      })
    );

    // Subscribe to device status updates
    this.subscriptions.push(
      this.deviceStatusService.deviceStatus$.subscribe(status => {
        if (status) {
          this.deviceStatus = status;
          this.updateDeviceStatusDisplay(status);
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private updateDeviceStatusDisplay(status: DeviceStatus): void {
    // Update device name
    this.deviceStatusItems[0].value = status.device || 'Unknown';
    
    // Update Wi-Fi information
    this.deviceStatusItems[1].value = status.wifi_connected || 'Not Connected';
    
    // Update RSSI in connection status (replacing Network)
    if (status.rssi) {
      const signalInfo = this.deviceStatusService.getSignalStrength(status.rssi);
      this.connectionStatusItems[0].value = `${status.rssi} dBm`;
      this.connectionStatusItems[0].tooltip = `Signal strength: ${signalInfo.strength} (${status.rssi} dBm)`;
      
      // Set color based on signal strength
      if (signalInfo.strength === 'Excellent' || signalInfo.strength === 'Good') {
        this.connectionStatusItems[0].valueClass = 'online';
        this.connectionStatusItems[0].iconClass = 'icon-online blink-icon';
      } else if (signalInfo.strength === 'Fair') {
        this.connectionStatusItems[0].valueClass = 'warning';
        this.connectionStatusItems[0].iconClass = 'icon-warning blink-icon';
      } else {
        this.connectionStatusItems[0].valueClass = 'offline';
        this.connectionStatusItems[0].iconClass = 'icon-offline blink-icon';
      }
    }
    
    if (status.wifi_connected) {
      this.deviceStatusItems[1].tooltip = `Connected to ${status.wifi_connected}`;
    }
    
    // Update IP address
    this.deviceStatusItems[2].value = status.ip_addr || 'Unknown';
    this.deviceStatusItems[2].tooltip = `IP: ${status.ip_addr}, MAC: ${status.mac_addr}`;
    
    // Update uptime
    this.deviceStatusItems[3].value = this.deviceStatusService.getFormattedUptime(status.uptime);
    
    // Update memory status in the first row
    if (status.heap_free) {
      this.connectionStatusItems[3].value = `${Math.round(status.heap_free / 1024)} KB`;
      this.connectionStatusItems[3].tooltip = `Free memory: ${status.heap_free} bytes`;
    }
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}
