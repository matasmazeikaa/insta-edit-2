"use client";

import { useState, useEffect, useRef } from "react";
import { LibraryItem } from "@/app/types";
import { listUserMediaFiles, uploadMediaFile } from "@/app/services/mediaLibraryService";
import { useAuth } from "@/app/contexts/AuthContext";
import { X, Loader2, Music, Upload } from "lucide-react";
import toast from "react-hot-toast";

interface AudioLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToTimeline: (items: LibraryItem[]) => void;
}

export function AudioLibraryModal({ isOpen, onClose, onAddToTimeline }: AudioLibraryModalProps) {
    const { user } = useAuth();
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && user) {
            loadLibraryItems();
        }
    }, [isOpen, user]);

    const loadLibraryItems = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const libraryItems = await listUserMediaFiles(user.id);
            // Filter to only show audio files
            const audioItems = libraryItems.filter(item => item.type === 'audio');
            setItems(audioItems);
        } catch (error) {
            console.error('Error loading library items:', error);
            toast.error('Failed to load library items');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelection = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const handleAdd = () => {
        const selected = items.filter(item => selectedItems.has(item.id));
        if (selected.length === 0) {
            toast.error('Please select at least one item');
            return;
        }
        onAddToTimeline(selected);
        setSelectedItems(new Set());
        onClose();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (!user) {
            toast.error('You must be logged in to upload files');
            e.target.value = "";
            return;
        }

        setIsUploading(true);
        let successCount = 0;
        let errorCount = 0;

        for (const file of files) {
            try {
                await uploadMediaFile(file, user.id);
                successCount++;
            } catch (error: any) {
                console.error('Error uploading file:', error);
                toast.error(`Failed to upload ${file.name}: ${error.message}`);
                errorCount++;
            }
        }

        if (successCount > 0) {
            toast.success(`Successfully uploaded ${successCount} file(s)`);
            // Reload library items
            await loadLibraryItems();
        }

        setIsUploading(false);
        e.target.value = "";
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white">Audio Library</h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleUploadClick}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    <span>Upload</span>
                                </>
                            )}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Music className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                            <p>No audio files in library</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => toggleSelection(item.id)}
                                    className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                                        selectedItems.has(item.id)
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-slate-700 hover:border-slate-600'
                                    }`}
                                >
                                    <div className="aspect-video bg-slate-800 rounded-t-lg flex items-center justify-center">
                                        <Music className="w-12 h-12 text-slate-500" />
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xs text-slate-300 truncate" title={item.name}>
                                            {item.name}
                                        </p>
                                        {item.size && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                {(item.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        )}
                                    </div>
                                    {selectedItems.has(item.id) && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs">✓</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between p-6 border-t border-slate-800">
                    <span className="text-sm text-slate-400">
                        {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={selectedItems.size === 0}
                            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add to Timeline
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

