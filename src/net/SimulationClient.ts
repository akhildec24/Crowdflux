import type { ClientMessage, ServerMessage } from './types';

export class SimulationClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<(msg: ServerMessage) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private connected = false;
  private lastPingTime = 0;
  private latency = 0;
  private latencyListeners: Set<(latency: number) => void> = new Set();

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
      } catch (e) {
        reject(e);
        return;
      }

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.startPingLoop();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          this.emit(msg);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      this.ws.onerror = (e) => {
        if (!this.connected) {
          reject(new Error('WebSocket connection failed'));
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.attemptReconnect();
      };
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached');
      return;
    }
    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect().catch(() => {});
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private startPingLoop() {
    setInterval(() => {
      if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = performance.now();
        this.send({ type: 'ping' });
      }
    }, 5000);
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  on(callback: (msg: ServerMessage) => void): () => void {
    const key = '*';
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  private emit(msg: ServerMessage) {
    if (msg.type === 'pong') {
      this.latency = performance.now() - this.lastPingTime;
      this.latencyListeners.forEach((l) => l(this.latency));
      return;
    }
    this.listeners.get('*')?.forEach((cb) => cb(msg));
  }

  onLatency(callback: (latency: number) => void): () => void {
    this.latencyListeners.add(callback);
    return () => this.latencyListeners.delete(callback);
  }

  isConnected() {
    return this.connected;
  }

  getLatency() {
    return this.latency;
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }
}
