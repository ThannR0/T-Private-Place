import React from 'react';
import { Layout, Typography } from 'antd';
import AppLogo from '../common/AppLogo'; // <--- 1. Import Logo
import { useSettings } from "../../context/SettingsContext.jsx";

const { Title, Text } = Typography;
const { t } = useSettings;
const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>

            {/* 1. CỘT TRÁI: BRANDING */}
            <div style={{
                flex: 1,
                // Giữ nguyên màu gradient xanh của bạn rất đẹp
                background: 'linear-gradient(135deg, #1890ff 0%, #0050b3 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff',
                padding: '40px',
                position: 'relative',
                // Lưu ý: Logic ẩn trên mobile này nên dùng CSS media query sẽ tốt hơn,
                // nhưng tạm thời giữ nguyên theo code của bạn.
                display: window.innerWidth < 768 ? 'none' : 'flex'
            }}>
                {/* Họa tiết trang trí */}
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>

                <div style={{ zIndex: 2, textAlign: 'center' }}>

                    {/* --- COACH SỬA: Thay thế thẻ IMG bằng AppLogo --- */}
                    <div style={{ marginBottom: '30px', display:'flex', justifyContent:'center' }}>
                        <AppLogo size={140} variant="white" showText={false} />
                    </div>
                    {/* ----------------------------------------------- */}

                    <Title level={1} style={{ color: '#fff', margin: 0, fontSize: '42px', fontWeight: 'bold' }}>
                        T Private Place
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '18px', marginTop: '15px', display: 'block', maxWidth: '400px' }}>
                        Kết nối nhân sự - Trò chuyện thông minh
                    </Text>
                </div>
            </div>

            {/* 2. CỘT PHẢI: FORM (Giữ nguyên) */}
            <div style={{
                flex: '0 0 500px',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '40px 60px',
                boxShadow: '-5px 0 20px rgba(0,0,0,0.05)',
                width: '100%'
            }}>
                <div style={{ marginBottom: '40px' }}>
                    <Title level={2} style={{ marginBottom: '10px', color: '#333' }}>{title}</Title>
                    <Text type="secondary" style={{ fontSize: '16px' }}>{subtitle}</Text>
                </div>

                {children}

                <div style={{ marginTop: 'auto', textAlign: 'center', color: '#bbb', fontSize: '12px' }}>
                    © 2025 ThanND3. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;