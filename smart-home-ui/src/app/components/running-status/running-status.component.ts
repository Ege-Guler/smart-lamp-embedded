import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MqttClientService } from '../../services/mqtt.service';
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
  statusItems = [
    {
      icon: 'wifi',
      iconClass: 'icon-online',
      label: 'Network',
      value: 'Online',
      valueClass: 'online',
      tooltip: 'Network connection status'
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

  private subscriptions: Subscription[] = [];
  private lastMessageTime: Date | null = null;

  constructor(private mqttService: MqttClientService) {}

  ngOnInit(): void {
    // Subscribe to MQTT connection status
    this.subscriptions.push(
      this.mqttService.connectionStatus$.subscribe(connected => {
        const mqttStatus = this.statusItems[1];
        mqttStatus.value = connected ? 'Connected' : 'Disconnected';
        mqttStatus.valueClass = connected ? 'online' : 'offline';
        mqttStatus.iconClass = connected ? 'icon-online' : 'icon-offline';
      })
    );

    // Subscribe to MQTT last message time
    this.subscriptions.push(
      this.mqttService.lastMessageTime$.subscribe(time => {
        this.lastMessageTime = time;
        const syncStatus = this.statusItems[2];
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
          this.statusItems[2].value = this.getTimeAgo(this.lastMessageTime);
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
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
