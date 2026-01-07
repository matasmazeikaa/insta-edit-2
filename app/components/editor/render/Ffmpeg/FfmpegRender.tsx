'use client'
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFile, useAppSelector } from "@/app/store";
import { Heart } from "lucide-react";
import Image from "next/image";
import { extractConfigs } from "@/app/utils/extractConfigs";
import { mimeToExt } from "@/app/types";
import { toast } from "react-hot-toast";
import FfmpegProgressBar from "./ProgressBar";

interface FileUploaderProps {
    loadFunction: () => Promise<void>;
    loadFfmpeg: boolean;
    ffmpeg: FFmpeg;
    logMessages: string;
}
export default function FfmpegRender({ loadFunction, loadFfmpeg, ffmpeg, logMessages }: FileUploaderProps) {
    const { mediaFiles, projectName, exportSettings, duration, textElements } = useAppSelector(state => state.projectState);
    const totalDuration = duration;
    const videoRef = useRef<HTMLVideoElement>(null);
    const [loaded, setLoaded] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(false);

    useEffect(() => {
        if (loaded && videoRef.current && previewUrl) {
            videoRef.current.src = previewUrl;
        }
    }, [loaded, previewUrl]);

    const hasPlaceholderMediaFiles = mediaFiles.some(file => file.isPlaceholder);

    const handleCloseModal = async () => {
        setShowModal(false);
        setIsRendering(false);
        try {
            ffmpeg.terminate();
            await loadFunction();
        } catch (e) {
            console.error("Failed to reset FFmpeg:", e);
        }
    };

    const render = async () => {
        if (mediaFiles.length === 0 && textElements.length === 0) {
            console.log('No media files to render');
            return;
        }
        setShowModal(true);
        setIsRendering(true);

        const renderFunction = async () => {
            const params = extractConfigs(exportSettings);

            try {
                const filters = [];
                const overlays = [];
                const inputs = [];
                const audioDelays = [];

                // Create base black background
                filters.push(`color=c=black:size=1080x1920:d=${totalDuration.toFixed(3)}[base]`);
                // Sort videos by zIndex ascending (lowest drawn first)
                const sortedMediaFiles = [...mediaFiles].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

                for (let i = 0; i < sortedMediaFiles.length; i++) {

                    // timing
                    const { startTime, positionStart, positionEnd } = sortedMediaFiles[i];
                    const duration = positionEnd - positionStart;

                    // get the file data and write to ffmpeg
                    const fileData = await getFile(sortedMediaFiles[i].fileId);
                    const buffer = await fileData.arrayBuffer();
                    const ext = mimeToExt[fileData.type as keyof typeof mimeToExt] || fileData.type.split('/')[1];
                    await ffmpeg.writeFile(`input${i}.${ext}`, new Uint8Array(buffer));

                    // TODO: currently we have to write same file if it's used more than once in different clips the below approach is a good start to change this 
                    // let wroteFiles = new Map<string, string>();
                    // const { fileId, type } = sortedMediaFiles[i];
                    // let inputFilename: string;

                    // if (wroteFiles.has(fileId)) {
                    //     inputFilename = wroteFiles.get(fileId)!;
                    // } else {
                    //     const fileData = await getFile(fileId);
                    //     const buffer = await fileData.arrayBuffer();
                    //     const ext = mimeToExt[fileData.type as keyof typeof mimeToExt] || fileData.type.split('/')[1];
                    //     inputFilename = `input_${fileId}.${ext}`;
                    //     await ffmpeg.writeFile(inputFilename, new Uint8Array(buffer));
                    //     wroteFiles.set(fileId, inputFilename);
                    // }

                    if (sortedMediaFiles[i].type === 'image') {
                        inputs.push('-loop', '1', '-t', duration.toFixed(3), '-i', `input${i}.${ext}`);
                    }
                    else {
                        inputs.push('-i', `input${i}.${ext}`);
                    }

                    const visualLabel = `visual${i}`;
                    const audioLabel = `audio${i}`;

                    // Shift clip to correct place on timeline (video)
                    if (sortedMediaFiles[i].type === 'video') {
                        filters.push(
                            `[${i}:v]trim=start=${startTime.toFixed(3)}:duration=${duration.toFixed(3)},scale=${sortedMediaFiles[i].width}:${sortedMediaFiles[i].height},setpts=PTS-STARTPTS+${positionStart.toFixed(3)}/TB[${visualLabel}]`
                        );
                    }
                    if (sortedMediaFiles[i].type === 'image') {
                        filters.push(
                            `[${i}:v]scale=${sortedMediaFiles[i].width}:${sortedMediaFiles[i].height},setpts=PTS+${positionStart.toFixed(3)}/TB[${visualLabel}]`
                        );
                    }

                    // Apply opacity
                    if (sortedMediaFiles[i].type === 'video' || sortedMediaFiles[i].type === 'image') {
                        const alpha = Math.min(Math.max((sortedMediaFiles[i].opacity || 100) / 100, 0), 1);
                        filters.push(
                            `[${visualLabel}]format=yuva420p,colorchannelmixer=aa=${alpha}[${visualLabel}]`
                        );
                    }

                    // Store overlay range that matches shifted time
                    if (sortedMediaFiles[i].type === 'video' || sortedMediaFiles[i].type === 'image') {
                        overlays.push({
                            label: visualLabel,
                            x: sortedMediaFiles[i].x,
                            y: sortedMediaFiles[i].y,
                            start: positionStart.toFixed(3),
                            end: positionEnd.toFixed(3),
                        });
                    }

                    // Audio: trim, then delay (in ms)
                    if (sortedMediaFiles[i].type === 'audio' || sortedMediaFiles[i].type === 'video') {
                        const delayMs = Math.round(positionStart * 1000);
                        const volume = sortedMediaFiles[i].volume !== undefined ? sortedMediaFiles[i].volume / 100 : 1;
                        filters.push(
                            `[${i}:a]atrim=start=${startTime.toFixed(3)}:duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs},volume=${volume}[${audioLabel}]`
                        );
                        audioDelays.push(`[${audioLabel}]`);
                    }
                }

                // Apply overlays in z-index order
                let lastLabel = 'base';
                if (overlays.length > 0) {
                    for (let i = 0; i < overlays.length; i++) {
                        const { label, start, end, x, y } = overlays[i];
                        const nextLabel = i === overlays.length - 1 ? 'outv' : `tmp${i}`;
                        filters.push(
                            `[${lastLabel}][${label}]overlay=${x}:${y}:enable='between(t\\,${start}\\,${end})'[${nextLabel}]`
                        );
                        lastLabel = nextLabel;
                    }
                }

                // Apply text 
                if (textElements.length > 0) {
                    // Available fonts in public/fonts directory
                    const availableFonts = ['Arial', 'Inter', 'Lato', 'OpenSans', 'Roboto'];
                    const fallbackFont = 'Arial';
                    
                    // Collect unique fonts from textElements
                    const usedFonts = new Set<string>();
                    textElements.forEach(text => {
                        const font = text.font || fallbackFont;
                        // Use fallback if font doesn't exist
                        const fontToUse = availableFonts.includes(font) ? font : fallbackFont;
                        usedFonts.add(fontToUse);
                    });
                    
                    // Load only fonts that are actually used
                    for (const font of Array.from(usedFonts)) {
                        try {
                            const res = await fetch(`/fonts/${font}.ttf`);
                            if (!res.ok) {
                                console.warn(`Font ${font} not found, using fallback ${fallbackFont}`);
                                continue;
                            }
                            const fontBuf = await res.arrayBuffer();
                            await ffmpeg.writeFile(`font${font}.ttf`, new Uint8Array(fontBuf));
                        } catch (err) {
                            console.warn(`Failed to load font ${font}:`, err);
                        }
                    }
                    
                    // Apply text
                    for (let i = 0; i < textElements.length; i++) {
                        const text = textElements[i];
                        
                        // Use fallback font if the requested font doesn't exist
                        const requestedFont = text.font || fallbackFont;
                        const fontToUse = availableFonts.includes(requestedFont) ? requestedFont : fallbackFont;
                        
                        const alpha = Math.min(Math.max((text.opacity ?? 100) / 100, 0), 1);
                        const color = text.color?.includes('@') ? text.color : `${text.color || 'white'}@${alpha}`;
                        const fontSize = text.fontSize || 24;
                        const align = text.align || 'center';
                        
                        // Split text into lines
                        const textLines = text.text.split('\n');
                        const lineSpacing = Math.round(fontSize * 1.2);
                        
                        // Render each line separately for better control
                        for (let lineIndex = 0; lineIndex < textLines.length; lineIndex++) {
                            const line = textLines[lineIndex];
                            if (!line.trim() && lineIndex > 0) continue; // Skip empty lines except first
                            
                            // Escape text for FFmpeg drawtext (single quotes, escape single quotes and backslashes)
                            let escapedLine = line
                                .replace(/\\/g, '\\\\')     // Escape backslashes first
                                .replace(/'/g, "\\'")       // Escape single quotes
                                .replace(/:/g, '\\:');      // Escape colons
                            
                            escapedLine = `'${escapedLine}'`;
                            
                            // Calculate y position for this line
                            const lineY = text.y + (lineIndex * lineSpacing);
                            
                            // Calculate x position based on alignment
                            // For center: x position minus half the text width
                            // For right: x position minus full text width  
                            // For left: x position as-is
                            let xExpression: string;
                            if (align === 'center') {
                                xExpression = `${text.x}-text_w/2`;
                            } else if (align === 'right') {
                                xExpression = `${text.x}-text_w`;
                            } else {
                                xExpression = `${text.x}`;
                            }
                            
                            // Determine label: last line of last text element gets 'outv', others get intermediate labels
                            const isLastTextElement = i === textElements.length - 1;
                            const isLastLine = lineIndex === textLines.length - 1;
                            const label = (isLastTextElement && isLastLine) ? 'outv' : `text${i}_line${lineIndex}`;
                            
                            // Build drawtext filter for this line
                            const drawtextFilter = `[${lastLabel}]drawtext=fontfile=font${fontToUse}.ttf:text=${escapedLine}:x=${xExpression}:y=${lineY}:fontsize=${fontSize}:fontcolor=${color}:enable='between(t\\,${text.positionStart}\\,${text.positionEnd})'[${label}]`;
                            
                            filters.push(drawtextFilter);
                            lastLabel = label;
                        }
                    }
                }

                // Mix all audio tracks
                if (audioDelays.length > 0) {
                    const audioMix = audioDelays.join('');
                    filters.push(`${audioMix}amix=inputs=${audioDelays.length}:normalize=0[outa]`);
                }

                // Final filter_complex
                const complexFilter = filters.join('; ');
                const ffmpegArgs = [
                    ...inputs,
                    '-filter_complex', complexFilter,
                    '-map', '[outv]',
                ];

                if (audioDelays.length > 0) {
                    ffmpegArgs.push('-map', '[outa]');
                }

                ffmpegArgs.push(
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    '-preset', params.preset,
                    '-crf', params.crf.toString(),
                    '-t', totalDuration.toFixed(3),
                    'output.mp4'
                );

                await ffmpeg.exec(ffmpegArgs);

            } catch (err) {
                console.error('FFmpeg processing error:', err);
            }

            // return the output url
            const outputData = await ffmpeg.readFile('output.mp4');
            const outputBlob = new Blob([outputData as Uint8Array], { type: 'video/mp4' });
            const outputUrl = URL.createObjectURL(outputBlob);
            return outputUrl;
        };

        // Run the function and handle the result/error
        try {
            const outputUrl = await renderFunction();
            setPreviewUrl(outputUrl);
            setLoaded(true);
            setIsRendering(false);
            toast.success('Video rendered successfully');
        } catch (err) {
            toast.error('Failed to render video');
            console.error("Failed to render video:", err);
        }
    };

    const isRenderDisabled = useMemo(() => {
        return !loadFfmpeg || isRendering || mediaFiles.length === 0 || hasPlaceholderMediaFiles;
    }, [loadFfmpeg, isRendering, mediaFiles, hasPlaceholderMediaFiles]);

    console.log(loadFfmpeg, isRendering, mediaFiles.length, hasPlaceholderMediaFiles)

    console.log(isRenderDisabled)

    return (
        <>
            {/* Render Button */}
            <button
                onClick={() => render()}
                className={`inline-flex items-center p-3 bg-white hover:bg-[#ccc] rounded-lg disabled:opacity-50 text-gray-900 font-bold transition-all transform`}
                disabled={isRenderDisabled}
            >
                {(!loadFfmpeg || isRendering) && <span className="animate-spin mr-2">
                    <svg
                        viewBox="0 0 1024 1024"
                        focusable="false"
                        data-icon="loading"
                        width="1em"
                        height="1em"
                    >
                        <path d="M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z"></path>
                    </svg>
                </span>}
                <p>{loadFfmpeg ? (isRendering ? 'Rendering...' : 'Render') : 'Loading FFmpeg...'}</p>
            </button>

            {/* Render Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                    <div className="bg-black rounded-xl shadow-lg p-6 max-w-xl w-full">
                        {/* Title and close button */}
                        <div className="flex justify-between items-center mb-4">
                            <button
                                onClick={handleCloseModal}
                                className="text-white text-4xl font-bold hover:text-red-400"
                                aria-label="Close"
                            >
                                &times;
                            </button>
                        </div>

                        {isRendering ? (
                            <div>
                                <div className="bg-black p-2 h-40 text-sm font-mono rounded">
                                    <div>{logMessages}</div>
                                    <p className="text-xs text-gray-400 italic">The progress bar is experimental in FFmpeg WASM, so it might appear slow or unresponsive even though the actual processing is not.</p>
                                    <FfmpegProgressBar ffmpeg={ffmpeg} />
                                </div>
                            </div>
                        ) : (
                            <div>
                                {previewUrl && (
                                    <video src={previewUrl} controls className="w-full mb-4" />
                                )}
                                <div className="flex justify-between">
                                    <a
                                        href={previewUrl || '#'}
                                        download={`${projectName}.mp4`}
                                        className={`inline-flex items-center p-3 bg-white hover:bg-[#ccc] rounded-lg text-gray-900 font-bold transition-all transform `}
                                    >
                                        <Image
                                            alt='Download'
                                            className="Black"
                                            height={18}
                                            src={'https://www.svgrepo.com/show/501347/save.svg'}
                                            width={18}
                                        />
                                        <span className="ml-2">Save Video</span>
                                    </a>
                                    <a
                                        href="https://github.com/sponsors/mohyware"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`inline-flex items-center p-3 bg-pink-600 hover:bg-pink-500 rounded-lg text-gray-900 font-bold transition-all transform`}
                                    >
                                        <Heart size={20} className="mr-2" />
                                        Sponsor on Github
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </>
    )
}