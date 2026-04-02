import { useState } from 'react'
import './App.css'
import { initDevice } from './core/device';
import { Signaling } from './core/signaling';
import { useEffect } from 'react';
import { createTransports } from './core/transport';
import { VideoPlayer } from './widgets/VideoPlayer';
import { AudioPlayer } from './widgets/AudioPlayer';


let sendTransport = null;
let recvTransport = null;


function addMediaItem(setMediaItems, id, videoTrack, audioTrack, isSelf) {
    if (isSelf === undefined) throw new Error("isSelf parameter is required for addMediaItem");

    setMediaItems(prevItems => [...prevItems, { id, videoTrack, audioTrack, isSelf }]);
}

async function startUserMedia(setMediaItems, id, sendTransport) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    addMediaItem(setMediaItems, id, videoTrack, audioTrack, true);

    sendTransport.produce({ track: videoTrack });
    sendTransport.produce({ track: audioTrack });
}

async function consume(producerId, kind, device, setMediaItems, signal) {
    console.log("Consuming '" + kind + "':", producerId);

    const data = await new Promise(resolve => {
        signal.socket.emit("consume", { producerId, rtpCapabilities: device.rtpCapabilities }, resolve);
    })

    const consumer = await recvTransport.consume({
        id: data.id,
        producerId: producerId,
        kind: data.kind,
        rtpParameters: data.rtpParameters,
    });

    addMediaItem(
        setMediaItems,
        producerId,
        kind === "video" ? consumer.track : null,
        kind === "audio" ? consumer.track : null,
        false
    );

    // resume the consumer
    signal.socket.emit("consumerResume", { consumerId: consumer.id }, (response) => {
        if (!response.success) {
            console.error("Failed to resume consumer:", response.error);
        }
    });
}

function stopConsuming(producerId, setMediaItems) {
    console.log("Stopping consumption:", producerId);

    setMediaItems(prevItems => prevItems.filter(item => item.id !== producerId));
}

function fetchProducers(signal, device, setMediaItems) {
    signal.socket.emit("getProducers", {}, (response) => {
        if (response.success) {
            response.producers.forEach(({ producerId, kind }) => {
                consume(producerId, kind, device, setMediaItems, signal);
            });
        } else {
            console.error("Failed to fetch producers:", response.error);
        }
    });
}

async function start(device, signal, setMediaItems) {
    const [sendTransportTemp, recvTransportTemp] = await createTransports(device, signal);
    sendTransport = sendTransportTemp;
    recvTransport = recvTransportTemp;

    await startUserMedia(setMediaItems, signal.socket.id, sendTransport);
    fetchProducers(signal, device, setMediaItems);
}

function App() {
    const [device, setDevice] = useState(null);
    const [signal, setSignal] = useState(null);

    const [mediaItems, setMediaItems] = useState([]);

    useEffect(() => {
        const signal = new Signaling("http://172.20.10.3:3000", consume, stopConsuming, setMediaItems);
        setSignal(signal);

        (async () => {
            await signal.connect();

            const deviceInstance = await initDevice(signal);

            setDevice(deviceInstance);
            signal.setDevice(deviceInstance);
        })();

        return () => {
            signal.close();
        }
    }, []);

    useEffect(() => {
        if (!device || !signal) return;
        start(device, signal, setMediaItems);
    }, [device, signal]);

    return (
        <div id="main">
            {mediaItems.map((item, index) => (
                <div className="candidate-item" key={item.id} style={{ display: item.videoTrack === null ? 'none' : 'block' }}>
                    <VideoPlayer videoTrack={item.videoTrack} isSelf={item.isSelf} />                    
                    <AudioPlayer audioTrack={item.audioTrack} isSelf={item.isSelf} />

                    <h4>{item.id}</h4>
                </div>
            ))}
        </div>
    )
}

export default App
