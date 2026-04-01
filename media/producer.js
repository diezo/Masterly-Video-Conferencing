async function createProducer(transport, kind, rtpParameters) {
    return await transport.produce({
        kind,
        rtpParameters,
    });
}

module.exports = {
    createProducer
};