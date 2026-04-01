async function createConsumer(transport, producerId) {
    return await transport.consume({
        producerId,
        rtpCapabilities: transport.router.rtpCapabilities,
        paused: true,
    });
}
