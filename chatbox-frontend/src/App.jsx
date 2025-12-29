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
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword.jsx";
// --- Components ---
import AppHeader from './components/layout/AppHeader';
import ResetPassword from "./pages/ResetPassword.jsx";
import ChangePassword from "./pages/ChangePassword.jsx"; // Đảm bảo đường dẫn đúng
import { SettingsProvider } from './context/SettingsContext';
import EventsPage from "./components/events/EventPage.jsx";
import EventDetailPage from "./pages/EventDetailPage.jsx";
import ErrorBoundary from "antd/es/alert/ErrorBoundary.js";
import SchedulePage from "./pages/SchedulePage.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";
import AdminPaymentPage from "./pages/admin/AdminPaymentPage.jsx";
import AdminLoginPage from "./pages/admin/AdminLoginPage.jsx";
import AdminLayout from "./components/layout/AdminLayout.jsx";
import AdminProtectedRoute from "./components/layout/AdminProtectedRoute.jsx";
import AdminUserPage from "./pages/admin/AdminUserPage.jsx";
import ProductList from "./components/marketplace/ProductList.jsx";
import CreateProduct from "./components/marketplace/CreateProduct.jsx";
import Checkout from "./components/marketplace/Checkout.jsx";
import MyOrders from "./components/marketplace/MyOders.jsx";
import {CartProvider} from "./context/CartContext.jsx";
import AdminMarket from "./components/marketplace/AdminMarket.jsx";
import MarketLayout from "./components/marketplace/MarketLayout.jsx";
import ProductDetail from "./components/marketplace/ProductDetail.jsx";
import {Layout} from "antd";
import MyShop from "./components/marketplace/MyShop.jsx";
import MarketDashboard from "./components/marketplace/MarketDashboard.jsx";
import AdminVoucherManager from "./components/marketplace/AdminVoucherManager.jsx";
import CreateShop from "./components/marketplace/CreateShop.jsx";
import ShopProfile from "./components/marketplace/ShopProfile.jsx";
import OrderDashboard from "./components/marketplace/OrderDashboard.jsx";
import AdminSupportDashboard from "./components/Support/AdminSupportDashhboard.jsx";
import UserSupportPage from "./components/Support/UserSupportPage.jsx";
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
                <CartProvider>
                <Router>
                    <Routes>
                        {/* =================================================== */}
                        {/* 1. PUBLIC ROUTES (Login, Register, Admin Login)     */}
                        {/* =================================================== */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/verify" element={<VerifyOtp />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />

                        {/* Admin Login nằm ngoài tất cả Layout */}
                        <Route path="/admin/login" element={<AdminLoginPage />} />


                        {/* =================================================== */}
                        {/* 2. ADMIN ROUTES (Giao diện RIÊNG BIỆT)             */}
                        {/* =================================================== */}
                        <Route path="/admin" element={
                            <AdminProtectedRoute>
                                <AdminLayout />
                            </AdminProtectedRoute>
                        }>
                            {/* Khi vào /admin -> Tự động vào dashboard */}
                            <Route index element={<Navigate to="dashboard" replace />} />

                            {/* /admin/dashboard */}
                            <Route path="dashboard" element={<AdminPaymentPage />} />
                            <Route path="market" element={<AdminMarket />} />
                            <Route path="users" element={<AdminUserPage />} />
                            <Route path="market-stats" element={<MarketDashboard />} />
                            <Route path="vouchers" element={<AdminVoucherManager />} />
                            <Route path="/admin/support" element={<AdminSupportDashboard />} />

                            {/* Sau này thêm: /admin/users, /admin/settings... */}
                        </Route>


                        {/* =================================================== */}
                        {/* 3. USER ROUTES (Giao diện Chat/Feed bình thường)    */}
                        {/* =================================================== */}
                        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                            <Route path="/" element={<Navigate to="/feed" replace />} />
                            <Route path="/feed" element={<Feed />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/payment" element={<PaymentPage />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/profile/:targetUsername" element={<Profile />} />
                            <Route path="/post/:postId" element={<PostDetail />} />
                            <Route path="/events" element={<ErrorBoundary><EventsPage /></ErrorBoundary>} />
                            <Route path="/events/:id" element={<EventDetailPage />} />
                            <Route path="/schedule" element={<ErrorBoundary><SchedulePage /></ErrorBoundary>} />
                            <Route path="/change-password" element={<ChangePassword />} />
                            <Route path="/market/create" element={<CreateProduct />} />
                            <Route path="/market/cart" element={<Checkout />} />
                            <Route path="/market/orders" element={<MyOrders />} />

                            <Route path="/support" element={<UserSupportPage />} />

                            <Route path="/market" element={
                                        <ProductList />
                            } />
                            <Route path="/market/product/:id" element={<ProductDetail />} />
                            <Route path="/market/myshop" element={<MyShop />} />
                            <Route path="/market/register-shop" element={<CreateShop />} />
                            <Route path="/market/shop/:username" element={<ShopProfile />} />
                            <Route path="/market/finance" element={<OrderDashboard />} />


                        </Route>

                        {/* 404 */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Router>
                </CartProvider>
            </ChatProvider>
        </SettingsProvider>
    );
}

export default App;