
import React from 'react';
import { FloatingDock } from './FloatingDock';

export const MainLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-background text-white relative overflow-x-hidden selection:bg-primary selection:text-white">
            {/* Animated Background Orbs */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-900/20 rounded-full blur-[120px] animate-float" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-900/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />
            </div>

            {/* Navigation */}
            <FloatingDock />

            {/* Main Content Area */}
            {/* Mobile: padding-bottom for dock. Desktop: padding-left for dock. */}
            <main className="relative z-10 min-h-screen transition-all duration-300
                pb-24 px-4 pt-4
                md:pl-24 md:pr-6 md:py-6 md:pb-6
            ">
                <div className="max-w-7xl mx-auto h-full">
                    {children}
                </div>
            </main>
        </div>
    );
};
