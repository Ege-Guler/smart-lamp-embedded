import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LightService } from '../../services/light.service';

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './quick-actions.component.html',
  styleUrls: ['./quick-actions.component.scss']
})
export class QuickActionsComponent {
  actions = [
    {
      icon: 'wb_sunny',
      label: 'Morning Mode',
      color: '#FACC15',
      tooltip: 'Set all lights to morning brightness'
    },
    {
      icon: 'nightlight',
      label: 'Night Mode',
      color: '#9CA3AF',
      tooltip: 'Set all lights to night mode'
    },
    {
      icon: 'eco',
      label: 'Work Mode',
      color: '#10B981',
      tooltip: 'Set all lights to work mode'
    },
    {
      icon: 'power_settings_new',
      label: 'All Off',
      color: '#FF4D4F',
      tooltip: 'Turn off all lights'
    }
  ];

  constructor(private lightService: LightService) {}

  onActionClick(action: any): void {
    console.log('Action clicked:', action.label);
    if (action.label === 'All Off') {
      this.lightService.turnOffAllLights();
    }
    // Other actions can be implemented here
  }
}
