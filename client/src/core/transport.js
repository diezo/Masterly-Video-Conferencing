export async function createTransports(device, signal) {
    const {
        success,
        sendTransportOptions,
        recvTransportOptions,
        error
    } = await new Promise((resolve) => {
        signal.socket.emit("createTransports", {}, resolve);
    });

    if (!success) {
        throw new Error("Failed to create transports: " + (error || "Unknown error"));
    }

    const sendTransport = device.createSendTransport(sendTransportOptions);
    const recvTransport = device.createRecvTransport(recvTransportOptions);

    sendTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        try {
            await signal.socket.emit("connectTransport", {
                transportId: sendTransport.id,
                dtlsParameters
            }, (response) => {
                if (response.success) {
                    callback();
                } else {
                    errback(new Error("Failed to connect transport: " + (response.error || "Unknown error")));
                }
            });

            callback();
        } catch (error) {
            errback(error);
        }
    });

    recvTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        try {
            await signal.socket.emit("connectTransport", {
                transportId: recvTransport.id,
                dtlsParameters
            }, (response) => {
                if (response.success) {
                    callback();
                } else {
                    errback(new Error("Failed to connect transport: " + (response.error || "Unknown error")));
                }
            });

            callback();
        } catch (error) {
            errback(error);
        }
    });

    sendTransport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
        try {
            const { id } = await new Promise((resolve) => {
                signal.socket.emit("produce", {
                    transportId: sendTransport.id,
                    kind,
                    rtpParameters
                }, resolve);
            });

            console.log("Producing '" + kind + "':", id);

            callback({ id });
        } catch (error) {
            errback(error);
        }
    });

    console.log("Send Transport:", sendTransport.id);
    console.log("Recv Transport:", recvTransport.id);

    return [sendTransport, recvTransport];
}