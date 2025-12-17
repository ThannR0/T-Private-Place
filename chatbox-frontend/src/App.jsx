import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// --- Context ---
import { ChatProvider, useChat } from './context/ChatContext';

// --- Pages ---
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from "./pages/VerifyOtp";
import Chat from './pages/Chat';
import Feed from "./pages/Feed";

import PostDetail from "./pages/PostDetail";
import Profile from "./pages/Profile"; // File Profile bạn đã sửa ở bước trước
import ForgotPassword from "./pages/ForgotPassword.jsx";
// --- Components ---
import AppHeader from './components/layout/AppHeader';
import ResetPassword from "./pages/ResetPassword.jsx";
import ChangePassword from "./pages/ChangePassword.jsx"; // Đảm bảo đường dẫn đúng
import { SettingsProvider } from './context/SettingsContext';
import EventsPage from "./components/events/EventPage.jsx";
import EventDetailPage from "./pages/EventDetailPage.jsx";
import ErrorBoundary from "antd/es/alert/ErrorBoundary.js";
// ==========================================
// 1. Layout Chính (Có Header + Nội dung thay đổi)
// ==========================================
const MainLayout = () => {
    return (

        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header luôn nằm ở đây */}
            <AppHeader />

            {/* Nội dung thay đổi (Chat, Feed, Profile...) sẽ nằm ở Outlet */}
            <div style={{ flex: 1, backgroundColor: '#f0f2f5', padding: '0' }}>
                <Outlet />
            </div>
        </div>

    );
};

// ==========================================
// 2. Component Bảo vệ Route (Chưa Login -> Đá về Login)
// ==========================================
const ProtectedRoute = ({ children }) => {
    const { currentUser } = useChat();
    // Nếu chưa có user thì đá về trang Login, ngược lại thì hiển thị nội dung con
    return currentUser ? children : <Navigate to="/login" replace />;
};

// ==========================================
// 3. App Chính
// ==========================================
function App() {
    return (
        <SettingsProvider>
        <ChatProvider>
            <Router>
                <Routes>
                    {/* --- CÁC ROUTE CÔNG KHAI (Không có Header) --- */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/verify" element={<VerifyOtp />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />

                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* --- CÁC ROUTE NỘI BỘ (Có Header + Cần Login) --- */}
                    {/* Bọc trong ProtectedRoute và MainLayout */}
                    <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>

                        {/* Mặc định vào trang chủ là Feed */}
                        <Route path="/" element={<Navigate to="/feed" replace />} />

                        <Route path="/feed" element={<Feed />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route
                            path="/events"
                            element={
                                <ProtectedRoute>
                                    <ErrorBoundary>
                                    <EventsPage />
                                    </ErrorBoundary>
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/events/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />

                        {/* Chi tiết bài viết */}
                        <Route path="/post/:postId" element={<PostDetail />} />

                        {/* Hồ sơ cá nhân (Của mình) */}
                        <Route path="/profile" element={<Profile />} />

                        {/* Hồ sơ người khác (Xem từ bài viết/comment) */}
                        <Route path="/profile/:targetUsername" element={<Profile />} />
                        <Route path="/change-password" element={<ChangePassword />} />
                    </Route>

                    {/* --- ROUTE 404 (Nếu gõ linh tinh thì về Feed hoặc Login) --- */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </ChatProvider>
        </SettingsProvider>
    );
}

export default App;