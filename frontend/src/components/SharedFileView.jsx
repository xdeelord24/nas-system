import React, { useEffect, useState } from 'react';
import { Download, File, AlertCircle, FolderOpen, ChevronRight, Home } from 'lucide-react';
import { getShareInfo, getShareDownloadUrl, getShareFolderContents } from '../api';
import { format } from 'date-fns';
import FileGrid from './FileGrid';

const SharedFileView = ({ token }) => {
    const [info, setInfo] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // Folder browsing state
    const [currentPath, setCurrentPath] = useState('');
    const [folderContents, setFolderContents] = useState([]);
    const [loadingContents, setLoadingContents] = useState(false);

    // Apply dark theme by default for public share view
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--bg-app', '#0f172a');
        root.style.setProperty('--bg-sidebar', '#1e293b');
        root.style.setProperty('--bg-card', '#1e293b');
        root.style.setProperty('--bg-card-hover', '#334155');
        root.style.setProperty('--text-primary', '#f8fafc');
        root.style.setProperty('--text-secondary', '#94a3b8');
        root.style.setProperty('--border', '#334155');
        root.style.setProperty('--accent', '#3b82f6');
    }, []);

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const res = await getShareInfo(token);
                setInfo(res.data);
                if (res.data.isDirectory) {
                    await fetchContents('');
                }
            } catch (err) {
                setError(err.response?.data?.error || "Failed to load shared file");
            } finally {
                setLoading(false);
            }
        };
        fetchInfo();
    }, [token]);

    const fetchContents = async (path) => {
        setLoadingContents(true);
        try {
            const res = await getShareFolderContents(token, path);
            setFolderContents(res.data.contents);
            setCurrentPath(path);
        } catch (err) {
            console.error("Failed to load folder contents", err);
        } finally {
            setLoadingContents(false);
        }
    };

    const handleNavigate = (folderName) => {
        const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        fetchContents(newPath);
    };

    const handleBreadcrumbClick = (index) => {
        const parts = currentPath.split('/');
        const newPath = parts.slice(0, index + 1).join('/');
        fetchContents(newPath);
    };

    const handleRootClick = () => {
        fetchContents('');
    };

    const handleDownload = (file) => {
        // If file is passed (from list), download it.
        // If no file passed (main button for single file), use default.
        const path = file?.path !== undefined ? file.path : '';
        window.location.href = getShareDownloadUrl(token, path);
    };

    const breadcrumbs = currentPath ? currentPath.split('/') : [];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400">Loading shared content...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 p-8 rounded-2xl max-w-md w-full text-center border border-slate-700 shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Unavailable</h2>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    // --- FOLDER VIEW ---
    if (info.isDirectory) {
        return (
            <div className="fixed inset-0 w-screen h-screen max-w-none bg-[var(--bg-app)] flex flex-col text-[var(--text-primary)] font-sans z-50 overflow-hidden">
                {/* Header */}
                <div className="bg-[var(--bg-sidebar)] border-b border-[var(--border)] p-4 sticky top-0 z-10 shadow-md">
                    <div className="w-full flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[var(--accent)]/10 rounded-lg">
                                <FolderOpen className="text-[var(--accent)]" size={24} />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-[var(--text-primary)]">{info.name}</h1>
                                <p className="text-xs text-[var(--text-secondary)]">Shared Folder</p>
                            </div>
                        </div>

                        <button
                            onClick={() => window.location.href = getShareDownloadUrl(token, currentPath)}
                            className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg shadow-[var(--accent)]/20 transition-all hover:-translate-y-0.5"
                        >
                            <Download size={16} />
                            {currentPath ? 'Download This Folder' : 'Download All'}
                        </button>
                    </div>
                </div>

                {/* Breadcrumbs */}
                <div className="bg-slate-900/50 border-b border-slate-800 px-4 py-2">
                    <div className="w-full flex items-center gap-2 text-sm text-slate-400 overflow-x-auto px-4">
                        <button onClick={handleRootClick} className="hover:text-white transition-colors p-1 rounded hover:bg-slate-800">
                            <Home size={16} />
                        </button>
                        {breadcrumbs.map((part, index) => (
                            <React.Fragment key={index}>
                                <ChevronRight size={14} className="opacity-30 flex-shrink-0" />
                                <button
                                    onClick={() => handleBreadcrumbClick(index)}
                                    className="hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors whitespace-nowrap"
                                >
                                    {part}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <main className="flex-1 overflow-hidden relative w-full max-w-none mx-0">
                    <div className="w-full max-w-none mx-0 h-full">
                        <FileGrid
                            files={folderContents}
                            onNavigate={handleNavigate}
                            onDownload={handleDownload}
                            isLoading={loadingContents}
                            viewMode="grid" // Allow switch? fixed for now
                            readOnly={true}
                            // Disable unrelated actions
                            onDelete={() => { }}
                            onMove={() => { }}
                            onSelectFile={() => { }}
                            selectedFiles={new Set()}
                        />
                    </div>
                </main>
            </div>
        );
    }

    // --- SINGLE FILE VIEW ---
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-lg">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl text-center">
                    <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
                        <File size={40} className="text-white" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2 break-all">{info.name}</h1>

                    <div className="flex items-center justify-center gap-4 text-sm text-slate-400 mb-8">
                        <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                            {(info.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <span>•</span>
                        <span>{format(new Date(info.created), 'MMM d, yyyy')}</span>
                    </div>

                    <button
                        onClick={() => handleDownload()}
                        className="w-full py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Download size={24} />
                        Download File
                    </button>

                    <p className="mt-6 text-xs text-slate-500">
                        Shared via MyNAS
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SharedFileView;
