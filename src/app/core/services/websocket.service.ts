import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

export interface WebSocketEvent<T = any> {
  event_type: string;
  data: T;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$: Observable<boolean> = this.isConnectedSubject.asObservable();

  private eventsSubject = new Subject<WebSocketEvent>();
  public events$: Observable<WebSocketEvent> = this.eventsSubject.asObservable();

  private reconnectDelay = 3000;
  private reconnectTimer: any = null;
  private clientId = 'citizen_' + Math.random().toString(36).substring(2, 9);
  private wsUrl = 'ws://localhost:8000/ws';

  constructor(private ngZone: NgZone) {}

  public connect(token?: string): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const authToken = token || localStorage.getItem('resqai_access_token') || 'anon_token';
    const fullUrl = `${this.wsUrl}/${this.clientId}?token=${authToken}`;

    try {
      this.socket = new WebSocket(fullUrl);

      this.socket.onopen = () => {
        this.ngZone.run(() => {
          this.isConnectedSubject.next(true);
          console.log('[WebSocket] Connected to ResQAI stream:', this.clientId);
        });
      };

      this.socket.onmessage = (event: MessageEvent) => {
        this.ngZone.run(() => {
          try {
            const parsed: WebSocketEvent = JSON.parse(event.data);
            this.eventsSubject.next(parsed);
          } catch (e) {
            console.warn('[WebSocket] Unparseable message:', event.data);
          }
        });
      };

      this.socket.onerror = (err) => {
        this.ngZone.run(() => {
          console.warn('[WebSocket] Stream error, will attempt reconnect:', err);
          this.isConnectedSubject.next(false);
        });
      };

      this.socket.onclose = () => {
        this.ngZone.run(() => {
          this.isConnectedSubject.next(false);
          this.scheduleReconnect(token);
        });
      };
    } catch (err) {
      console.warn('[WebSocket] Setup exception:', err);
      this.scheduleReconnect(token);
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnectedSubject.next(false);
    }
  }

  public send(event_type: string, data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event_type, data }));
    }
  }

  private scheduleReconnect(token?: string): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(token);
    }, this.reconnectDelay);
  }
}
