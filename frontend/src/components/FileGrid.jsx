import React, { useMemo } from 'react';
import { Folder, FileText, Image, Film, Music, Code, File as FileIcon, Download, Trash, FileArchive, CheckCircle, Star, RotateCcw, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const getIcon = (name, isDir, size = 56) => {
    if (isDir) return <Folder className="text-yellow-500 fill-yellow-500/20" size={size} strokeWidth={1.5} />;
    const ext = name.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return <Image className="text-purple-400" size={size} strokeWidth={1.5} />;
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return <Film className="text-red-400" size={size} strokeWidth={1.5} />;
    if (['mp3', 'wav', 'ogg'].includes(ext)) return <Music className="text-pink-400" size={size} strokeWidth={1.5} />;
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java'].includes(ext)) return <Code className="text-green-400" size={size} strokeWidth={1.5} />;
    if (['zip', 'rar', 'tar', '7z'].includes(ext)) return <FileArchive className="text-orange-400" size={size} strokeWidth={1.5} />;

    return <FileText className="text-slate-400" size={size} strokeWidth={1.5} />;
};

// --- GRID ITEM ---
const FileItemGrid = ({ file, isSelected, onSelect, onNavigate, onDownload, onDelete, onMove, activeTab, onStar, onRestore, onShare }) => {
    const handleDragStart = (e) => {
        if (activeTab === 'trash') {
            e.preventDefault(); // No dragging from trash
            return;
        }
        let dragData = [file.path || file.name];
        e.dataTransfer.setData('application/nas-items', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        if (!file.isDirectory || activeTab === 'trash') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('bg-blue-500/20', 'border-blue-500');
    };

    const handleDragLeave = (e) => {
        if (!file.isDirectory || activeTab === 'trash') return;
        e.currentTarget.classList.remove('bg-blue-500/20', 'border-blue-500');
    };

    const handleDrop = (e) => {
        if (!file.isDirectory || activeTab === 'trash') return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('bg-blue-500/20', 'border-blue-500');

        const data = e.dataTransfer.getData('application/nas-items');
        if (data) {
            try {
                const items = JSON.parse(data);
                onMove(items, file.path || file.name);
            } catch (err) {
                console.error("Parse error", err);
            }
        }
    };

    const isTrash = activeTab === 'trash';
    const isStarredTab = activeTab === 'starred';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`group relative p-5 rounded-2xl flex flex-col items-center gap-4 cursor-pointer transition-all border 
                ${isSelected
                    ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/10'
                    : 'bg-[var(--bg-card)] border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-card-hover)] shadow-sm'
                } selection-none`}
            onClick={(e) => onSelect(file, e)}
            draggable={!isTrash}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isTrash) return;
                file.isDirectory ? onNavigate(file.name) : onDownload(file);
            }}
        >
            {/* Selection Checkbox */}
            <div className={`absolute top-3 left-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-500 bg-slate-800/50'}`}>
                    {isSelected && <CheckCircle size={14} className="text-white" />}
                </div>
            </div>

            {/* Actions */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1 transform translate-y-2 group-hover:translate-y-0 z-10">
                {isTrash ? (
                    <button onClick={(e) => { e.stopPropagation(); onRestore(file); }} className="p-2 hover:bg-green-500/10 rounded-lg text-green-400 hover:text-green-300 transition-colors bg-[var(--bg-card)] shadow-lg border border-[var(--border)]" title="Restore">
                        <RotateCcw size={16} />
                    </button>
                ) : (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); onStar(file); }} className={`p-2 hover:bg-yellow-500/10 rounded-lg transition-colors bg-[var(--bg-card)] shadow-lg border border-[var(--border)] ${isStarredTab ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`} title={isStarredTab ? "Unstar" : "Star"}>
                            <Star size={16} fill={isStarredTab ? "currentColor" : "none"} />
                        </button>
                        {!file.isDirectory && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); onShare(file); }} className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-400 hover:text-blue-300 transition-colors bg-[var(--bg-card)] shadow-lg border border-[var(--border)]" title="Share via Link">
                                    <Share2 size={16} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onDownload(file); }} className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-blue-400 hover:text-blue-300 transition-colors bg-[var(--bg-card)] shadow-lg border border-[var(--border)]" title="Download">
                                    <Download size={16} />
                                </button>
                            </>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onDelete(file); }} className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-colors bg-[var(--bg-card)] shadow-lg border border-[var(--border)]" title="Delete">
                            <Trash size={16} />
                        </button>
                    </>
                )}
            </div>

            <div className="w-20 h-20 flex items-center justify-center drop-shadow-2xl pointer-events-none">
                {getIcon(file.name, file.isDirectory)}
            </div>

            <div className="text-center w-full space-y-1 pointer-events-none">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate w-full px-2" title={file.name}>{file.name}</p>
                <div className="flex flex-col items-center gap-0.5">
                    <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        {isTrash && file.trashId ? 'Deleted' : (file.isDirectory ? 'Folder' : format(new Date(file.mtime), 'MMM d, yyyy'))}
                    </p>
                    {!file.isDirectory && <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg-card-hover)] px-2 py-0.5 rounded-full">{(file.size / 1024).toFixed(1)} KB</span>}
                </div>
            </div>
        </motion.div>
    );
};

