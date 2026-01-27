import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Toaster, toast } from 'sonner';
import { Home, ChevronRight, UploadCloud, FolderPlus, LayoutGrid, List } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FileGrid from './components/FileGrid';
import SettingsModal from './components/SettingsModal';
import FileViewerModal from './components/FileViewerModal';
import { getFiles, createFolder, deleteItem, uploadFiles, downloadFileUrl, moveItems } from './api';

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
    // ... theme logic (same as before)
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
  const fetchFiles = async (path) => {
    setLoading(true);
    setSelectedFiles(new Set()); // Clear selection on navigate
    try {
      const res = await getFiles(path);
      setFiles(res.data.contents);
      setCurrentPath(res.data.path.replace(/\\/g, '/'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles('');
  }, []);

  // Handlers
  const handleNavigate = (folderName) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    fetchFiles(newPath);
  };

  const handleBreadcrumbClick = (index) => {
    const parts = currentPath.split('/');
    const newPath = parts.slice(0, index + 1).join('/');
    fetchFiles(newPath);
  };

  const handleCreateFolder = async () => {
    const name = prompt("Enter folder name:");
    if (!name) return;
    try {
      await createFolder(currentPath, name);
      toast.success('Folder created');
      fetchFiles(currentPath);
    } catch (err) {
      toast.error('Failed to create folder');
    }
  };

  const handleDelete = async (file) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    try {
      const path = currentPath ? `${currentPath}/${file.name}` : file.name;
      await deleteItem(path);
      toast.success('Deleted successfully');
      fetchFiles(currentPath);
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // Selection Logic
  const handleSelectFile = (file, e) => {
    const id = file.path || file.name;
    const newSelection = new Set(selectedFiles);

    if (e.ctrlKey || e.metaKey) {
      // Toggle
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
    } else if (e.shiftKey) {
      // Range select (simplified: add to selection)
      // Implementing full range select requires tracking last clicked index
      newSelection.add(id);
    } else {
      // Single select (unless dragging)
      // If we are just clicking, clear others.
      // But if item is already selected, don't deselect others immediately (handled by background click?)
      // Standard OS behavior: Click on item selects it and deselects others.
      if (!newSelection.has(id)) {
        newSelection.clear();
        newSelection.add(id);
      } else {
        // If clicking an already selected item without modifier, we technically keep it selected
        // but if we are clicking to DRAG, we want to keep selection
        // If we leave it as is, it's fine.
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

    // Construct full destination path relative to storage root
    const destPath = currentPath ? `${currentPath}/${destinationFolder}` : destinationFolder;

    // We need to make sure sources are also fully qualified relative paths
    // In our current setup, IDs are just filenames if in root, or path strings
    // But `FileGrid` dragData sent `file.path || file.name`.
    // If we are in a subfolder, `file.name` is just name. 
    // We should construct full source paths based on currentPath if the IDs are just names.
    // However, our `FileGrid` component sends `file.path` which usually includes structure if recursive,
    // but our `getFiles` returns contents of ONE directory.
    // If the API `getFiles` returns `path` as just filename for contents, we need to prepend currentPath.

    const validSources = sourceIds.map(src => {
      // If src contains slashes, it might be full path?
      // Let's rely on consistency: `currentPath` + src if src has no slashes?
      // Or better: `getFiles` returns `contents`. `FileGrid` uses `file.path` if available.
      // Our backend returning `contents` items only has `name` usually unless we changed it.
      // Let's check server.js... `contents` has `path` relative to STORAGE_ROOT.
      // So `sourceIds` ARE relative to STORAGE_ROOT. Good.
      return src;
    });

    try {
      const res = await moveItems(validSources, destPath);
      if (res.data.success) {
        toast.success(`Moved ${res.data.moved.length} items`);
        fetchFiles(currentPath);
      } else {
        toast.error('Move failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to move items: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleFileAction = (file) => {
    const path = currentPath ? `${currentPath}/${file.name}` : file.name;
    setViewFile({ ...file, path });
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('path', currentPath);
    acceptedFiles.forEach(file => formData.append('files', file));

    try {
      await uploadFiles(formData);
      toast.success('Upload complete');
      fetchFiles(currentPath);
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }, [currentPath]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true
  });

  const breadcrumbs = currentPath ? currentPath.split('/') : [];

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
          {/* ... Left side (Breadcrumbs) same as before ... */}
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <button onClick={() => fetchFiles('')} className="hover:text-[var(--accent)] transition-colors p-1.5 rounded-lg hover:bg-[var(--bg-card-hover)]">
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
          />
        </main>
      </div>
    </div>
  );
}

export default App;
