import { io } from 'socket.io-client';

export class Signaling {
    socket;

    constructor(url) {
        this.socket = io(url);

        this.socket.on("connect", () => {
            console.log("Connected to signaling server:", this.socket.id);
        });

        this.socket.on("newProducer", ({ producerId, kind }) => {
            // add to dom
        });

        this.socket.on("producerClosed", ({ producerId }) => {
            // remove from dom
        });

        this.socket.on("disconnect", () => {
            console.log("Disconnected from signaling server.");
        });
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