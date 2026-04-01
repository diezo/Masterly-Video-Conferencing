const ANNOUNCED_IP = "127.0.0.1";

export async function createWebRtcTransport(router) {
    return await router.createWebRtcTransport({
        listenIps: [{ ip: "0.0.0.0", announcedIp: ANNOUNCED_IP }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
    });
}
