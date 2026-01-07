
import React, { useState } from 'react';
import { Upload, Music, Trash2, FileVideo, Sparkles, Loader2, LayoutGrid, LogOut, Zap, Crown, Library, Link } from 'lucide-react';
import { AudioTrack, UserStats } from '@/app/types';

interface SidebarLeftProps {
  // Removed direct library/clips props as they are now handled via modal or not shown
  audio: AudioTrack | null;
  onOpenLibrary: () => void;
  onQuickUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; // New Prop
  onUploadAudio: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAudio: () => void;
  audioVolume: number;
  setAudioVolume: (vol: number) => void;
  onImportReference: (file: File) => Promise<void>;
  onOpenGallery: () => void;
  userStats: UserStats | null;
  onUpgrade: () => void;
  onLogout: () => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  audio,
  onOpenLibrary,
  onQuickUpload,
  onUploadAudio,
  onRemoveAudio,
  audioVolume,
  setAudioVolume,
  onImportReference,
  onOpenGallery,
  userStats,
  onUpgrade,
  onLogout,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState('');

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsImporting(true);
      try {
        await onImportReference(e.target.files[0]);
      } catch (error) {
        console.error(error);
      }
      setIsImporting(false);
      e.target.value = ''; 
    }
  };

  const handleUrlImport = async () => {
    if (!referenceUrl.trim()) return;
    
    setIsImporting(true);
    try {
      // Call API route to scrape the video
      const response = await fetch('/api/scrape-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: referenceUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scrape video');
      }

      const data = await response.json();
      
      if (!data.downloadUrl) {
        throw new Error('No download URL found');
      }

      // Download the video
      const videoResponse = await fetch(data.downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!videoResponse.ok) {
        throw new Error('Failed to download video');
      }

      const blob = await videoResponse.blob();
      
      // Convert blob to File
      const filename = `reference_${Date.now()}.mp4`;
      const file = new File([blob], filename, { type: blob.type || 'video/mp4' });

      // Import the reference
      await onImportReference(file);
      
      // Clear the URL input
      setReferenceUrl('');
    } catch (error) {
      console.error('Error importing from URL:', error);
      alert(error instanceof Error ? error.message : 'Failed to import video from URL');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="w-80 bg-[#0f172a] border-r border-slate-800 flex flex-col h-full overflow-hidden shrink-0 z-20">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <FileVideo className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            TokCut
          </h1>
          {userStats?.isPremium && (
            <span className="px-1.5 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[10px] font-bold rounded ml-2 flex items-center gap-1">
              <Crown className="w-3 h-3 fill-current" /> PRO
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 font-medium">CLOUD RENDER MODE</p>
        
        {userStats && (
          <div className="mt-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
               <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                 <Zap className="w-3 h-3 text-yellow-400" /> Cloud Credits
               </span>
               <span className="text-xs text-white font-mono">
                 {userStats.isPremium ? '∞' : `${userStats.creditsUsed}/${userStats.creditsLimit}`}
               </span>
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
               <div 
                 className={`h-full rounded-full transition-all ${userStats.isPremium ? 'bg-gradient-to-r from-yellow-400 to-orange-500 w-full' : 'bg-blue-500'}`}
                 style={{ width: userStats.isPremium ? '100%' : `${Math.min((userStats.creditsUsed / userStats.creditsLimit) * 100, 100)}%` }}
               />
            </div>
            {!userStats.isPremium && (
              <button 
                onClick={onUpgrade}
                className="w-full mt-3 py-1.5 text-xs font-bold text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <Crown className="w-3 h-3" /> Upgrade to PRO
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Templates */}
        <div className="space-y-3">
           <button 
             onClick={onOpenGallery}
             className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
           >
              <LayoutGrid className="w-5 h-5" />
              <span className="font-bold text-sm">Browse Viral Templates</span>
           </button>
        </div>

        {/* Media Library Action */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Library className="w-4 h-4" /> Assets
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
             {/* Direct Upload Button */}
             <label className="flex flex-col items-center justify-center p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg shadow-blue-900/20 group">
                <Upload className="w-6 h-6 mb-2 group-hover:animate-bounce" />
                <span className="text-xs font-bold">Upload Clips</span>
                <input type="file" multiple accept="video/*" className="hidden" onChange={onQuickUpload} />
             </label>

             {/* Open Library Button */}
             <button 
               onClick={onOpenLibrary}
               className="flex flex-col items-center justify-center p-4 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 rounded-xl transition-all"
             >
                <Library className="w-6 h-6 mb-2" />
                <span className="text-xs font-bold">Library</span>
             </button>
          </div>
        </div>

        {/* Reference Upload */}
        <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 space-y-3">
             <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-purple-200">AI REFERENCE COPY</h3>
             </div>
             <p className="text-[10px] text-slate-500 leading-tight">
               Upload a video or paste a URL (TikTok, Instagram, YouTube) to copy its cuts and text pacing automatically.
             </p>
             
             <label className={`w-full py-3 border border-dashed border-slate-700 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all ${isImporting ? 'bg-purple-500/10 cursor-wait' : 'hover:bg-slate-800 hover:border-purple-500/50'}`}>
               {isImporting ? (
                 <>
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-xs font-bold text-purple-300">Analyzing...</span>
                 </>
               ) : (
                 <>
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">Upload Reference</span>
                 </>
               )}
               <input type="file" accept="video/*" className="hidden" onChange={handleReferenceUpload} disabled={isImporting} />
             </label>

             <div className="flex items-center gap-2">
               <div className="flex-1 relative">
                 <Link className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                 <input
                   type="text"
                   value={referenceUrl}
                   onChange={(e) => setReferenceUrl(e.target.value)}
                   placeholder="Paste TikTok/Instagram/YouTube URL"
                   disabled={isImporting}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && !isImporting) {
                       handleUrlImport();
                     }
                   }}
                   className="w-full pl-7 pr-2 py-2 text-xs bg-slate-900/50 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 disabled:opacity-50 disabled:cursor-wait"
                 />
               </div>
               <button
                 onClick={handleUrlImport}
                 disabled={isImporting || !referenceUrl.trim()}
                 className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
               >
                 {isImporting ? (
                   <Loader2 className="w-3 h-3 animate-spin" />
                 ) : (
                   <Link className="w-3 h-3" />
                 )}
                 Import
               </button>
             </div>
        </div>

        {/* Audio Track */}
        <div className="pb-4">
           <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Audio Track</h2>
           {!audio ? (
             <label className="flex items-center justify-center w-full h-12 border border-slate-700 rounded-xl bg-slate-800/30 hover:bg-slate-800 cursor-pointer transition-all gap-2 group">
               <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                 <Music className="w-3 h-3" />
               </div>
               <span className="text-xs text-slate-400 group-hover:text-slate-200">Add Audio</span>
               <input type="file" accept="audio/*" className="hidden" onChange={onUploadAudio} />
             </label>
           ) : (
             <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2 overflow-hidden">
                   <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                     <Music className="w-3 h-3" />
                   </div>
                   <div className="min-w-0">
                     <p className="text-xs font-medium text-blue-100 truncate">{audio.name}</p>
                   </div>
                 </div>
                 <button onClick={onRemoveAudio} className="text-blue-300 hover:text-red-400 transition-colors">
                   <Trash2 className="w-3 h-3" />
                 </button>
               </div>
               
               <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-blue-300 uppercase">Vol</span>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={audioVolume} 
                    onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-blue-900/50 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
               </div>
             </div>
           )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
         <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors py-2 rounded hover:bg-red-500/10">
           <LogOut className="w-4 h-4" /> Sign Out
         </button>
      </div>
    </div>
  );
};
