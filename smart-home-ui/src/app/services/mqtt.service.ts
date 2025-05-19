import { Injectable } from '@angular/core';
import { IMqttMessage, IMqttServiceOptions, MqttConnectionState, MqttService } from 'ngx-mqtt';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MqttClientService {
  private connectionStatus = new BehaviorSubject<boolean>(false);
  connectionStatus$ = this.connectionStatus.asObservable();

  private lastMessageTime = new BehaviorSubject<Date | null>(null);
  lastMessageTime$ = this.lastMessageTime.asObservable();

  private readonly mqttOptions: IMqttServiceOptions = {
    hostname: environment.mqtt?.host || 'localhost',
    port: environment.mqtt?.port || 8883,
    protocol: (environment.mqtt?.protocol || 'wss') as 'ws' | 'wss',
    path: environment.mqtt?.path || '/mqtt', 
    username: environment.mqtt?.username,
    password: environment.mqtt?.password
  };

  constructor(private mqttService: MqttService) {
    // Subscribe to connection state changes
    this.mqttService.state.subscribe((state: MqttConnectionState) => {
      const connected = state === MqttConnectionState.CONNECTED;
      this.connectionStatus.next(connected);
      console.log('MQTT Connection State:', state);
    });

    // Try to connect to MQTT broker
    this.connect();
  }

  /**
   * Connect to MQTT broker
   */
  connect(): void {
    try {
      this.mqttService.connect(this.mqttOptions);
    } catch (error) {
      console.error('MQTT connection error:', error);
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect(): void {
    try {
      this.mqttService.disconnect();
    } catch (error) {
      console.error('MQTT disconnection error:', error);
    }
  }

  /**
   * Subscribe to a topic
   * @param topic - The topic to subscribe to
   * @returns An Observable of the messages from that topic
   */
  subscribeTopic(topic: string): Observable<IMqttMessage> {
    return this.mqttService.observe(topic);
  }

  /**
   * Publish a message to a topic
   * @param topic - The topic to publish to
   * @param message - The message to publish
   * @param options - Additional MQTT options (QoS, retain, etc.)
   */
  publishMessage(topic: string, message: string, options?: { qos?: 0 | 1 | 2; retain?: boolean }): void {
    try {
      this.mqttService.unsafePublish(topic, message, options);
      this.lastMessageTime.next(new Date());
    } catch (error) {
      console.error('MQTT publish error:', error);
    }
  }

  /**
   * Check if MQTT client is connected
   * @returns Whether MQTT client is connected
   */
  isConnected(): boolean {
    return this.connectionStatus.value;
  }
} 