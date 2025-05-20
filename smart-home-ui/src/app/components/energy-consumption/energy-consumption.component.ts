import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { EnergyConsumptionService, EnergyConsumption } from '../../services/energy-consumption.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-energy-consumption',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './energy-consumption.component.html',
  styleUrls: ['./energy-consumption.component.scss']
})
export class EnergyConsumptionComponent implements OnInit, OnDestroy {
  // Data for the energy consumption stats
  energyData: EnergyConsumption | null = null;
  
  private subscriptions: Subscription[] = [];
  
  constructor(private energyService: EnergyConsumptionService) {}
  
  ngOnInit(): void {
    // Subscribe to energy consumption data
    this.subscriptions.push(
      this.energyService.energyData$.subscribe(data => {
        this.energyData = data;
      })
    );
  }
  
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  // Card style helper methods
  getWattageIcon(): string {
    if (!this.energyData) return 'help_outline';
    
    const wattage = this.energyData.wattage;
    if (wattage < 0.1) return 'eco';
    if (wattage < 0.5) return 'power';
    return 'bolt';
  }
  
  getWattageColor(): string {
    if (!this.energyData) return '#9CA3AF'; // gray for N/A
    
    const wattage = this.energyData.wattage;
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