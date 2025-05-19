import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-bar-graph',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    NgxChartsModule
  ],
  templateUrl: './bar-graph.component.html',
  styleUrls: ['./bar-graph.component.scss']
})
export class BarGraphComponent implements OnInit {
  data: any[] = [];
  view: [number, number] = [700, 300];
  
  // Options
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = true;
  showXAxisLabel = true;
  xAxisLabel = 'Time';
  showYAxisLabel = true;
  yAxisLabel = 'Energy Usage (kWh)';
  
  colorScheme: Color = {
    name: 'customScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#FFB020', '#FF3D71', '#3B82F6', '#00C58E']
  };

  ngOnInit() {
    this.data = [
      {
        name: 'Living Room',
        series: [
          { name: '00:00', value: 0.2 },
          { name: '04:00', value: 0.1 },
          { name: '08:00', value: 0.4 },
          { name: '12:00', value: 0.3 },
          { name: '16:00', value: 0.5 },
          { name: '20:00', value: 0.7 }
        ]
      },
      {
        name: 'Bedroom',
        series: [
          { name: '00:00', value: 0.3 },
          { name: '04:00', value: 0.2 },
          { name: '08:00', value: 0.1 },
          { name: '12:00', value: 0.2 },
          { name: '16:00', value: 0.3 },
          { name: '20:00', value: 0.4 }
        ]
      }
    ];
  }
}
