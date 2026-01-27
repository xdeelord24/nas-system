import React from 'react';
import { Search, Bell, User } from 'lucide-react';

const Header = () => {
    return (
        <header className="h-20 px-8 flex items-center justify-between border-b border-slate-800 bg-slate-950/50 backdrop-blur-md">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
                <div className="relative w-full group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search files, folders..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder-slate-500"
                    />
                </div>
            </div>

            <div className="flex items-center gap-6">
                <button className="relative text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>
                </button>
                <button className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-900/20">
                        JD
                    </div>
                </button>
            </div>
        </header>
    );
};

export default Header;
