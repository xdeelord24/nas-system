import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Toaster, toast } from 'sonner';
import { Home, ChevronRight, UploadCloud, FolderPlus, LayoutGrid, List, Trash2, FolderInput, X, Star } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FileGrid from './components/FileGrid';
import SettingsModal from './components/SettingsModal';
import FileViewerModal from './components/FileViewerModal';
import SharedFileView from './components/SharedFileView';
import {
  getFiles, getRecentFiles, getStarredFiles, getTrashFiles,
  createFolder, deleteItem, uploadFiles, downloadFileUrl,
  moveItems, toggleStar, restoreItem, emptyTrash, createShareLink
} from './api';

function App() {
  // ROUTING Logic (Manual)
  const pathname = window.location.pathname;
  if (pathname.startsWith('/s/')) {
    const token = pathname.split('/')[2];
    return <SharedFileView token={token} />;
  }

  // --- Main App Logic (Existing) ---

  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Selection State
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);



  // Viewer State
  const [viewFile, setViewFile] = useState(null);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('files');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('nas-settings');
    return saved ? JSON.parse(saved) : {
      theme: 'blue',
      mode: 'dark',
      viewMode: 'grid',
      showHidden: false
    };
  });

  // Computed Files (Sorting & Filtering moved here for Selection logic)
  const processedFiles = useMemo(() => {
    return (files || []).filter(f => f && f.name && (settings.showHidden || !f.name.startsWith('.'))).sort((a, b) => {
      if (activeTab === 'recent') return 0;
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });
  }, [files, settings.showHidden, activeTab]);

  // Save settings & Apply Theme
  useEffect(() => {
    localStorage.setItem('nas-settings', JSON.stringify(settings));
    const root = document.documentElement;
    // ... theme logic
    if (settings.mode === 'light') {
      root.style.setProperty('--bg-app', '#f8fafc');
      root.style.setProperty('--bg-sidebar', '#ffffff');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--bg-card-hover', '#f1f5f9');
      root.style.setProperty('--text-primary', '#0f172a');
      root.style.setProperty('--text-secondary', '#64748b');
      root.style.setProperty('--border', '#e2e8f0');
      root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.7)');
      root.style.setProperty('--glass-border', 'rgba(0, 0, 0, 0.05)');
    } else {
      root.style.setProperty('--bg-app', '#0f172a');
      root.style.setProperty('--bg-sidebar', '#1e293b');
      root.style.setProperty('--bg-card', '#1e293b');
      root.style.setProperty('--bg-card-hover', '#334155');
      root.style.setProperty('--text-primary', '#f8fafc');
      root.style.setProperty('--text-secondary', '#94a3b8');
      root.style.setProperty('--border', '#334155');
      root.style.setProperty('--glass-bg', 'rgba(30, 41, 59, 0.7)');
      root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.05)');
    }
    const colors = {
      blue: '#3b82f6',
      purple: '#a855f7',
      emerald: '#10b981',
      rose: '#f43f5e',
      orange: '#f97316'
    };
    root.style.setProperty('--accent', colors[settings.theme]);
  }, [settings]);

  // Fetch logic
  const fetchData = async (path = currentPath, tab = activeTab) => {
    setLoading(true);
    setSelectedFiles(new Set()); // Clear selection on navigate
    try {
      let res;
      if (tab === 'files') {
        res = await getFiles(path);
        // Important: Use returned structure
        setFiles(res.data.contents);
        setCurrentPath(res.data.path.replace(/\\/g, '/'));
      } else if (tab === 'recent') {
        res = await getRecentFiles();
        setFiles(res.data.contents);
        setCurrentPath(''); // No path for virtual views
      } else if (tab === 'starred') {
        res = await getStarredFiles();
        setFiles(res.data.contents);
        setCurrentPath('');
      } else if (tab === 'trash') {
        res = await getTrashFiles();
        setFiles(res.data.contents);
        setCurrentPath(''); // No path for virtual views
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'files') {
      fetchData('');
    } else {
      fetchData('', activeTab);
    }
  }, [activeTab]);

  // Handlers
  const handleNavigate = (folderName) => {
    if (activeTab !== 'files') {
      const file = files.find(f => f.name === folderName);
      if (file && file.path) {
        setActiveTab('files');
        // file.path is the relative path of the folder itself
        fetchData(file.path, 'files');
      }
      return;
    }

    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    fetchData(newPath, 'files');
  };

  const handleBreadcrumbClick = (index) => {
    if (activeTab !== 'files') return;
    const parts = currentPath.split('/');
    const newPath = parts.slice(0, index + 1).join('/');
    fetchData(newPath, 'files');
  };

  const handleCreateFolder = async () => {
    if (activeTab !== 'files') {
      toast.error("Can only create folders in 'All Files' view");
      return;
    }
    const name = prompt("Enter folder name:");
    if (!name) return;
    try {
      await createFolder(currentPath, name);
      toast.success('Folder created');
      fetchData(currentPath);
    } catch (err) {
      toast.error('Failed to create folder');
    }
  };

  const handleDelete = async (file) => {
    if (activeTab === 'trash') {
      toast.error("Please use 'Empty Trash' to clear items");
      return;
    }

    if (!confirm(`Move ${file.name} to trash?`)) return;
    try {
      const path = activeTab === 'files'
        ? (currentPath ? `${currentPath}/${file.name}` : file.name)
        : file.path;

      await deleteItem(path);
      toast.success('Moved to trash');
      fetchData(currentPath, activeTab);
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleRestore = async (file) => {
    if (activeTab !== 'trash') return;
    try {
      await restoreItem(file.trashId);
      toast.success('Restored');
      fetchData('', 'trash');
    } catch (err) {
      toast.error('Failed to restore');
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm("Are you sure you want to empty the trash? This cannot be undone.")) return;
    try {
      await emptyTrash();
      toast.success("Trash emptied");
      fetchData('', 'trash');
    } catch (err) {
      toast.error("Failed to empty trash");
    }
  };

  const handleStar = async (file) => {
    const path = file.path || (currentPath ? `${currentPath}/${file.name}` : file.name);
    try {
      const isUnstarring = activeTab === 'starred';
      await toggleStar(path, !isUnstarring);
      toast.success(isUnstarring ? "Removed from Starred" : "Added to Starred");
      fetchData(currentPath, activeTab);
    } catch (err) {
      toast.error("Failed to update star status");
    }
  };

  const handleShare = async (file) => {
    const path = file.path || (currentPath ? `${currentPath}/${file.name}` : file.name);
    try {
      const res = await createShareLink(path);
      if (res.data.success) {
        const link = res.data.link;

        // Try modern clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(link);
            toast.success("Link copied to clipboard!");
            return;
          } catch (err) {
            console.warn("Clipboard API failed, trying fallback...");
          }
        }

        // Fallback for insecure contexts (non-HTTPS)
        try {
          const textArea = document.createElement("textarea");
          textArea.value = link;

          // Ensure it's not visible but part of DOM
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          textArea.style.top = "0";
          document.body.appendChild(textArea);

          textArea.focus();
          textArea.select();

          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);

          if (successful) {
            toast.success("Link copied to clipboard!");
          } else {
            throw new Error("Copy command failed");
          }
        } catch (err) {
          // Final fallback: Show link to user
          toast.message('Share Link Created', {
            description: link,
            duration: 10000, // Show for longer
          });
        }
      }
    } catch (err) {
      console.error("Share error frontend:", err);
      const errMsg = err.response?.data?.error || err.message;
      toast.error("Failed to create share link: " + errMsg);
    }
  };

  // Selection Logic
  const handleSelectFile = (file, e) => {
    const id = file.path || file.name;
    const newSelection = new Set(selectedFiles);

    if (e.shiftKey && lastSelectedId) {
      const lastIndex = processedFiles.findIndex(f => (f.path || f.name) === lastSelectedId);
      const currentIndex = processedFiles.findIndex(f => (f.path || f.name) === id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);

        if (!e.ctrlKey) newSelection.clear();

        for (let i = start; i <= end; i++) {
          const f = processedFiles[i];
          newSelection.add(f.path || f.name);
        }
      } else {
        // Fallback if index not found
        newSelection.add(id);
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (newSelection.has(id)) {
        newSelection.delete(id);
        // Don't update lastSelectedId on deselect to allow subsequent shift operations? 
        // Or updated to null? Standard is messy. Let's keep anchor if possible, or set to null.
      } else {
        newSelection.add(id);
        setLastSelectedId(id);
      }
    } else {
      newSelection.clear();
      newSelection.add(id);
      setLastSelectedId(id);
    }
    setSelectedFiles(newSelection);
  };

  const handleClearSelection = () => {
    setSelectedFiles(new Set());
  };

  // Move Logic
  const handleMove = async (sourceIds, destinationFolder) => {
    const destPath = currentPath ? `${currentPath}/${destinationFolder}` : destinationFolder;

    const validSources = sourceIds.map(src => {
      if (activeTab === 'files' && currentPath && !src.includes('/')) {
        return `${currentPath}/${src}`;
      }
      return src;
    });

    try {
      const res = await moveItems(validSources, destPath);
      if (res.data.success) {
        toast.success(`Moved ${res.data.moved.length} items`);
        fetchData(currentPath, activeTab);
      } else {
        toast.error('Move failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to move items: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleFileAction = (file) => {
    if (activeTab === 'trash') return;

    // For navigation:
    if (file.isDirectory) {
      handleNavigate(file.name);
      return;
    }

    const path = file.path || (currentPath ? `${currentPath}/${file.name}` : file.name);
    setViewFile({ ...file, path });
  };

  const handleDownload = (file) => {
    const path = file.path || (currentPath ? `${currentPath}/${file.name}` : file.name);
    const url = downloadFileUrl(path);
    // Trigger download
    window.location.href = url;
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} items?`)) return;
    const toastId = toast.loading("Deleting items...");
    try {
      const items = Array.from(selectedFiles);
      await Promise.all(items.map(path => deleteItem(path)));
      toast.success("Items moved to trash", { id: toastId });
      setSelectedFiles(new Set());
      fetchData(currentPath, activeTab);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete some items", { id: toastId });
    }
  };

  const handleBulkMove = async () => {
    const dest = prompt("Enter destination folder path (relative to root):", currentPath);
    if (dest === null) return;

    const toastId = toast.loading("Moving items...");
    try {
      const items = Array.from(selectedFiles);
      const res = await moveItems(items, dest);
      if (res.data.success) {
        toast.success(`Moved ${res.data.moved.length} items`, { id: toastId });
        setSelectedFiles(new Set());
        fetchData(currentPath, activeTab);
      } else {
        toast.error("Move failed", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Move failed: " + (err.response?.data?.error || err.message), { id: toastId });
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    if (activeTab !== 'files') {
      toast.error("Upload only allowed in 'All Files'");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('path', currentPath);
    acceptedFiles.forEach(file => {
      // Use file.path (react-dropzone) or webkitRelativePath, removing leading slash
      const relativePath = file.path || file.webkitRelativePath || file.name;
      const uploadName = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
      // Encode path to prevent stripping by browsers/proxies/multer
      formData.append('files', file, encodeURIComponent(uploadName));
    });

    try {
      await uploadFiles(formData);
      toast.success('Upload complete');
      fetchData(currentPath);
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }, [currentPath, activeTab]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true
  });

  const breadcrumbs = activeTab === 'files' && currentPath ? currentPath.split('/') : [];

  return (
    <div className="flex h-screen w-full bg-[var(--bg-app)] text-[var(--text-primary)] font-sans overflow-hidden selection:bg-[var(--accent)] selection:text-white transition-colors duration-300">
      <Toaster position="bottom-right" theme={settings.mode === 'dark' ? 'dark' : 'light'} closeButton richColors />

      <Sidebar
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        updateSettings={setSettings}
      />

      <FileViewerModal
        isOpen={!!viewFile}
        onClose={() => setViewFile(null)}
        file={viewFile}
      />

      <div className="flex-1 flex flex-col min-w-0 relative" {...getRootProps()}>
        <input {...getInputProps()} />

        {isDragActive && (
          <div className="absolute inset-0 bg-[var(--accent)]/10 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-dashed border-[var(--accent)]/50 m-6 rounded-3xl animate-pulse cursor-copy">
            <div className="text-2xl font-bold text-[var(--accent)] flex flex-col items-center gap-6 bg-[var(--bg-sidebar)]/90 p-12 rounded-3xl border border-[var(--accent)]/30 shadow-2xl">
              <UploadCloud size={80} strokeWidth={1.5} />
              <span>Drop files to upload</span>
            </div>
          </div>
        )}

        <Header />

        {/* Toolbar */}
        <div className="h-16 border-b border-[var(--border)] px-8 flex items-center justify-between bg-[var(--bg-app)]/80 backdrop-blur transition-colors duration-300">
          {/* Breadcrumbs / Title */}
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            {activeTab === 'files' ? (
              <>
                <button onClick={() => fetchData('', 'files')} className="hover:text-[var(--accent)] transition-colors p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)]">
                  <Home size={18} />
                </button>
                {breadcrumbs.map((part, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight size={14} className="opacity-30" />
                    <button
                      onClick={() => handleBreadcrumbClick(index)}
                      className="hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] px-2 py-1 rounded-md transition-all font-medium text-[var(--text-primary)]"
                    >
                      {part}
                    </button>
                  </React.Fragment>
                ))}
              </>
            ) : (
              <span className="text-lg font-bold capitalize text-[var(--text-primary)]">{activeTab}</span>
            )}
          </div>

          <div className="flex gap-3">
            {selectedFiles.size > 0 && (
              <div className="flex items-center gap-1 bg-[var(--accent)]/10 px-2 py-1.5 rounded-xl border border-[var(--accent)]/20 animate-in fade-in slide-in-from-top-2 duration-200 mr-2">
                <span className="text-sm font-bold text-[var(--accent)] mr-2 px-2">
                  {selectedFiles.size} <span className="font-normal opacity-80 hidden sm:inline">selected</span>
                </span>

                <div className="h-4 w-[1px] bg-[var(--accent)]/20 mx-1"></div>

                <button onClick={handleBulkMove} className="p-1.5 text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors relative group" title="Move Selected">
                  <FolderInput size={18} />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-[var(--bg-sidebar)] text-[var(--text-primary)] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--border)]">Move</span>
                </button>
                <button onClick={handleBulkDelete} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors relative group" title="Delete Selected">
                  <Trash2 size={18} />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-[var(--bg-sidebar)] text-[var(--text-primary)] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50 border border-[var(--border)]">Delete</span>
                </button>
                <button onClick={handleClearSelection} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors ml-1" title="Clear Selection">
                  <X size={18} />
                </button>
              </div>
            )}

            {/* View Toggle */}
            <div className="flex bg-[var(--bg-card)] rounded-lg p-1 mr-2 border border-[var(--border)]">
              <button
                onClick={() => setSettings(s => ({ ...s, viewMode: 'grid' }))}
                className={`p-1.5 rounded-md transition-all ${settings.viewMode === 'grid' ? 'bg-[var(--bg-card-hover)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setSettings(s => ({ ...s, viewMode: 'list' }))}
                className={`p-1.5 rounded-md transition-all ${settings.viewMode === 'list' ? 'bg-[var(--bg-card-hover)] text-[var(--text-primary)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>

            {activeTab === 'trash' && (
              <button
                onClick={handleEmptyTrash}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all border border-red-500/20 font-medium text-sm"
              >
                <Trash2 size={18} />
                Empty Trash
              </button>
            )}

            {activeTab === 'files' && (
              <>
                <button
                  onClick={handleCreateFolder}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] rounded-lg transition-all border border-[var(--border)] hover:border-[var(--border)] font-medium text-sm"
                >
                  <FolderPlus size={18} />
                  New Folder
                </button>
                <label className={`flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:opacity-90 text-white rounded-lg transition-all shadow-lg shadow-[var(--accent)]/20 hover:shadow-[var(--accent)]/40 cursor-pointer font-medium text-sm ${uploading ? 'opacity-75 cursor-wait' : ''}`}>
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={18} />
                      Upload
                    </>
                  )}
                  <input type="file" multiple onChange={(e) => onDrop(Array.from(e.target.files))} className="hidden" disabled={uploading} />
                </label>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative transition-colors duration-300">
          <FileGrid
            files={processedFiles}
            onNavigate={handleNavigate}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onMove={handleMove}
            selectedFiles={selectedFiles}
            onSelectFile={handleSelectFile}
            onClearSelection={handleClearSelection}
            isLoading={loading}
            viewMode={settings.viewMode}
            showHidden={settings.showHidden}
            activeTab={activeTab}
            onStar={handleStar}
            onRestore={handleRestore}
            onShare={handleShare}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
