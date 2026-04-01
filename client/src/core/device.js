import { Device } from 'mediasoup-client';

export async function initDevice(signal) {
    const device = new Device();

    // Fetch RTP capabilities from the server
    try {
        const routerRtpCapabilities = await signal.getRouterRtpCapabilities();
        await device.load({ routerRtpCapabilities });

        return device;

    } catch (error) {
        console.error("Failed to retrieve router RTP capabilities:", error);
        return null;
    }
}