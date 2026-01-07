'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, Trash2, Plus, Loader2, Film, CheckCircle, Check } from 'lucide-react';
import { LibraryItem } from '@/app/types';
import { useAuth } from '@/app/contexts/AuthContext';
import { uploadMediaFile, listUserMediaFiles, deleteMediaFile, getSignedUrl } from '@/app/services/mediaLibraryService';
import toast from 'react-hot-toast';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToTimeline: (items: LibraryItem[]) => void;
}

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onAddToTimeline
}) => {
  const { user } = useAuth();
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map());

  const loadLibrary = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const items = await listUserMediaFiles(user.id);
      setLibrary(items);
      
      // Store preview URLs in a map for easy access
      const urlMap = new Map<string, string>();
      items.forEach(item => {
        if (item.url) {
          urlMap.set(item.id, item.url);
        }
      });
      setPreviewUrls(urlMap);
    } catch (error: any) {
      console.error('Error loading library:', error);
      toast.error('Failed to load media library');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Refresh signed URLs when they expire (every 50 minutes to be safe)
  useEffect(() => {
    if (!isOpen || !user || library.length === 0) return;

    const refreshUrls = async () => {
      const newUrlMap = new Map();
      
      for (const item of library) {
        if (item.status === 'completed') {
          try {
            const signedUrl = await getSignedUrl(item.id, user.id, item.name);
            newUrlMap.set(item.id, signedUrl);
          } catch (error) {
            console.error(`Failed to refresh URL for ${item.name}:`, error);
            // Keep the old URL if refresh fails
            setPreviewUrls(prev => {
              const oldUrl = prev.get(item.id);
              if (oldUrl) {
                newUrlMap.set(item.id, oldUrl);
              }
              return newUrlMap;
            });
            return;
          }
        }
      }
      
      setPreviewUrls(newUrlMap);
    };

    // Refresh URLs every 50 minutes
    const interval = setInterval(refreshUrls, 50 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, user, library]);

  // Load library when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadLibrary();
    }
  }, [isOpen, user, loadLibrary]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user) return;

    // Filter to only video files (as per reference code)
    const videoFiles = files.filter(file => file.type.startsWith('video/'));

    if (videoFiles.length === 0) {
      toast.error('Please select video files');
      e.target.value = '';
      return;
    }

    // Upload each file
    for (const file of videoFiles) {
      const tempId = crypto.randomUUID();
      const tempItem: LibraryItem = {
        id: tempId,
        name: file.name,
        url: '',
        status: 'uploading',
      };
      
      setLibrary(prev => [tempItem, ...prev]);
      setUploadingFiles(prev => new Set(prev).add(tempId));

      try {
        const uploadedItem = await uploadMediaFile(file, user.id);
        setLibrary(prev => prev.map(item => 
          item.id === tempId ? uploadedItem : item
        ));
        toast.success(`Uploaded ${file.name}`);
      } catch (error: any) {
        console.error('Upload error:', error);
        setLibrary(prev => prev.map(item => 
          item.id === tempId ? { ...item, status: 'error' as const } : item
        ));
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      } finally {
        setUploadingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });
      }
    }

    e.target.value = '';
  };

  const handleRemove = async (id: string) => {
    const item = library.find(l => l.id === id);
    if (!item || !user) return;

    try {
      await deleteMediaFile(id, user.id, item.name);
      setLibrary(prev => prev.filter(l => l.id !== id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast.success('File deleted');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete file: ${error.message}`);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBatchAdd = async () => {
    const items = library.filter(item => selectedIds.has(item.id) && item.status === 'completed');
    
    if (items.length === 0) {
      toast.error('No valid items selected');
      return;
    }

    try {
      // Download files and add to timeline
      onAddToTimeline(items);
      clearSelection();
      onClose();
    } catch (error: any) {
      console.error('Error adding to timeline:', error);
      toast.error('Failed to add items to timeline');
    }
  };

  const handleSingleAdd = async (item: LibraryItem) => {
    if (item.status !== 'completed') {
      toast.error('File is not ready yet');
      return;
    }

    try {
      onAddToTimeline([item]);
      onClose();
    } catch (error: any) {
      console.error('Error adding to timeline:', error);
      toast.error('Failed to add item to timeline');
    }
  };

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#0f172a] w-full max-w-4xl h-[80vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden relative">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-blue-500" /> Media Library
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-400">Please log in to access your media library</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] w-full max-w-4xl h-[80vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-blue-500" /> Media Library
            </h2>
            <p className="text-sm text-slate-400">Manage your uploaded assets (Max 5GB per file)</p>
          </div>
          <div className="flex items-center gap-4">
             <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20">
                <Upload className="w-4 h-4" />
                Upload New
                <input 
                  type="file" 
                  multiple 
                  accept="video/*" 
                  className="hidden" 
                  onChange={handleUpload}
                  disabled={uploadingFiles.size > 0}
                />
             </label>
             <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
               <X className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#020617] custom-scrollbar pb-24">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : library.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 border-2 border-dashed border-slate-800 rounded-xl m-4 bg-slate-900/20">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                 <Upload className="w-8 h-8 text-slate-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-slate-400">Your library is empty</p>
                <p className="text-sm text-slate-600">Upload videos to start creating</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {library.map((item) => {
                const isSelected = selectedIds.has(item.id);
                const isUploading = uploadingFiles.has(item.id);

                return (
                  <div 
                    key={item.id} 
                    onClick={() => !isUploading && toggleSelection(item.id)}
                    className={`group relative aspect-video bg-black rounded-xl overflow-hidden border transition-all shadow-lg cursor-pointer ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-slate-800 hover:border-slate-600'} ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                  >
                     {item.type === 'image' ? (
                       <img 
                         src={previewUrls.get(item.id) || item.url} 
                         alt={item.name}
                         className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}
                         onError={async (e) => {
                           // Try to refresh the signed URL if image fails to load
                           if (user && item.status === 'completed') {
                             try {
                               const newUrl = await getSignedUrl(item.id, user.id, item.name);
                               setPreviewUrls(prev => {
                                 const newMap = new Map(prev);
                                 newMap.set(item.id, newUrl);
                                 return newMap;
                               });
                               (e.target as HTMLImageElement).src = newUrl;
                             } catch (error) {
                               console.error('Failed to refresh image URL:', error);
                             }
                           }
                         }}
                       />
                     ) : (
                       <video 
                         src={previewUrls.get(item.id) || item.url} 
                         className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}
                         muted
                         playsInline
                         onError={async (e) => {
                           // Try to refresh the signed URL if video fails to load
                           if (user && item.status === 'completed') {
                             try {
                               const newUrl = await getSignedUrl(item.id, user.id, item.name);
                               setPreviewUrls(prev => {
                                 const newMap = new Map(prev);
                                 newMap.set(item.id, newUrl);
                                 return newMap;
                               });
                               (e.target as HTMLVideoElement).src = newUrl;
                             } catch (error) {
                               console.error('Failed to refresh video URL:', error);
                             }
                           }
                         }}
                       />
                     )}
                     
                     {/* Selection Indicator */}
                     <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-sm transition-all ${isSelected ? 'bg-blue-500 text-white border-blue-400' : 'bg-black/40 text-transparent'}`}>
                        <Check className="w-3 h-3" />
                     </div>

                     {/* Hover Actions (Single) */}
                     {!isSelected && selectedIds.size === 0 && !isUploading && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[1px]">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleSingleAdd(item); 
                              }}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-full hover:bg-blue-500 hover:scale-105 transition-all flex items-center gap-2 shadow-lg"
                            >
                              <Plus className="w-4 h-4" /> Add One
                            </button>
                        </div>
                     )}

                     {/* Status Badge */}
                     <div className="absolute top-2 right-2 pointer-events-none z-10">
                        {item.status === 'uploading' && (
                          <div className="bg-black/50 p-1.5 rounded-full backdrop-blur-md">
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                          </div>
                        )}
                        {item.status === 'completed' && (
                          <div className="bg-green-500/20 p-1 rounded-full backdrop-blur-md border border-green-500/30">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                          </div>
                        )}
                        {item.status === 'error' && (
                          <div className="bg-red-900/80 p-1 rounded-full">
                            <span className="text-[10px] text-red-200 font-bold px-1">ERR</span>
                          </div>
                        )}
                     </div>
                     
                     {/* Name Badge */}
                     <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
                       <p className="text-xs text-slate-200 truncate font-medium drop-shadow-md">{item.name}</p>
                     </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Batch Action Bar */}
        {selectedIds.size > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-full px-6 py-3 flex items-center gap-4 shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
             <span className="text-sm font-bold text-white whitespace-nowrap">
               {selectedIds.size} Selected
             </span>
             <div className="h-4 w-px bg-slate-700" />
             <button 
                onClick={handleBatchAdd}
                className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2"
             >
                <Plus className="w-4 h-4" /> Add to Timeline
             </button>
             <div className="h-4 w-px bg-slate-700" />
             <button 
                onClick={() => {
                   // Batch Delete
                   if (confirm(`Delete ${selectedIds.size} items?`)) {
                     selectedIds.forEach(id => handleRemove(id));
                     clearSelection();
                   }
                }}
                className="text-sm font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
             >
                <Trash2 className="w-4 h-4" /> Delete
             </button>
             <div className="h-4 w-px bg-slate-700" />
             <button onClick={clearSelection} className="p-1 hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-4 h-4 text-slate-500" />
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