// --- LIST ITEM ---
const FileItemList = ({ file, isSelected, onSelect, onNavigate, onDownload, onDelete, onMove, activeTab, onStar, onRestore, onShare }) => {
    const handleDragStart = (e) => {
        if (activeTab === 'trash') {
            e.preventDefault();
            return;
        }
        let dragData = [file.path || file.name];
        e.dataTransfer.setData('application/nas-items', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        if (!file.isDirectory || activeTab === 'trash') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('bg-blue-500/10');
    };

    const handleDragLeave = (e) => {
        if (!file.isDirectory || activeTab === 'trash') return;
        e.currentTarget.classList.remove('bg-blue-500/10');
    };

    const handleDrop = (e) => {
        if (!file.isDirectory || activeTab === 'trash') return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('bg-blue-500/10');
        const data = e.dataTransfer.getData('application/nas-items');
        if (data) {
            try {
                const items = JSON.parse(data);
                onMove(items, file.path || file.name);
            } catch (err) { }
        }
    };

    const isTrash = activeTab === 'trash';
    const isStarredTab = activeTab === 'starred';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className={`group flex items-center gap-4 p-3 rounded-xl cursor-pointer border-b transition-colors select-none
                ${isSelected
                    ? 'bg-blue-500/10 border-blue-500/20'
                    : 'hover:bg-[var(--bg-card-hover)] border-[var(--border)]'
                }`}
            onClick={(e) => onSelect(file, e)}
            draggable={!isTrash}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isTrash) return;
                file.isDirectory ? onNavigate(file.name) : onDownload(file);
            }}
        >
            <div className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600 group-hover:border-slate-400'}`}>
                {isSelected && <CheckCircle size={14} className="text-white" />}
            </div>

            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 pointer-events-none">
                {getIcon(file.name, file.isDirectory, 32)}
            </div>

            <div className="flex-1 min-w-0 pointer-events-none">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate" title={file.name}>{file.name}</p>
            </div>

            <div className="hidden sm:block w-32 text-right pointer-events-none">
                <p className="text-xs text-[var(--text-secondary)]">
                    {isTrash && file.trashId ? 'Deleted' : (file.isDirectory ? '-' : format(new Date(file.mtime), 'MMM d, yyyy'))}
                </p>
            </div>

            <div className="hidden sm:block w-24 text-right pointer-events-none">
                {!file.isDirectory && <span className="text-xs text-[var(--text-secondary)]">{(file.size / 1024).toFixed(1)} KB</span>}
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity px-2">
                {isTrash ? (
                    <button onClick={(e) => { e.stopPropagation(); onRestore(file); }} className="p-1.5 hover:bg-[var(--bg-card)] rounded-md text-green-400 hover:text-green-300 transition-colors" title="Restore">
                        <RotateCcw size={16} />
                    </button>
                ) : (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); onStar(file); }} className={`p-1.5 hover:bg-[var(--bg-card)] rounded-md transition-colors ${isStarredTab ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}`} title={isStarredTab ? "Unstar" : "Star"}>
                            <Star size={16} fill={isStarredTab ? "currentColor" : "none"} />
                        </button>
                        {!file.isDirectory && (
                            <button onClick={(e) => { e.stopPropagation(); onShare(file); }} className="p-1.5 hover:bg-[var(--bg-card)] rounded-md text-[var(--text-secondary)] hover:text-blue-400 transition-colors" title="Share via Link">
                                <Share2 size={16} />
                            </button>
                        )}
                        {!file.isDirectory && (
                            <button onClick={(e) => { e.stopPropagation(); onDownload(file); }} className="p-1.5 hover:bg-[var(--bg-card)] rounded-md text-[var(--text-secondary)] hover:text-blue-400 transition-colors" title="Download">
                                <Download size={16} />
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); onDelete(file); }} className="p-1.5 hover:bg-[var(--bg-card)] rounded-md text-[var(--text-secondary)] hover:text-red-400 transition-colors" title="Delete">
                            <Trash size={16} />
                        </button>
                    </>
                )}
            </div>
        </motion.div>
    );
};

