import React from 'react';
import { X, Monitor, Eye, HardDrive, Palette, Sun, Moon } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose, settings, updateSettings }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[var(--bg-sidebar)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--bg-app)]/50">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Settings</h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Appearance */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[var(--accent)] mb-2">
                            <Palette size={18} />
                            <h3 className="text-sm font-medium uppercase tracking-wider">Appearance</h3>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-[var(--bg-card-hover)]/30 rounded-xl border border-[var(--border)]">
                            <span className="text-[var(--text-secondary)]">Theme Mode</span>
                            <div className="flex bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border)]">
                                <button
                                    onClick={() => updateSettings({ ...settings, mode: 'light' })}
                                    className={`p-1.5 rounded-md transition-all ${settings.mode === 'light' ? 'bg-[var(--bg-card-hover)] text-[var(--accent)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                    title="Light Mode"
                                >
                                    <Sun size={18} />
                                </button>
                                <button
                                    onClick={() => updateSettings({ ...settings, mode: 'dark' })}
                                    className={`p-1.5 rounded-md transition-all ${settings.mode === 'dark' ? 'bg-[var(--bg-card-hover)] text-[var(--accent)] shadow' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                    title="Dark Mode"
                                >
                                    <Moon size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-[var(--bg-card-hover)]/30 rounded-xl border border-[var(--border)]">
                            <span className="text-[var(--text-secondary)]">Accent Color</span>
                            <div className="flex gap-2">
                                {['blue', 'purple', 'emerald', 'rose', 'orange'].map(color => (
                                    <button
                                        key={color}
                                        onClick={() => updateSettings({ ...settings, theme: color })}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${settings.theme === color
                                                ? 'border-[var(--text-primary)] scale-110'
                                                : 'border-transparent hover:scale-110 opacity-70 hover:opacity-100'
                                            }`}
                                        style={{
                                            backgroundColor: color === 'blue' ? '#3b82f6' :
                                                color === 'purple' ? '#a855f7' :
                                                    color === 'emerald' ? '#10b981' :
                                                        color === 'rose' ? '#f43f5e' : '#f97316'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* System */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[var(--accent)] mb-2">
                            <HardDrive size={18} />
                            <h3 className="text-sm font-medium uppercase tracking-wider">System</h3>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-[var(--bg-card-hover)]/30 rounded-xl border border-[var(--border)]">
                            <div className="flex items-center gap-3">
                                <Eye size={18} className="text-[var(--text-secondary)]" />
                                <span className="text-[var(--text-secondary)]">Show Hidden Files</span>
                            </div>
                            <button
                                onClick={() => updateSettings({ ...settings, showHidden: !settings.showHidden })}
                                className={`w-11 h-6 rounded-full relative transition-colors border border-transparent`}
                                style={{ backgroundColor: settings.showHidden ? 'var(--accent)' : 'var(--bg-card-hover)' }}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${settings.showHidden ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-[var(--bg-app)] text-center text-xs text-[var(--text-secondary)] border-t border-[var(--border)]">
                    MyNAS v2.1.0 • Connected
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
