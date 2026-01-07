import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface VideoLoadingItem {
    fileId: string;
    fileName: string;
    progress: number; // 0-100
    status: 'loading' | 'completed' | 'error';
    error?: string;
}

interface LoadingState {
    videos: VideoLoadingItem[];
    isActive: boolean; // Whether any videos are currently loading
}

const initialState: LoadingState = {
    videos: [],
    isActive: false,
};

const loadingSlice = createSlice({
    name: 'loading',
    initialState,
    reducers: {
        addVideoLoading: (state, action: PayloadAction<{ fileId: string; fileName: string }>) => {
            const { fileId, fileName } = action.payload;
            // Check if already exists
            if (!state.videos.find(v => v.fileId === fileId)) {
                state.videos.push({
                    fileId,
                    fileName,
                    progress: 0,
                    status: 'loading',
                });
                state.isActive = true;
            }
        },
        updateVideoProgress: (state, action: PayloadAction<{ fileId: string; progress: number }>) => {
            const { fileId, progress } = action.payload;
            const video = state.videos.find(v => v.fileId === fileId);
            if (video) {
                video.progress = Math.min(100, Math.max(0, progress));
            }
        },
        completeVideoLoading: (state, action: PayloadAction<{ fileId: string }>) => {
            const { fileId } = action.payload;
            const video = state.videos.find(v => v.fileId === fileId);
            if (video) {
                video.status = 'completed';
                video.progress = 100;
            }
            // Check if all videos are done
            const allDone = state.videos.every(v => v.status === 'completed' || v.status === 'error');
            if (allDone) {
                state.isActive = false;
            }
        },
        errorVideoLoading: (state, action: PayloadAction<{ fileId: string; error: string }>) => {
            const { fileId, error } = action.payload;
            const video = state.videos.find(v => v.fileId === fileId);
            if (video) {
                video.status = 'error';
                video.error = error;
            }
            // Check if all videos are done
            const allDone = state.videos.every(v => v.status === 'completed' || v.status === 'error');
            if (allDone) {
                state.isActive = false;
            }
        },
        removeVideoLoading: (state, action: PayloadAction<{ fileId: string }>) => {
            const { fileId } = action.payload;
            state.videos = state.videos.filter(v => v.fileId !== fileId);
            // Update isActive based on remaining videos
            state.isActive = state.videos.some(v => v.status === 'loading');
        },
        clearCompletedVideos: (state) => {
            // Remove completed videos after a delay (handled by component)
            state.videos = state.videos.filter(v => v.status === 'loading' || v.status === 'error');
            state.isActive = state.videos.some(v => v.status === 'loading');
        },
        clearAllVideos: (state) => {
            state.videos = [];
            state.isActive = false;
        },
    },
});

export const {
    addVideoLoading,
    updateVideoProgress,
    completeVideoLoading,
    errorVideoLoading,
    removeVideoLoading,
    clearCompletedVideos,
    clearAllVideos,
} = loadingSlice.actions;

export default loadingSlice.reducer;

