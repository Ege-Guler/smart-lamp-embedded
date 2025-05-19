import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { EnergyConsumptionService, EnergyConsumption } from '../../services/energy-consumption.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-energy-consumption',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    NgxChartsModule
  ],
  templateUrl: './energy-consumption.component.html',
  styleUrls: ['./energy-consumption.component.scss']
})
export class EnergyConsumptionComponent implements OnInit, OnDestroy {
  // Data for the energy consumption stats
  energyData: EnergyConsumption | null = null;
  
  // Data for the line chart
  wattageChartData: any[] = [];
  
  // Chart options
  view: [number, number] = [700, 300];
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = false;
  showXAxisLabel = true;
  showYAxisLabel = true;
  xAxisLabel = 'Time';
  yAxisLabel = 'Power (mW)';
  autoScale = true;
  timeline = false;
  colorScheme = '#10B981';
  
  private subscriptions: Subscription[] = [];
  
  constructor(private energyService: EnergyConsumptionService) {}
  
  ngOnInit(): void {
    // Subscribe to energy consumption data
    this.subscriptions.push(
      this.energyService.energyData$.subscribe(data => {
        if (data) {
          this.energyData = data;
        }
      })
    );
    
    // Subscribe to wattage history for the chart
    this.subscriptions.push(
      this.energyService.wattageHistory$.subscribe(history => {
        if (history.length > 0) {
          // Format data for ngx-charts - convert watts to milliwatts
          this.wattageChartData = [
            {
              name: 'Power Usage',
              series: history.map(item => ({
                name: this.formatTime(item.time),
                value: item.value * 1000 // Convert W to mW
              }))
            }
          ];
        }
      })
    );
  }
  
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  
  // Card style helper methods
  getWattageIcon(): string {
    const wattage = this.energyData?.wattage || 0;
    if (wattage < 0.1) return 'eco';
    if (wattage < 0.5) return 'power';
    return 'bolt';
  }
  
  getWattageColor(): string {
    const wattage = this.energyData?.wattage || 0;
    if (wattage < 0.1) return '#10B981'; // green
    if (wattage < 0.5) return '#FACC15'; // yellow
    return '#F59E0B'; // orange
  }
  
  getFormattedWattage(): string {
    if (!this.energyData) return 'N/A';
    return this.energyService.formatWattage(this.energyData.wattage);
  }
  
  getFormattedLifetimeEnergy(): string {
    if (!this.energyData) return 'N/A';
    return this.energyService.formatEnergy(this.energyData.energy_usage_whr_life_time);
  }
  
  getFormattedSessionEnergy(): string {
    if (!this.energyData) return 'N/A';
    return this.energyService.formatEnergy(this.energyData.energy_usage_whr_since_start);
  }
} 