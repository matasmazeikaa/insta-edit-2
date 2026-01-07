import React, { useRef, useCallback, useMemo } from "react";
import Moveable, { OnScale, OnDrag, OnResize, OnRotate } from "react-moveable";
import { useAppSelector } from "@/app/store";
import { setActiveElement, setActiveElementIndex, setMediaFiles } from "@/app/store/slices/projectSlice";
import { memo, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Image from "next/image";
import Header from "../Header";
import { MediaFile } from "@/app/types";
import { debounce, throttle } from "lodash";

export default function VideoTimeline() {
    const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const { mediaFiles, activeElement, activeElementIndex, timelineZoom } = useAppSelector((state) => state.projectState);
    const dispatch = useDispatch();
    const moveableRef = useRef<Record<string, Moveable | null>>({});

    // this affect the performance cause of too much re-renders

    // const onUpdateMedia = (id: string, updates: Partial<MediaFile>) => {
    //     dispatch(setMediaFiles(mediaFiles.map(media =>
    //         media.id === id ? { ...media, ...updates } : media
    //     )));
    // };

    // TODO: this is a hack to prevent the mediaFiles from being updated too often while dragging or resizing
    const mediaFilesRef = useRef(mediaFiles);
    useEffect(() => {
        mediaFilesRef.current = mediaFiles;
    }, [mediaFiles]);

    const onUpdateMedia = useMemo(() =>
        throttle((id: string, updates: Partial<MediaFile>) => {
            const currentFiles = mediaFilesRef.current;
            const updated = currentFiles.map(media =>
                media.id === id ? { ...media, ...updates } : media
            );
            dispatch(setMediaFiles(updated));
        }, 100), [dispatch]
    );

    // Function to update a clip and push subsequent clips when resizing from the right
    const onUpdateMediaWithPush = useMemo(() =>
        throttle((clipId: string, updates: Partial<MediaFile>) => {
            const currentFiles = mediaFilesRef.current;
            
            // Get all video clips and sort by positionStart
            const videoClips = currentFiles
                .filter((clip) => clip.type === 'video')
                .sort((a, b) => a.positionStart - b.positionStart);
            
            // Find the index of the clip being resized
            const clipIndex = videoClips.findIndex(clip => clip.id === clipId);
            
            if (clipIndex === -1) {
                // If not found, just update normally
                const updated = currentFiles.map(media =>
                    media.id === clipId ? { ...media, ...updates } : media
                );
                dispatch(setMediaFiles(updated));
                return;
            }
            
            const resizedClip = videoClips[clipIndex];
            const oldPositionEnd = resizedClip.positionEnd;
            
            // Apply updates to the resized clip
            const updatedResizedClip = { ...resizedClip, ...updates };
            const newPositionEnd = updatedResizedClip.positionEnd;
            
            // Calculate the shift amount (how much the end position changed)
            const shiftAmount = newPositionEnd - oldPositionEnd;
            
            // Update all clips: the resized one and all subsequent ones
            const updated = currentFiles.map(media => {
                if (media.id === clipId) {
                    return updatedResizedClip;
                }
                
                // Find if this clip is a video that comes after the resized clip
                const clipVideoIndex = videoClips.findIndex(c => c.id === media.id);
                if (clipVideoIndex > clipIndex && media.type === 'video') {
                    // Shift this clip forward or backward
                    return {
                        ...media,
                        positionStart: Math.max(0, media.positionStart + shiftAmount),
                        positionEnd: Math.max(0, media.positionEnd + shiftAmount),
                    };
                }
                
                return media;
            });
            
            dispatch(setMediaFiles(updated));
        }, 100), [dispatch]
    );

    // Function to push subsequent clips when resizing from the left
    const pushSubsequentClips = useMemo(() =>
        throttle((clipId: string, shiftAmount: number) => {
            const currentFiles = mediaFilesRef.current;
            
            // Get all video clips and sort by positionStart
            const videoClips = currentFiles
                .filter((clip) => clip.type === 'video')
                .sort((a, b) => a.positionStart - b.positionStart);
            
            // Find the index of the clip being resized
            const clipIndex = videoClips.findIndex(clip => clip.id === clipId);
            
            if (clipIndex === -1 || shiftAmount === 0) {
                return;
            }
            
            // Update all subsequent clips
            const updated = currentFiles.map(media => {
                const clipVideoIndex = videoClips.findIndex(c => c.id === media.id);
                if (clipVideoIndex > clipIndex && media.type === 'video') {
                    return {
                        ...media,
                        positionStart: Math.max(0, media.positionStart + shiftAmount),
                        positionEnd: Math.max(0, media.positionEnd + shiftAmount),
                    };
                }
                return media;
            });
            
            dispatch(setMediaFiles(updated));
        }, 100), [dispatch]
    );

    const handleClick = (element: string, index: number | string) => {
        if (element === 'media') {
            dispatch(setActiveElement('media') as any);
            // TODO: cause we pass id when media to find the right index i will change this later (this happens cause each timeline pass its index not index from mediaFiles array)
            const actualIndex = mediaFiles.findIndex(clip => clip.id === index as unknown as string);
            dispatch(setActiveElementIndex(actualIndex));
        }
    };

    const handleDrag = (clip: MediaFile, target: HTMLElement, left: number) => {
        // no negative left
        const constrainedLeft = Math.max(left, 0);
        const newPositionStart = constrainedLeft / timelineZoom;
        onUpdateMedia(clip.id, {
            positionStart: newPositionStart,
            positionEnd: (newPositionStart - clip.positionStart) + clip.positionEnd,
            endTime: Math.max((newPositionStart - clip.positionStart) + clip.endTime, clip.endTime)
        })

        target.style.left = `${constrainedLeft}px`;
    };

    const handleRightResize = (clip: MediaFile, target: HTMLElement, width: number) => {
        const newPositionEnd = clip.positionStart + (width / timelineZoom);
        
        // Ensure minimum duration (at least 0.1 seconds)
        const minDuration = 0.1;
        const constrainedPositionEnd = Math.max(newPositionEnd, clip.positionStart + minDuration);

        onUpdateMediaWithPush(clip.id, {
            positionEnd: constrainedPositionEnd,
            endTime: Math.max(constrainedPositionEnd, clip.endTime)
        });
    };
    
    const handleLeftResize = (clip: MediaFile, target: HTMLElement, width: number) => {
        const newWidth = width / timelineZoom;
        
        // Calculate new positionStart based on the new width
        // When resizing from left, we're changing the start position
        const newPositionStart = Math.max(0, clip.positionEnd - newWidth);
        
        // Ensure minimum duration (at least 0.1 seconds)
        const minDuration = 0.1;
        const constrainedPositionStart = Math.min(newPositionStart, clip.positionEnd - minDuration);

        // Calculate how much the start moved (negative if moving left, positive if moving right)
        const shiftAmount = constrainedPositionStart - clip.positionStart;

        // Update the visual position of the target
        target.style.left = `${constrainedPositionStart * timelineZoom}px`;

        // Update the resized clip
        onUpdateMedia(clip.id, {
            positionStart: constrainedPositionStart,
            startTime: constrainedPositionStart,
        });

        // Push all subsequent clips by the shift amount
        if (shiftAmount !== 0) {
            pushSubsequentClips(clip.id, shiftAmount);
        }
    };

    useEffect(() => {
        for (const clip of mediaFiles) {
            moveableRef.current[clip.id]?.updateRect();
        }
    }, [timelineZoom, mediaFiles]);

    return (
        <div >
            {mediaFiles
                .filter((clip) => clip.type === 'video')
                .map((clip) => (
                    <div key={clip.id}>
                        <div
                            key={clip.id}
                            ref={(el: HTMLDivElement | null) => {
                                if (el) {
                                    targetRefs.current[clip.id] = el;
                                }
                            }}
                            onClick={() => handleClick('media', clip.id)}
                            className={`absolute border border-gray-500 border-opacity-50 rounded-md top-2 h-12 text-white text-sm flex items-center justify-center cursor-pointer ${
                                clip.isPlaceholder 
                                    ? 'bg-[#3A2A1F] border-orange-500 border-dashed border-2' 
                                    : 'bg-[#27272A]'
                            } ${activeElement === 'media' && mediaFiles[activeElementIndex].id === clip.id ? 'bg-[#3F3F46] border-blue-500' : ''}`}
                            style={{
                                left: `${clip.positionStart * timelineZoom}px`,
                                width: `${(clip.positionEnd / clip.playbackSpeed - clip.positionStart / clip.playbackSpeed) * timelineZoom}px`,
                                zIndex: clip.zIndex,
                            }}
                        >
                            {/* <MoveableTimeline /> */}
                            <Image
                                alt="Video"
                                className="h-7 w-7 min-w-6 mr-2 flex-shrink-0"
                                height={30}
                                width={30}
                                src={clip.isPlaceholder 
                                    ? "https://www.svgrepo.com/show/509075/cut.svg" 
                                    : "https://www.svgrepo.com/show/532727/video.svg"
                                }
                            />
                            <span className="truncate text-x">{clip.fileName}</span>
                            {clip.isPlaceholder && (
                                <span className="ml-2 text-xs text-orange-400">(Placeholder)</span>
                            )}
                        </div>
                        <Moveable
                            ref={(el: Moveable | null) => {
                                if (el) {
                                    moveableRef.current[clip.id] = el;
                                }
                            }}
                            target={targetRefs.current[clip.id] || null}
                            container={null}
                            renderDirections={activeElement === 'media' && mediaFiles[activeElementIndex].id === clip.id ? ['w', 'e'] : []}
                            draggable={true}
                            throttleDrag={0}
                            rotatable={false}
                            onDragStart={({ target, clientX, clientY }) => {
                            }}
                            onDrag={({
                                target,
                                beforeDelta, beforeDist,
                                left,
                                right,
                                delta, dist,
                                transform,
                            }: OnDrag) => {
                                handleClick('media', clip.id)
                                handleDrag(clip, target as HTMLElement, left);
                            }}
                            onDragEnd={({ target, isDrag, clientX, clientY }) => {
                            }}

                            /* resizable*/
                            resizable={true}
                            throttleResize={0}
                            onResizeStart={({ target, clientX, clientY }) => {
                            }}
                            onResize={({
                                target, width,
                                delta, direction,
                            }: OnResize) => {
                                if (direction[0] === 1) {
                                    handleClick('media', clip.id)
                                    delta[0] && (target!.style.width = `${width}px`);
                                    handleRightResize(clip, target as HTMLElement, width);
                                }
                                else if (direction[0] === -1) {
                                    handleClick('media', clip.id)
                                    delta[0] && (target!.style.width = `${width}px`);
                                    handleLeftResize(clip, target as HTMLElement, width);
                                }
                            }}
                            onResizeEnd={({ target, isDrag, clientX, clientY }) => {
                            }}
                        />
                    </div>

                ))}
        </div>
    );
}
