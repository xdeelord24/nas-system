import React, { useState, useEffect } from 'react';
import { X, Download, Maximize2, Minimize2 } from 'lucide-react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';
import { streamFileUrl, downloadFileUrl } from '../api';

const FileViewerModal = ({ file, isOpen, onClose }) => {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (!isOpen || !file) {
            setContent(null);
            setError(null);
            return;
        }

        const loadContent = async () => {
            setLoading(true);
            setError(null);
            const fileUrl = streamFileUrl(file.path || file.name);
            const ext = file.name.split('.').pop().toLowerCase();

            try {
                if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
                    setContent(<img src={fileUrl} alt={file.name} className="max-w-full max-h-full object-contain" />);
                }
                else if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
                    setContent(
                        <video controls className="max-w-full max-h-[80vh]">
                            <source src={fileUrl} />
                            Your browser does not support video playback.
                        </video>
                    );
                }
                else if (['mp3', 'wav', 'ogg'].includes(ext)) {
                    setContent(
                        <div className="flex flex-col items-center justify-center p-12 bg-slate-800 rounded-2xl">
                            <div className="w-32 h-32 bg-slate-700 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                            </div>
                            <audio controls src={fileUrl} className="w-full min-w-[300px]" />
                        </div>
                    );
                }
                else if (['pdf'].includes(ext)) {
                    setContent(
                        <iframe src={fileUrl} className="w-full h-full border-none rounded-lg bg-white" title="PDF Viewer" />
                    );
                }
                else if (['txt', 'md', 'json', 'py', 'js', 'jsx', 'css', 'html', 'log', 'java', 'cpp'].includes(ext)) {
                    const response = await fetch(fileUrl);
                    const text = await response.text();
                    setContent(
                        <pre className="p-4 bg-slate-950 text-slate-200 rounded-lg overflow-auto font-mono text-sm h-full w-full whitespace-pre-wrap">
                            {text}
                        </pre>
                    );
                }
                else if (['docx'].includes(ext)) {
                    const response = await fetch(fileUrl);
                    const arrayBuffer = await response.arrayBuffer();
                    const result = await mammoth.convertToHtml({ arrayBuffer });

                    // Simple styling wrapper for docs
                    const cleanHtml = DOMPurify.sanitize(result.value);
                    setContent(
                        <div
                            className="bg-white text-black p-8 md:p-12 h-full overflow-auto prose prose-slate max-w-none shadow-xl"
                            dangerouslySetInnerHTML={{ __html: cleanHtml }}
                        />
                    );
                }
                else if (['xlsx', 'xls', 'csv'].includes(ext)) {
                    const response = await fetch(fileUrl);
                    const arrayBuffer = await response.arrayBuffer();
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const html = XLSX.utils.sheet_to_html(firstSheet);

                    // Sanitize and style table
                    const cleanHtml = DOMPurify.sanitize(html);
                    setContent(
                        <div
                            className="bg-white text-slate-900 p-4 h-full overflow-auto excel-viewer"
                            dangerouslySetInnerHTML={{ __html: cleanHtml }}
                        />
                    );
                }
                else {
                    setContent(
                        <div className="flex flex-col items-center gap-4 text-slate-400">
                            <p>Preview not available for this file type.</p>
                            <a
                                href={downloadFileUrl(file.path || file.name)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Download size={18} />
                                Download to view
                            </a>
                        </div>
                    );
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load file content.');
            } finally {
                setLoading(false);
            }
        };

        loadContent();
    }, [isOpen, file]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className={`relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${isMaximized ? 'w-full h-full rounded-none' : 'w-[90vw] h-[85vh] max-w-6xl'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur select-none">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                            {/* Using a generic icon or could pass one */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                        </div>
                        <h3 className="font-semibold text-slate-200 truncate pr-4">{file?.name}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={downloadFileUrl(file?.path || file?.name)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Download"
                        >
                            <Download size={20} />
                        </a>
                        <button
                            onClick={() => setIsMaximized(!isMaximized)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden md:block"
                            title={isMaximized ? "Restore" : "Maximize"}
                        >
                            {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors ml-2"
                            title="Close"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative bg-slate-950/50 flex items-center justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="text-slate-400 font-medium">Loading preview...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center p-8">
                            <div className="inline-flex p-4 bg-red-500/10 rounded-full text-red-400 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            </div>
                            <p className="text-slate-300 mb-2">{error}</p>
                            <button onClick={() => window.open(downloadFileUrl(file?.path || file?.name))} className="text-blue-400 hover:underline">Download file instead</button>
                        </div>
                    ) : (
                        <div className="w-full h-full overflow-auto flex items-center justify-center p-1 md:p-4">
                            {content}
                        </div>
                    )}
                </div>
            </div>

            {/* Styles for Excel Tables */}
            <style>{`
                .excel-viewer table { border-collapse: collapse; width: 100%; font-size: 13px; }
                .excel-viewer td, .excel-viewer th { border: 1px solid #cbd5e1; padding: 4px 8px; white-space: nowrap; }
                .excel-viewer tr:first-child td { background-color: #f1f5f9; font-weight: 600; text-align: center; } /* Assuming standard export */
            `}</style>
        </div>
    );
};

export default FileViewerModal;
