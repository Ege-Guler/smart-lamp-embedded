import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-running-status',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './running-status.component.html',
  styleUrls: ['./running-status.component.scss']
})
export class RunningStatusComponent {
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
      iconClass: 'icon-online',
      label: 'MQTT',
      value: 'Connected',
      valueClass: 'online',
      tooltip: 'MQTT broker connection status'
    },
    {
      icon: 'schedule',
      iconClass: 'icon-warning',
      label: 'Last Sync',
      value: '2m ago',
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
}
