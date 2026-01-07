"use client";

import { useAppSelector, useAppDispatch } from "@/app/store";
import { clearCompletedVideos } from "@/app/store/slices/loadingSlice";
import { useEffect, useMemo } from "react";
import { CheckCircle2, AlertCircle, Loader2, Video } from "lucide-react";

export default function VideoLoader() {
    const { videos, isActive } = useAppSelector((state) => state.loading);
    const dispatch = useAppDispatch();

    // Calculate overall progress
    const overallProgress = useMemo(() => {
        if (videos.length === 0) return 0;
        const totalProgress = videos.reduce((sum, video) => sum + video.progress, 0);
        return Math.round(totalProgress / videos.length);
    }, [videos]);

    // Auto-clear completed videos after 2 seconds when not active
    useEffect(() => {
        if (!isActive && videos.length > 0) {
            const timer = setTimeout(() => {
                dispatch(clearCompletedVideos());
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isActive, videos.length, dispatch]);

    // Show overlay whenever there are videos - this prevents blinking when isActive toggles
    const shouldShow = videos.length > 0;

    const loadingVideos = videos.filter(v => v.status === 'loading');
    const completedVideos = videos.filter(v => v.status === 'completed');
    const errorVideos = videos.filter(v => v.status === 'error');

    return (
        <div 
            className={`fixed inset-0 z-[9999] bg-[#0a0e1a]/95 backdrop-blur-md flex items-center justify-center transition-opacity duration-300 ${
                shouldShow ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            style={{ 
                WebkitBackdropFilter: 'blur(8px)',
            }}
        >
            <div className="w-full max-w-2xl mx-4">
                <div className="bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl p-8 space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                            <Video className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-1">
                                Loading Videos
                            </h3>
                            <p className="text-sm text-slate-400">
                                {loadingVideos.length} video{loadingVideos.length !== 1 ? 's' : ''} being cached to IndexedDB
                            </p>
                        </div>
                        {isActive && (
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        )}
                    </div>

                    {/* Overall Progress */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-300 font-medium">Overall Progress</span>
                            <span className="text-slate-400 font-mono">{overallProgress}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${overallProgress}%` }}
                            />
                        </div>
                    </div>

                    {/* Individual Video Progress */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {videos.map((video) => (
                            <div key={video.fileId} className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span 
                                        className="text-slate-300 truncate flex-1 mr-2" 
                                        title={video.fileName}
                                    >
                                        {video.fileName}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {video.status === 'loading' && (
                                            <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                                        )}
                                        {video.status === 'completed' && (
                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                        )}
                                        {video.status === 'error' && (
                                            <AlertCircle className="w-3 h-3 text-red-500" />
                                        )}
                                        <span className="text-slate-400 font-mono min-w-[3rem] text-right">
                                            {video.status === 'loading' 
                                                ? `${Math.round(video.progress)}%`
                                                : video.status === 'completed'
                                                ? '100%'
                                                : 'Error'
                                            }
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                            video.status === 'error'
                                                ? 'bg-red-500'
                                                : video.status === 'completed'
                                                ? 'bg-green-500'
                                                : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                        }`}
                                        style={{ width: `${video.progress}%` }}
                                    />
                                </div>
                                {video.status === 'error' && video.error && (
                                    <p className="text-xs text-red-400 mt-1">{video.error}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Status Summary */}
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
                        {completedVideos.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-slate-300">
                                    {completedVideos.length} completed
                                </span>
                            </div>
                        )}
                        {errorVideos.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-slate-300">
                                    {errorVideos.length} error{errorVideos.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                        <div className="flex-1" />
                        <span className="text-xs text-slate-500 font-mono">
                            {loadingVideos.length} remaining
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

