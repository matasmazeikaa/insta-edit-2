import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MediaType } from '@/app/types';

export interface MediaLoadingItem {
    fileId: string;
    fileName: string;
    type: MediaType;
    progress: number; // 0-100
    status: 'loading' | 'completed' | 'error';
    error?: string;
}

interface LoadingState {
    media: MediaLoadingItem[];
    isActive: boolean; // Whether any media files are currently loading
}

const initialState: LoadingState = {
    media: [],
    isActive: false,
};

const loadingSlice = createSlice({
    name: 'loading',
    initialState,
    reducers: {
        addMediaLoading: (state, action: PayloadAction<{ fileId: string; fileName: string; type: MediaType }>) => {
            const { fileId, fileName, type } = action.payload;
            // Check if already exists
            if (!state.media.find(m => m.fileId === fileId)) {
                state.media.push({
                    fileId,
                    fileName,
                    type,
                    progress: 0,
                    status: 'loading',
                });
                state.isActive = true;
            }
        },
        updateMediaProgress: (state, action: PayloadAction<{ fileId: string; progress: number }>) => {
            const { fileId, progress } = action.payload;
            const mediaItem = state.media.find(m => m.fileId === fileId);
            if (mediaItem) {
                mediaItem.progress = Math.min(100, Math.max(0, progress));
            }
        },
        completeMediaLoading: (state, action: PayloadAction<{ fileId: string }>) => {
            const { fileId } = action.payload;
            const mediaItem = state.media.find(m => m.fileId === fileId);
            if (mediaItem) {
                mediaItem.status = 'completed';
                mediaItem.progress = 100;
            }
            // Check if all media files are done
            const allDone = state.media.every(m => m.status === 'completed' || m.status === 'error');
            if (allDone) {
                state.isActive = false;
            }
        },
        errorMediaLoading: (state, action: PayloadAction<{ fileId: string; error: string }>) => {
            const { fileId, error } = action.payload;
            const mediaItem = state.media.find(m => m.fileId === fileId);
            if (mediaItem) {
                mediaItem.status = 'error';
                mediaItem.error = error;
            }
            // Check if all media files are done
            const allDone = state.media.every(m => m.status === 'completed' || m.status === 'error');
            if (allDone) {
                state.isActive = false;
            }
        },
        removeMediaLoading: (state, action: PayloadAction<{ fileId: string }>) => {
            const { fileId } = action.payload;
            state.media = state.media.filter(m => m.fileId !== fileId);
            // Update isActive based on remaining media files
            state.isActive = state.media.some(m => m.status === 'loading');
        },
        clearCompletedMedia: (state) => {
            // Remove completed media files after a delay (handled by component)
            state.media = state.media.filter(m => m.status === 'loading' || m.status === 'error');
            state.isActive = state.media.some(m => m.status === 'loading');
        },
        clearAllMedia: (state) => {
            state.media = [];
            state.isActive = false;
        },
    },
});

export const {
    addMediaLoading,
    updateMediaProgress,
    completeMediaLoading,
    errorMediaLoading,
    removeMediaLoading,
    clearCompletedMedia,
    clearAllMedia,
} = loadingSlice.actions;

export default loadingSlice.reducer;
