import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MqttClientService } from '../../services/mqtt.service';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-mqtt-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    CardModule
  ],
  template: `
    <p-card header="MQTT Test">
      <div class="mqtt-status">
        <div class="status-indicator" [class.connected]="isConnected">
          {{ isConnected ? 'Connected' : 'Disconnected' }}
        </div>
      </div>
      
      <div class="message-form">
        <span class="p-input-icon-left">
          <i class="pi pi-comment"></i>
          <input type="text" pInputText [(ngModel)]="message" placeholder="Enter message">
        </span>
        <button pButton type="button" label="Send" (click)="sendMessage()"></button>
      </div>
      
      <div class="message-log" *ngIf="receivedMessages.length > 0">
        <h3>Received Messages:</h3>
        <ul>
          <li *ngFor="let msg of receivedMessages">
            <strong>{{ msg.topic }}:</strong> {{ msg.payload }}
          </li>
        </ul>
      </div>
    </p-card>
  `,
  styles: [`
    .mqtt-status {
      margin-bottom: 1rem;
    }
    
    .status-indicator {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: bold;
      background-color: #f44336;
      color: white;
    }
    
    .status-indicator.connected {
      background-color: #4caf50;
    }
    
    .message-form {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    .message-log {
      margin-top: 1rem;
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 0.5rem;
    }
    
    .message-log ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .message-log li {
      padding: 0.5rem;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .message-log li:last-child {
      border-bottom: none;
    }
  `]
})
export class MqttTestComponent implements OnInit, OnDestroy {
  isConnected = false;
  message = '';
  receivedMessages: { topic: string, payload: string }[] = [];
  
  private connectionSubscription?: Subscription;
  private messageSubscription?: Subscription;
  
  private readonly TEST_TOPIC = 'home/test';
  
  constructor(private mqttService: MqttClientService) {}
  
  ngOnInit(): void {
    // Subscribe to connection status
    this.connectionSubscription = this.mqttService.connectionStatus$.subscribe(
      connected => {
        this.isConnected = connected;
        console.log('MQTT connection status:', connected ? 'Connected' : 'Disconnected');
        
        // Subscribe to test topic when connected
        if (connected) {
          this.subscribeToTestTopic();
        }
      }
    );
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.connectionSubscription?.unsubscribe();
    this.messageSubscription?.unsubscribe();
  }
  
  sendMessage(): void {
    if (!this.message.trim() || !this.isConnected) return;
    
    console.log(`Sending message to ${this.TEST_TOPIC}:`, this.message);
    this.mqttService.publishMessage(this.TEST_TOPIC, this.message);
    this.message = '';
  }
  
  private subscribeToTestTopic(): void {
    console.log(`Subscribing to ${this.TEST_TOPIC}`);
    this.messageSubscription = this.mqttService.subscribeTopic(this.TEST_TOPIC)
      .subscribe({
        next: message => {
          const payload = message.payload.toString();
          console.log(`Received message from ${message.topic}:`, payload);
          
          this.receivedMessages.unshift({
            topic: message.topic,
            payload: payload
          });
          
          // Limit the number of displayed messages
          if (this.receivedMessages.length > 10) {
            this.receivedMessages.pop();
          }
        },
        error: error => {
          console.error('Error receiving message:', error);
        }
      });
  }
} 