import { Component } from '@angular/core';
import { LightListComponent } from "../../components/light-list/light-list.component";
import { BarGraphComponent } from "../../components/bar-graph/bar-graph.component";
import { QuickActionsComponent } from '../../components/quick-actions/quick-actions.component';
import { RunningStatusComponent } from '../../components/running-status/running-status.component';

@Component({
  selector: 'app-home',
  imports: [LightListComponent, BarGraphComponent, QuickActionsComponent, RunningStatusComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
