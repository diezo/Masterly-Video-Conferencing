import { useRef, useEffect } from "react";

export function VideoPlayer({ videoTrack, isSelf }) {
    if (!isSelf) throw new Error("isSelf prop is required for VideoPlayer");

    const videoRef = useRef();

    useEffect(() => {
        if (!videoTrack) return;

        const stream = new MediaStream([videoTrack]);
        videoRef.current.srcObject = stream;
    }, [videoTrack]);

    let videoWidget;

    if (isSelf) {
        videoWidget = <video ref={videoRef} autoPlay muted playsInline className="candidate-video self-video" />;
    } else {
        videoWidget = <video ref={videoRef} autoPlay muted playsInline className="candidate-video" />;
    }

    return videoWidget;
}