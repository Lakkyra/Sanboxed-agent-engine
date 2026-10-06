import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * AdminRoute - wraps a route so only users with is_admin=true can access it.
 * Non-admins are silently redirected to /chat.
 */
export const AdminRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    if (!user.is_admin) return <Navigate to="/chat" replace />;

    return children;
};
