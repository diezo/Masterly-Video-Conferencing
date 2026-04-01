async function createWorker(mediasoup) {
    worker = await mediasoup.createWorker({
        rtcMinPort: 10000,
        rtcMaxPort: 10100,
    });

    console.log("Mediasoup worker created [pid:%d]", worker.pid);

    worker.on("died", () => {
        console.error("Mediasoup worker died, exiting in 2 seconds... [pid:%d]", worker.pid);
        setTimeout(() => process.exit(1), 2000);
    });

    return worker;
}

module.exports = {
    createWorker
};
