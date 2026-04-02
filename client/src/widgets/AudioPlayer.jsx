import { useRef, useEffect } from "react";

export function AudioPlayer({ audioTrack, isSelf }) {
    if (isSelf === undefined) throw new Error("isSelf prop is required for AudioPlayer");

    const audioRef = useRef();

    useEffect(() => {
        if (!audioTrack) return;

        const stream = new MediaStream([audioTrack]);
        audioRef.current.srcObject = stream;
    }, [audioTrack]);

    let audioWidget;

    if (isSelf) {
        audioWidget = <audio ref={audioRef} autoPlay muted style={{ display: "none" }} />;
    } else {
        audioWidget = <audio ref={audioRef} autoPlay style={{ display: "none" }} />;
    }

    return audioWidget;
}
