type WebSocketConfig = {
    url: string;
    onMessage: (data: any) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
};

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private config: WebSocketConfig;
    private reconnectInterval: number = 3000;
    private shouldReconnect: boolean = true;

    constructor(config: WebSocketConfig) {
        this.config = config;
    }

    connect() {
        this.shouldReconnect = true;
        try {
            this.ws = new WebSocket(this.config.url);

            this.ws.onopen = () => {
                console.log("WebSocket Connected");
                this.config.onOpen?.();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.config.onMessage(data);
                } catch (e) {
                    console.error("Failed to parse WebSocket message:", e);
                }
            };

            this.ws.onclose = () => {
                console.log("WebSocket Disconnected");
                this.config.onClose?.();
                if (this.shouldReconnect) {
                    setTimeout(() => this.connect(), this.reconnectInterval);
                }
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket Error:", error);
                this.config.onError?.(error);
            };
        } catch (err) {
            console.error("Failed to create WebSocket connection:", err);
        }
    }

    send(data: string | ArrayBuffer | Blob) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
        } else {
            console.warn("WebSocket is not open. Cannot send message.");
        }
    }

    disconnect() {
        this.shouldReconnect = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
