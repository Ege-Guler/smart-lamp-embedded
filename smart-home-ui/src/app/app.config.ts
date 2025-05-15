import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { IMqttServiceOptions, MqttModule } from 'ngx-mqtt';
import { environment } from '../environments/environment';

import { routes } from './app.routes';

const MQTT_SERVICE_OPTIONS: IMqttServiceOptions = {
  hostname: environment.mqtt.host,
  port: environment.mqtt.port,
  protocol: environment.mqtt.protocol as 'ws' | 'wss',
  path: environment.mqtt.path
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideAnimations(),
    { provide: 'MQTT_SERVICE_OPTIONS', useValue: MQTT_SERVICE_OPTIONS },
    ...MqttModule.forRoot(MQTT_SERVICE_OPTIONS).providers || []
  ]
};
