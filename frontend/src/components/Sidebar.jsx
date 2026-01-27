import React from 'react';
import { Cloud, HardDrive, Clock, Star, Trash2, Settings } from 'lucide-react';

const Sidebar = ({ onOpenSettings, activeTab, onTabChange }) => {
    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-6 h-full flex-shrink-0 transition-all">
            <div className="flex items-center gap-3 mb-10 text-blue-500">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Cloud size={28} strokeWidth={2.5} />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white">MyNAS</span>
            </div>

            <nav className="flex flex-col gap-2 flex-1">
                <NavItem
                    icon={<HardDrive size={20} />}
                    label="All Files"
                    active={activeTab === 'files'}
                    onClick={() => onTabChange('files')}
                />
                <NavItem
                    icon={<Clock size={20} />}
                    label="Recent"
                    active={activeTab === 'recent'}
                    onClick={() => onTabChange('recent')}
                />
                <NavItem
                    icon={<Star size={20} />}
                    label="Starred"
                    active={activeTab === 'starred'}
                    onClick={() => onTabChange('starred')}
                />
                <NavItem
                    icon={<Trash2 size={20} />}
                    label="Trash"
                    active={activeTab === 'trash'}
                    onClick={() => onTabChange('trash')}
                />
            </nav>

            <div className="pt-6 border-t border-slate-800 mt-auto">
                <div className="mb-2 flex justify-between text-sm text-slate-400">
                    <span>Storage</span>
                    <span>45%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[45%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>
                <button
                    onClick={onOpenSettings}
                    className="mt-6 flex items-center gap-3 text-slate-400 hover:text-white transition-all w-full p-2.5 rounded-xl hover:bg-slate-800/50 group"
                >
                    <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                    <span className="font-medium">Settings</span>
                </button>
            </div>
        </aside>
    );
};

const NavItem = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
    >
        {active && <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />}
        <span className={`relative z-10 ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{icon}</span>
        <span className="relative z-10 font-medium tracking-wide text-sm">{label}</span>
    </button>
);

export default Sidebar;
