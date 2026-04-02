import { io } from 'socket.io-client';

export class Signaling {
    socket;
    consume;
    stopConsuming;
    setMediaItems;
    device;

    constructor(url, consume, stopConsuming, setMediaItems) {
        this.socket = io(url);
        this.consume = consume;
        this.stopConsuming = stopConsuming;
        this.setMediaItems = setMediaItems;

        this.socket.on("connect", () => {
            console.log("Connected to signaling server:", this.socket.id);
        });

        this.socket.on("newProducer", ({ producerId, kind }) => {
            this.consume(producerId, kind, this.device, this.setMediaItems, this);
        });

        this.socket.on("producerClosed", ({ producerId }) => {
            this.stopConsuming(producerId, this.setMediaItems);
        });

        this.socket.on("disconnect", () => {
            console.log("Disconnected from signaling server.");
        });
    }

    setDevice(device) {
        this.device = device;
    }

    connect() {
        return new Promise((resolve) => {
            if (this.socket.connected) return resolve();
            this.socket.on("connect", resolve);
        })
    }

    close() {
        this.socket.disconnect();
    }

    getRouterRtpCapabilities() {
        return new Promise((resolve, reject) => {
            this.socket.emit("getRtpCapabilities", {}, (response) => {
                if (response.error) {
                    console.error("Error fetching RTP capabilities:", response.error);
                    reject(response.error);
                } else {
                    resolve(response.rtpCapabilities);
                }
            });
        });
    }
}