import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Toaster, toast } from 'sonner';
import { Home, ChevronRight, UploadCloud, FolderPlus, LayoutGrid, List, Trash2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FileGrid from './components/FileGrid';
import SettingsModal from './components/SettingsModal';
import FileViewerModal from './components/FileViewerModal';
import {
  getFiles, getRecentFiles, getStarredFiles, getTrashFiles,
  createFolder, deleteItem, uploadFiles, downloadFileUrl,
  moveItems, toggleStar, restoreItem, emptyTrash
} from './api';

function App() {
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Selection State
  const [selectedFiles, setSelectedFiles] = useState(new Set());

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
    // When tab changes, reset path if moving to 'files' tab, or use empty path for others
    // Actually, if we switch back to 'files', we might want to remember last path?
    // For now, reset to root if switching to 'files' from others, OR keep currentPath if it makes sense.
    // If switching FROM a virtual tab TO 'files', reset path to logic root?
    // Let's just fetch with current path if 'files', relative to that.

    // Simplification: always fetch root if changing tabs unless its 'files' (which might retain state, but for now reset)
    if (activeTab === 'files') {
      fetchData('');
    } else {
      fetchData('', activeTab);
    }
  }, [activeTab]);

  // Handlers
  const handleNavigate = (folderName) => {
    if (activeTab !== 'files') {
      // If in recent/starred/trash, navigating into a folder should probably switch to 'files' view at that location?
      // OR filtering recent files?
      // Use case: User clicks a folder in "Starred". They expect to see contents.
      // So we should switch to 'files' tab and navigate to that path.
      // But the path in "Starred" items is the full relative path.

      // Let's find the file object to get the full path?
      // The `folderName` passed here is just the name. 
      // We need the full path. FileGrid calls `onNavigate(file.name)`.
      // We should update FileGrid to pass the full item or path if available.

      // For now, if we are in virtual views, we might block navigation or switch context.
      // Better: FileGrid should pass the item. Let's fix FileGrid later. 
      // Assuming we fix FileGrid to pass item or we find it:

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
    // If in trash, we might want "delete forever" or not support it yet (api just has empty trash)
    if (activeTab === 'trash') {
      // Cannot delete individual from trash in this MVP unless we add endpoint
      // We only have emptyTrash.
      // Let's say: "Delete permanently" not implemented per file yet, or use `delete` with special flag?
      // The current `deleteItem` sends to trash.
      // For now, disable delete in trash or implement permanent delete.
      // Backend `delete` moves to trash.

      // Actually, we can add a 'permanent' flag to delete api?
      // For now, let's just allow Empty Trash.
      toast.error("Please use 'Empty Trash' to clear items");
      return;
    }

    if (!confirm(`Move ${file.name} to trash?`)) return;
    try {
      const path = activeTab === 'files'
        ? (currentPath ? `${currentPath}/${file.name}` : file.name)
        : file.path; // In virtual views, file.path is valid relative path

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
    // Toggle star
    // We need to know if it is currently starred. 
    // For now, we can check if we are in 'starred' tab => unstar.
    // If in 'files', we don't know easily without checking list. 
    // Let's assume we pass `onStar` and the UI handles the state or optimistically updates.
    // But `FileGrid` items don't know their starred state unless we pass it.

    // Feature: Star/Unstar
    // Ideally we fetch starred list alongside files to know status.
    // MVP: Click "Star" adds it. If already matched, maybe toggle?
    // Let's pass a `isStarred` boolean from the item if we have it?
    // We don't have it in `getFiles`.

    // Workaround: In `files` view, allow "Starring" blindly (add to star). 
    // In `starred` view, allow "Unstarring".

    const path = file.path || (currentPath ? `${currentPath}/${file.name}` : file.name);

    try {
      // If we are in Starred tab, we are unstarring
      const isUnstarring = activeTab === 'starred';
      await toggleStar(path, !isUnstarring); // Toggle logic is better if we know state
      // For now, force Star if in files (or toggle if we could).
      // Actually backend 'toggle' endpoint was `path, starred` boolean.
      // Let's just assume we want to STAR it if we click star.
      // UI needs to be smart.

      toast.success(isUnstarring ? "Removed from Starred" : "Added to Starred");
      fetchData(currentPath, activeTab);
    } catch (err) {
      toast.error("Failed to update star status");
    }
  };

  // Selection Logic
  const handleSelectFile = (file, e) => {
    const id = file.path || file.name;
    const newSelection = new Set(selectedFiles);

    if (e.ctrlKey || e.metaKey) {
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
    } else if (e.shiftKey) {
      newSelection.add(id);
    } else {
      if (!newSelection.has(id)) {
        newSelection.clear();
        newSelection.add(id);
      } else {
        newSelection.clear();
        newSelection.add(id);
      }
    }
    setSelectedFiles(newSelection);
  };

  const handleClearSelection = () => {
    setSelectedFiles(new Set());
  };

  // Move Logic
  const handleMove = async (sourceIds, destinationFolder) => {
    // sourceIds is Array of IDs (relative paths or names)
    // destinationFolder is the name of the folder we dropped onto (in current directory)

    const destPath = currentPath ? `${currentPath}/${destinationFolder}` : destinationFolder;

    const validSources = sourceIds.map(src => {
      // If we are in virtual view, src should be full path already (as it is the ID)
      // If in files view, it might be just name?
      // In `FileGrid`, we use `file.path || file.name` as ID.
      // `file.path` is reliable relative path.
      // So we should just use that.
      // However, `getFiles` in root returns items where path might be `file.name` only?
      // Let's ensure consistency.

      // Use logic from before but trust IDs if they look like paths?
      // If we in `files` and root, ID is name. path is name.
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
    // If trash, cannot view? Or view read-only?
    // Let's assume view is allowed if file exists.
    if (activeTab === 'trash') return;

    // For navigation:
    if (file.isDirectory) {
      handleNavigate(file.name); // This uses name, but handleNavigate needs to be smart
      return;
    }

    const path = file.path || (currentPath ? `${currentPath}/${file.name}` : file.name);
    setViewFile({ ...file, path });
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
    acceptedFiles.forEach(file => formData.append('files', file));

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
              <span className="flex items-center px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-medium border border-blue-500/20">
                {selectedFiles.size} selected
              </span>
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
            files={files}
            onNavigate={handleNavigate}
            onDownload={handleFileAction}
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
          />
        </main>
      </div>
    </div>
  );
}

export default App;
