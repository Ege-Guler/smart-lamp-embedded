import { Component } from '@angular/core';
import { LightListComponent } from "../../components/light-list/light-list.component";
import { QuickActionsComponent } from '../../components/quick-actions/quick-actions.component';
import { RunningStatusComponent } from '../../components/running-status/running-status.component';
import { MqttTestComponent } from '../../components/mqtt-test/mqtt-test.component';
import { EnergyConsumptionComponent } from '../../components/energy-consumption/energy-consumption.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    LightListComponent,
    QuickActionsComponent, 
    RunningStatusComponent,
    EnergyConsumptionComponent,
    MqttTestComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
