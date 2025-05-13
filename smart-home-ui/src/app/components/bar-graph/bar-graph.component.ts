import { Component, OnInit } from '@angular/core';
import { ChartData, ChartOptions, CategoryScale, BarElement, LinearScale, BarController, Title, Chart } from 'chart.js'; 
import { BaseChartDirective } from 'ng2-charts'; 
import { CommonModule } from '@angular/common'; 
@Component({
  selector: 'app-bar-graph',
  standalone: true, 
  imports: [CommonModule, BaseChartDirective], 
  templateUrl: './bar-graph.component.html',
  styleUrls: ['./bar-graph.component.scss'],
})
export class BarGraphComponent implements OnInit {
  ngOnInit(): void {
    Chart.register(CategoryScale, BarElement, LinearScale, BarController, Title);
  }

  public barChartData: ChartData<'bar'> = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 
    datasets: [
      {
        data: [7, 4, 6, 7, 3, 2, 1], // Example data
        backgroundColor: [
          '#FF4D4F', '#FACC15', '#00C58E', '#3B82F6', '#FFB020', '#FF3D71', '#F9FAFB', // Colors
        ],
        borderRadius: 5,
      },
    ],
  };

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    scales: {
      x: {
        type: 'category',
        min: 0,  // Ensure that the x-axis starts from 0
      },
      y: {
        type: 'linear',  // Explicitly set the y-axis as linear scale
        min: 0,  // Ensure that the y-axis starts from 0
      },
    },
  };
}
