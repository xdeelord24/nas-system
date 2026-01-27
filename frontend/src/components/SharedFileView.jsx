import React, { useEffect, useState } from 'react';
import { Download, File, AlertCircle } from 'lucide-react';
import { getShareInfo, getShareDownloadUrl } from '../api';
import { format } from 'date-fns';

const SharedFileView = ({ token }) => {
    const [info, setInfo] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const res = await getShareInfo(token);
                setInfo(res.data);
            } catch (err) {
                setError(err.response?.data?.error || "Failed to load shared file");
            } finally {
                setLoading(false);
            }
        };
        fetchInfo();
    }, [token]);

    const handleDownload = () => {
        // Trigger download
        window.location.href = getShareDownloadUrl(token);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400">Loading shared file...</p>
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
                        onClick={handleDownload}
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
