
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ChatPage } from './components/chat/ChatPage';
import RagTestPage from './pages/RagTestPage';
import ParserPage from './pages/ParserPage';
import { MCPServerManager } from './components/mcp/MCPServerManager';
import { ProfilePage } from './pages/ProfilePage';
import { LandingPage } from './components/home/LandingPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { PrivacyPolicyPage, TermsOfServicePage } from './pages/LegalPage';
import { AdminRoute } from './components/auth/AdminRoute';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUserPage } from './pages/AdminUserPage';
import { AdminSessionPage } from './pages/AdminSessionPage';
import './index.css';

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <ChatProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/architecture" element={<ArchitecturePage />} />
                            <Route path="/privacy" element={<PrivacyPolicyPage />} />
                            <Route path="/terms" element={<TermsOfServicePage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/signup" element={<SignupPage />} />
                            <Route
                                path="/chat"
                                element={
                                    <ProtectedRoute>
                                        <ChatPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/chat/:conversationId"
                                element={
                                    <ProtectedRoute>
                                        <ChatPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/mcp-servers"
                                element={
                                    <ProtectedRoute>
                                        <MCPServerManager />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/rag-test"
                                element={
                                    <ProtectedRoute>
                                        <RagTestPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/parser"
                                element={
                                    <ProtectedRoute>
                                        <ParserPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute>
                                        <ProfilePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin"
                                element={
                                    <AdminRoute>
                                        <AdminDashboard />
                                    </AdminRoute>
                                }
                            />
                            <Route
                                path="/admin/users/:userId"
                                element={
                                    <AdminRoute>
                                        <AdminUserPage />
                                    </AdminRoute>
                                }
                            />
                            <Route
                                path="/admin/users/:userId/sessions/:convId"
                                element={
                                    <AdminRoute>
                                        <AdminSessionPage />
                                    </AdminRoute>
                                }
                            />
                        </Routes>
                    </BrowserRouter>
                </ChatProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
