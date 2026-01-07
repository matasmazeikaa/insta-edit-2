'use client';

import { createClient } from '../utils/supabase/client';
import { LibraryItem, MediaType } from '../types';
import { categorizeFile } from '../utils/utils';

const STORAGE_BUCKET = 'media-library';
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB in bytes

/**
 * Get the user-specific folder path in Supabase storage
 */
function getUserFolderPath(userId: string): string {
    return `${userId}`;
}

/**
 * Upload a file to Supabase storage in the user's folder
 */
export async function uploadMediaFile(
    file: File,
    userId: string,
    onProgress?: (progress: number) => void
): Promise<LibraryItem> {
    const supabase = createClient();
    const userFolder = getUserFolderPath(userId);
    const fileId = crypto.randomUUID();
    const fileExt = file.name.split('.').pop() || 'mp4';
    const fileName = `${fileId}.${fileExt}`;
    const filePath = `${userFolder}/${fileName}`;

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 5GB limit. Current size: ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB`);
    }

    // Create initial library item with uploading status
    const libraryItem: LibraryItem = {
        id: fileId,
        name: file.name,
        url: '',
        status: 'uploading',
        type: categorizeFile(file.type),
        size: file.size,
        createdAt: new Date().toISOString(),
    };

    try {
        // Upload file to Supabase storage
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) {
            throw error;
        }

        // Generate signed URL for private bucket (valid for 1 hour)
        const { data: signedUrlData, error: urlError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (urlError) {
            throw urlError;
        }

        libraryItem.url = signedUrlData.signedUrl;
        libraryItem.status = 'completed';

        return libraryItem;
    } catch (error: any) {
        libraryItem.status = 'error';
        console.error('Error uploading file:', error);
        throw new Error(error.message || 'Failed to upload file');
    }
}

/**
 * List all media files for a user from Supabase storage
 */
export async function listUserMediaFiles(userId: string): Promise<LibraryItem[]> {
    const supabase = createClient();
    const userFolder = getUserFolderPath(userId);

    try {
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .list(userFolder, {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' },
            });

        if (error) {
            throw error;
        }

        if (!data) {
            return [];
        }

        // Get signed URLs for all files (for private bucket)
        const libraryItems: LibraryItem[] = await Promise.all(
            data.map(async (file) => {
                const filePath = `${userFolder}/${file.name}`;
                
                // Generate signed URL for private bucket (valid for 1 hour)
                const { data: signedUrlData, error: urlError } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .createSignedUrl(filePath, 3600); // 1 hour expiry

                // Extract file ID from filename (format: {id}.{ext})
                const fileId = file.name.split('.')[0];
                
                // Determine media type from file name/extension
                const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
                let mediaType: MediaType = 'unknown';
                if (['mp4', 'webm', 'mov', 'avi'].includes(fileExt)) {
                    mediaType = 'video';
                } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt)) {
                    mediaType = 'audio';
                } else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt)) {
                    mediaType = 'image';
                }

                return {
                    id: fileId,
                    name: file.name,
                    url: signedUrlData?.signedUrl || '',
                    status: urlError ? 'error' as const : 'completed',
                    type: mediaType,
                    size: file.metadata?.size || undefined,
                    createdAt: file.created_at || new Date().toISOString(),
                };
            })
        );

        return libraryItems;
    } catch (error: any) {
        console.error('Error listing media files:', error);
        return [];
    }
}

/**
 * Delete a media file from Supabase storage
 */
export async function deleteMediaFile(fileId: string, userId: string, fileName: string): Promise<void> {
    const supabase = createClient();
    const userFolder = getUserFolderPath(userId);
    
    // Extract extension from original filename or use the stored filename
    const fileExt = fileName.split('.').pop() || 'mp4';
    const storedFileName = `${fileId}.${fileExt}`;
    const filePath = `${userFolder}/${storedFileName}`;

    try {
        const { error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([filePath]);

        if (error) {
            throw error;
        }
    } catch (error: any) {
        console.error('Error deleting file:', error);
        throw new Error(error.message || 'Failed to delete file');
    }
}

/**
 * Get a signed URL for a media file (for preview purposes)
 * Useful for refreshing expired signed URLs
 */
export async function getSignedUrl(fileId: string, userId: string, fileName: string): Promise<string> {
    const supabase = createClient();
    const userFolder = getUserFolderPath(userId);
    const fileExt = fileName.split('.').pop() || 'mp4';
    const storedFileName = `${fileId}.${fileExt}`;
    const filePath = `${userFolder}/${storedFileName}`;

    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error('Failed to generate signed URL');
    }

    return data.signedUrl;
}

/**
 * Download a media file from Supabase storage as a File object
 * Uses Supabase storage download for private buckets
 */
export async function downloadMediaFile(libraryItem: LibraryItem, userId: string): Promise<File> {
    const supabase = createClient();
    const userFolder = getUserFolderPath(userId);
    
    // Reconstruct the stored file path
    // The file is stored as {fileId}.{ext} in the user's folder
    // Extract extension from the original filename or use the stored filename
    const fileExt = libraryItem.name.split('.').pop() || 'mp4';
    const storedFileName = `${libraryItem.id}.${fileExt}`;
    const filePath = `${userFolder}/${storedFileName}`;

    try {
        // Download file from Supabase storage
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .download(filePath);

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error('No data received from download');
        }

        // Convert blob to File object
        const file = new File([data], libraryItem.name, { type: data.type });
        return file;
    } catch (error: any) {
        console.error('Error downloading file:', error);
        throw new Error(error.message || 'Failed to download file');
    }
}

