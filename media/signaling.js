import { createWebRtcTransport } from "./transport.js";

export class Signaling {
    io;
    router;
    peers = new Map();

    constructor(io, router) {
        this.io = io;
        this.router = router;

        io.on("connection", (socket) => {
            console.log("A user connected: ", socket.id);

            this.peers.set(socket.id, {
                "sendTransport": null,
                "recvTransport": null,
                "producers": [],
                "consumers": [],
            });

            // Handle disconnection
            socket.on("disconnect", () => {
                console.log("User disconnected: ", socket.id);

                for (const producer of this.peers.get(socket.id).producers) {
                    producer.close();
                    socket.broadcast.emit("producerClosed", { producerId: producer.id });
                }

                this.peers.delete(socket.id);
            });

            // Handler: Get RTP Capabilities
            socket.on("getRtpCapabilities", (_, callback) => {
                if (!this.router) {
                    return callback({ success: false, error: "Router not initialized" });
                }

                callback({ success: true, rtpCapabilities: this.router.rtpCapabilities });
            });

            // Handler: Create send/receive transports
            socket.on("createTransports", async (_, callback) => {
                if (!this.router) {
                    return callback({ success: false, error: "Router not initialized" });
                }

                if (!this.peers.has(socket.id)) {
                    return callback({ success: false, error: "Peer not found" });
                }

                if (this.peers.get(socket.id).sendTransport || this.peers.get(socket.id).recvTransport) {
                    return callback({ success: false, error: "Transports already exist" });
                }

                const sendTransport = await createWebRtcTransport(this.router);
                const recvTransport = await createWebRtcTransport(this.router);

                this.peers.get(socket.id).sendTransport = sendTransport;
                this.peers.get(socket.id).recvTransport = recvTransport;

                callback({
                    success: true,
                    sendTransportOptions: {
                        id: sendTransport.id,
                        iceParameters: sendTransport.iceParameters,
                        iceCandidates: sendTransport.iceCandidates,
                        dtlsParameters: sendTransport.dtlsParameters,
                    },
                    recvTransportOptions: {
                        id: recvTransport.id,
                        iceParameters: recvTransport.iceParameters,
                        iceCandidates: recvTransport.iceCandidates,
                        dtlsParameters: recvTransport.dtlsParameters,
                    },
                });
            });

            // Handler: Connect transport
            socket.on("connectTransport", async ({ transportId, dtlsParameters }, callback) => {
                const peer = this.peers.get(socket.id);

                if (!peer) {
                    return callback({ success: false, error: "Peer not found" });
                }

                const transport = peer.sendTransport && peer.sendTransport.id === transportId
                    ? peer.sendTransport
                    : peer.recvTransport && peer.recvTransport.id === transportId
                        ? peer.recvTransport
                        : null;

                if (!transport) {
                    return callback({ success: false, error: "Transport not found" });
                }

                try {
                    await transport.connect({ dtlsParameters });
                    callback({ success: true });
                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            // Handler: Produce media
            socket.on("produce", async ({ transportId, kind, rtpParameters }, callback) => {
                const peer = this.peers.get(socket.id);

                if (!peer) {
                    return callback({ success: false, error: "Peer not found" });
                }

                const transport = peer.sendTransport && peer.sendTransport.id === transportId
                    ? peer.sendTransport
                    : null;

                if (!transport) {
                    return callback({ success: false, error: "Transport not found" });
                }

                try {
                    const producer = await transport.produce({ kind, rtpParameters });
                    peer.producers.push(producer);

                    producer.on("transportclose", () => {
                        peer.producers = peer.producers.filter(p => p.id !== producer.id);
                        producer.close();

                        socket.broadcast.emit("producerClosed", { producerId: producer.id });
                    });

                    socket.broadcast.emit("newProducer", { producerId: producer.id, kind });

                    callback({ success: true, id: producer.id });
                } catch (error) {
                    callback({ success: false, error: error.message });
                }

                console.log(peer.producers.length);
            });

            // Handle: Get producers
            socket.on("getProducers", async ({ producerId, rtpCapabilities }, callback) => {
                const peer = this.peers.get(socket.id);

                if (!peer) {
                    return callback({ success: false, error: "Peer not found" });
                }

                const producers = [];

                for (const peer of this.peers.values()) {
                    for (const producer of peer.producers) {
                        producers.push({
                            producerId: producer.id,
                            kind: producer.kind,
                        });
                    }
                }

                callback({ success: true, producers });
            });

            // Handle: Consume media
            socket.on("consume", async ({ producerId, rtpCapabilities }, callback) => {
                try {
                    const peer = this.peers.get(socket.id);

                    if (!peer) {
                        return callback({ success: false, error: "Peer not found" });
                    }

                    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
                        return callback({ success: false, error: "Cannot consume this producer" });
                    }

                    const transport = peer.recvTransport;

                    if (!transport) {
                        return callback({ success: false, error: "Receive transport not found" });
                    }

                    const consumer = await transport.consume({ producerId, rtpCapabilities, paused: true });

                    peer.consumers.push(consumer);

                    consumer.on("transportclose", () => {
                        peer.consumers = peer.consumers.filter(c => c.id !== consumer.id);
                        consumer.close();
                    });

                    callback({
                        success: true,
                        id: consumer.id,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters,
                    });

                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });

            // Handler: Resume consumer
            socket.on("consumerResume", async ({ consumerId }, callback) => {
                try {
                    const peer = this.peers.get(socket.id);

                    if (!peer) {
                        return callback({ success: false, error: "Peer not found" });
                    }

                    const consumer = peer.consumers.find(c => c.id === consumerId);

                    if (!consumer) {
                        return callback({ success: false, error: "Consumer not found" });
                    }

                    await consumer.resume();
                    callback({ success: true });
                } catch (error) {
                    callback({ success: false, error: error.message });
                }
            });
        });
    }
}