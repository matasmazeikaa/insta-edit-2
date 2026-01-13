'use client'

import { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import FfmpegRender from "./Ffmpeg/FfmpegRender";

export default function GenerateVideoButton() {
    const [loadFfmpeg, setLoadedFfmpeg] = useState(false);
    const ffmpegRef = useRef<FFmpeg>(new FFmpeg());
    const [logMessages, setLogMessages] = useState<string>("");

    const loadFFmpegFunction = async () => {
        setLoadedFfmpeg(false);
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;
        ffmpeg.on("log", ({ message }) => {
            setLogMessages(message);
        });
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        });
        setLoadedFfmpeg(true);
    };

    useEffect(() => {
        loadFFmpegFunction();
    }, []);

    return (
        <div className="w-full">
            <FfmpegRender 
                loadFunction={loadFFmpegFunction}
                loadFfmpeg={loadFfmpeg}
                logMessages={logMessages}
                ffmpeg={ffmpegRef.current}
            />
        </div>
    );
}

