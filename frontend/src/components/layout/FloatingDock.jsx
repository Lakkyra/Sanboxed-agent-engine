
import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DockItem = ({ to, icon, label, onClick }) => {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            className={({ isActive }) =>
                `group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${isActive
                    ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white shadow-lg shadow-primary/30 scale-105'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white hover:scale-110'
                }`
            }
        >
            <div className="w-6 h-6">{icon}</div>

            {/* Tooltip (Desktop Only) */}
            <span className="hidden md:block absolute left-14 px-3 py-1.5 bg-surfaceHighlight/90 backdrop-blur-md text-white text-sm font-medium rounded-lg opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50 whitespace-nowrap shadow-xl border border-white/10">
                {label}
            </span>
        </NavLink>
    );
};

export const FloatingDock = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="fixed z-50 bg-glass backdrop-blur-2xl border border-white/10 shadow-2xl transition-all duration-300
            flex items-center gap-4 p-3
            md:flex-col md:left-4 md:top-1/2 md:-translate-y-1/2 md:rounded-full md:w-auto md:h-auto
            flex-row bottom-4 left-1/2 -translate-x-1/2 rounded-2xl w-[90%] max-w-sm justify-between
        ">
            {/* Logo / Home */}
            <div className="mb-0 md:mb-2">
                <Link to="/" className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold text-sm shadow-glow tracking-tighter hover:scale-110 transition-transform">
                    AX
                </Link>
            </div>

            <div className="hidden md:block w-full h-px bg-white/10 my-1" />
            <div className="md:hidden w-px h-8 bg-white/10 mx-1" />

            {/* Chat */}
            <DockItem
                to="/chat"
                label="Chat"
                icon={
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                }
            />

            {/* MCP Servers */}
            <DockItem
                to="/mcp-servers"
                label="MCP Servers"
                icon={
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                }
            />

            {/* Profile */}
            <DockItem
                to="/profile"
                label="Profile"
                icon={
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                }
            />

            <div className="hidden md:block w-full h-px bg-white/10 my-1 mt-auto" />
            <div className="md:hidden w-px h-8 bg-white/10 mx-1 ml-auto" />

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
            >
                <div className="w-6 h-6">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </div>
                {/* Tooltip (Desktop Only) */}
                <span className="hidden md:block absolute left-14 px-3 py-1.5 bg-surfaceHighlight/90 backdrop-blur-md text-white text-sm font-medium rounded-lg opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50 whitespace-nowrap shadow-xl border border-white/10">
                    Logout
                </span>
            </button>
        </nav>
    );
};
