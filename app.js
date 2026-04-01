const mediasoup = require("mediasoup");
const io = require("socket.io")(3000, {
    cors: {
        origin: "*",
    },
});

const { createWorker } = require("./media/worker");
const { createRouter } = require("./media/router");
const { Signaling } = require("./media/signaling");

let worker;
let router;

(async () => {
    worker = await createWorker(mediasoup);
    router = await createRouter(worker);

    signal = new Signaling(io, router);
})();