const FileGrid = ({
    files, onNavigate, onDownload, onDelete, onMove, isLoading, viewMode, showHidden,
    selectedFiles, onSelectFile, onClearSelection, activeTab, onStar, onRestore, onShare
}) => {
    const filteredFiles = useMemo(() => {
        return (files || []).filter(f => showHidden || !f.name.startsWith('.')).sort((a, b) => {
            if (activeTab === 'recent') {
                return 0; // Already sorted
            }
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
        });
    }, [files, showHidden, activeTab]);

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] gap-6">
                <div className="w-12 h-12 border-4 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin"></div>
                <p className="font-medium animate-pulse">Loading content...</p>
            </div>
        );
    }

    if (filteredFiles.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] gap-6 opacity-60">
                <div className="p-8 bg-[var(--bg-card)]/30 rounded-full">
                    <Folder size={64} strokeWidth={1} />
                </div>
                <div className="text-center">
                    <p className="text-lg font-medium text-[var(--text-secondary)]">
                        {activeTab === 'trash' ? 'Trash is empty' :
                            activeTab === 'starred' ? 'No starred items' :
                                activeTab === 'recent' ? 'No recent files' :
                                    'Empty Directory'}
                    </p>
                    {activeTab === 'files' && <p className="text-sm">Drag and drop files here to upload</p>}
                </div>
            </div>
        );
    }

    // Wrapper to handle clear selection on background click
    const handleBackgroundClick = (e) => {
        if (e.target === e.currentTarget) {
            onClearSelection();
        }
    };

    if (viewMode === 'list') {
        return (
            <div
                className="p-6 overflow-y-auto h-full content-start pb-20 custom-scrollbar"
                onClick={handleBackgroundClick}
            >
                <div className="flex flex-col gap-1">
                    <AnimatePresence>
                        {filteredFiles.map((file) => (
                            <FileItemList
                                key={file.path || file.name}
                                file={file}
                                isSelected={selectedFiles.has(file.path || file.name)}
                                onSelect={onSelectFile}
                                onNavigate={onNavigate}
                                onDownload={onDownload}
                                onDelete={onDelete}
                                onMove={onMove}
                                activeTab={activeTab}
                                onStar={onStar}
                                onRestore={onRestore}
                                onShare={onShare}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    return (
        <div
            className="p-8 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6 overflow-y-auto h-full content-start pb-20 custom-scrollbar"
            onClick={handleBackgroundClick}
        >
            <AnimatePresence>
                {filteredFiles.map((file) => (
                    <FileItemGrid
                        key={file.path || file.name}
                        file={file}
                        isSelected={selectedFiles.has(file.path || file.name)}
                        onSelect={onSelectFile}
                        onNavigate={onNavigate}
                        onDownload={onDownload}
                        onDelete={onDelete}
                        onMove={onMove}
                        activeTab={activeTab}
                        onStar={onStar}
                        onRestore={onRestore}
                        onShare={onShare}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default FileGrid;
