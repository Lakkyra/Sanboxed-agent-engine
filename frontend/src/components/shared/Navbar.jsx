import { useAuth } from '../../context/AuthContext';

export const Navbar = () => {
    const { user, logout } = useAuth();

    return (
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xl">G</span>
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                        Gemini Chat
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <a
                        href="/chat"
                        className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                    >
                        Chat
                    </a>
                    <a
                        href="/mcp-servers"
                        className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                    >
                        MCP Servers
                    </a>
                    <a
                        href="/profile"
                        className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                    >
                        Profile
                    </a>
                </div>

                {user && (
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
};
