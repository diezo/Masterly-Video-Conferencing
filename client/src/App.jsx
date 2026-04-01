import { useState } from 'react'
import './App.css'
import { initDevice } from './core/device';
import { Signaling } from './core/signaling';
import { useEffect } from 'react';
import { createTransports } from './core/transport';
import { VideoPlayer } from './widgets/VideoPlayer';
import { AudioPlayer } from './widgets/AudioPlayer';

function addMediaItem(setMediaItems, id, videoTrack, audioTrack, isSelf) {
    if (!isSelf) throw new Error("isSelf parameter is required for addMediaItem");

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

function consume(producerId, kind) {
    // todo: implement consuming media from other peers
    // also maintain a consumers list locally
}

function fetchProducers(signal) {
    signal.socket.emit("getProducers", {}, (response) => {
        if (response.success) {
            response.producers.forEach(({ producerId, kind }) => {
                console.log("Consuming '" + kind + "':", producerId);
                consume(producerId, kind);
            });
        } else {
            console.error("Failed to fetch producers:", response.error);
        }
    });
}

async function start(device, signal, setMediaItems) {
    const [sendTransport, recvTransport] = await createTransports(device, signal);

    startUserMedia(setMediaItems, signal.socket.id, sendTransport);
    fetchProducers(signal);
}

function App() {
    const [device, setDevice] = useState(null);
    const [signal, setSignal] = useState(null);

    const [mediaItems, setMediaItems] = useState([]);

    useEffect(() => {
        const signal = new Signaling("http://localhost:3000");
        setSignal(signal);

        (async () => {
            await signal.connect();
            setDevice(await initDevice(signal));
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
        <div>
            <h3>Masterly Mediasoup</h3>

            {mediaItems.map((item, index) => (
                <div key={item.id}>
                    <h4>{item.id}</h4>

                    <VideoPlayer videoTrack={item.videoTrack} isSelf={item.isSelf} />
                    <AudioPlayer audioTrack={item.audioTrack} isSelf={item.isSelf} />
                </div>
            ))}
        </div>
    )
}

export default App
