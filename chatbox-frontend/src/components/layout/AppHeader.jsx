import React, { useState } from 'react';
import {
    Layout, Typography, Avatar, Dropdown, Space, Badge, Button,
    Popover, List, Tooltip, theme, Card, Divider, Tag, Drawer, Grid
} from 'antd';
import {
    LogoutOutlined, SettingOutlined, DownOutlined,
    ProfileOutlined, MessageOutlined, HomeOutlined, BellOutlined, LockOutlined,
    DeleteOutlined, ClearOutlined, CheckCircleFilled, MinusCircleFilled, StopFilled,
    MenuOutlined, CompassOutlined, ScheduleOutlined,
    ShopOutlined, ShoppingCartOutlined, FileTextOutlined, InfoCircleOutlined, RiseOutlined, CustomerServiceOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import { useCart } from '../../context/CartContext';
import { getAvatarUrl } from "../../utils/common.js";
import AppLogo from "../common/AppLogo.jsx";
import SettingsModal from "../chat/SettingModal.jsx";
import LevelUpModal from "../common/LevelUpModal.jsx";
import CartDrawer from "../marketplace/CartDrawer.jsx";
import VipDetailModal from "../common/VipDetailModal.jsx"

const { Header } = Layout;
const { Text, Title } = Typography;
const { useToken } = theme;
const { useBreakpoint } = Grid;

// --- Component Logo Tiền Ảo (Giữ nguyên) ---
const PremiumCoinIcon = ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#FFA500" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
        <circle cx="50" cy="50" r="45" stroke="url(#goldGradient)" strokeWidth="4" fill="rgba(255, 215, 0, 0.1)" />
        <circle cx="50" cy="50" r="38" fill="url(#goldGradient)" filter="url(#glow)" />
        <path d="M30 35 H70 M50 35 V75" stroke="#8B4513" strokeWidth="8" strokeLinecap="round" />
        <path d="M50 10 L50 20 M50 80 L50 90 M10 50 L20 50 M80 50 L90 50" stroke="#FFF" strokeWidth="2" opacity="0.6"/>
    </svg>
);

// --- Cấu hình VIP (Giữ nguyên) ---
const VIP_LEVELS = [
    { name: 'IRON', min: 0, color: '#595959', bg: '#f0f0f0', icon: '👤', border: '1px solid #d9d9d9' },
    { name: 'BRONZE', min: 500000, color: '#CD7F32', bg: '#FFF5EE', icon: '🥉', border: '2px solid #CD7F32' },
    { name: 'SILVER', min: 5000000, color: '#A9A9A9', bg: '#F5F5F5', icon: '🛡️', border: '2px solid #A9A9A9' },
    { name: 'GOLD', min: 15000000, color: '#DAA520', bg: '#FFF8DC', icon: '👑', border: '2px solid #DAA520' },
    { name: 'PLATINUM', min: 80000000, color: '#2F4F4F', bg: '#F0F8FF', icon: '💠', border: '2px solid #2F4F4F' },
    { name: 'DIAMOND', min: 250000000, color: '#00BFFF', bg: '#E0FFFF', icon: '💎', border: '2px solid #00BFFF' },
    { name: 'TITANIUM', min: 1000000000, color: '#6A5ACD', bg: '#E6E6FA', icon: '⚛️', border: '2px solid #6A5ACD' }
];

const getVipInfo = (amount) => {
    const total = Number(amount) || 0;
    return [...VIP_LEVELS].reverse().find(lvl => total >= lvl.min) || VIP_LEVELS[0];
};

const calculateProgress = (amount) => {
    const total = Number(amount) || 0;
    const currentLevel = getVipInfo(total);
    const currentIndex = VIP_LEVELS.findIndex(l => l.name === currentLevel.name);
    const nextLevel = VIP_LEVELS[currentIndex + 1];
    if (!nextLevel) return 100;
    const progress = ((total - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100;
    return Math.min(Math.max(progress, 0), 100);
};

const AppHeader = () => {
    const navigate = useNavigate();
    const { t } = useSettings();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const location = useLocation();

    // Context Theme & Responsive
    const { token } = useToken();
    const screens = useBreakpoint();
    const isDesktop = screens.md === undefined ? true : screens.md;

    // Context Chat
    const {
        currentUser, currentFullName, currentAvatar, logoutUser, updateUserStatus, myStatus,
        notifications, unreadCount, markNotificationsRead,
        deleteNotification, clearAllNotifications, markOneRead,
        myBalance, myTotalDeposited,
        celebrationData, setCelebrationData
    } = useChat();

    // 🟢 Context Giỏ hàng (Tính tổng số lượng item)
    const { cart } = useCart();
    const cartItemCount = cart ? cart.reduce((acc, item) => acc + item.quantity, 0) : 0;

    const displayName = (currentFullName && currentFullName !== "undefined" && currentFullName !== "null")
        ? currentFullName : currentUser;
    const myAvatarUrl = getAvatarUrl(currentUser, currentFullName, currentAvatar);

    const vipInfo = getVipInfo(myTotalDeposited);
    const progressPercent = calculateProgress(myTotalDeposited);
    const nextLevelIndex = VIP_LEVELS.findIndex(l => l.name === vipInfo.name) + 1;
    const nextLevel = VIP_LEVELS[nextLevelIndex];
    const moneyNeeded = nextLevel ? (nextLevel.min - (myTotalDeposited || 0)) : 0;
    const [vipDetailVisible, setVipDetailVisible] = useState(false);
    const handleLogout = () => { logoutUser(); navigate('/login'); };
    const handleProfile = () => { navigate('/profile'); setDrawerVisible(false); };

    // Style nút điều hướng
    const getBtnStyle = (path) => {
        const isActive = location.pathname === path;
        return {
            background: isActive ? token.colorPrimaryBg : 'transparent',
            color: isActive ? token.colorPrimary : 'var(--text-color)',
            border: isActive ? `1px solid ${token.colorPrimary}` : '1px solid transparent',
            boxShadow: isActive ? `0 4px 12px ${token.colorPrimary}33` : 'none',
            transition: 'all 0.3s', fontSize: '18px', width: 45, height: 45, display: 'flex', alignItems: 'center', justifyContent: 'center'
        };
    };
    const [cartVisible, setCartVisible] = useState(false);

    // --- DROPDOWN MENU PROFILE ---
    const renderProfileMenu = () => (
        <Card
            style={{
                width: 340, borderRadius: 16,
                border: `1px solid var(--border-color)`,
                background: 'var(--card-bg)',
                boxShadow: token.boxShadowSecondary,
                backgroundColor: 'var(--bg-color)'
            }}
            bodyStyle={{padding: '20px'}}
            bordered={false}
        >
            <div style={{display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20}}>
                <div style={{position: 'relative'}}>
                    <Avatar size={64} src={myAvatarUrl} style={{border: vipInfo.border}}/>
                    <div style={{
                        position: 'absolute',
                        bottom: -5,
                        right: -5,
                        background: 'var(--card-bg)',
                        borderRadius: '50%',
                        boxShadow: token.boxShadow,
                        width: 26,
                        height: 26,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16
                    }}>
                        {vipInfo.icon}
                    </div>
                </div>
                <div style={{overflow: 'hidden'}}>
                    <Title level={5} style={{margin: 0, color: 'var(--text-color)', fontWeight: 'bold'}}
                           ellipsis>{displayName}</Title>
                    <Text style={{fontSize: 13, color: 'var(--text-secondary)'}}>@{currentUser}</Text>
                    <div style={{marginTop: 6}}>
                        <Tag color={vipInfo.color} style={{
                            borderRadius: 10,
                            fontSize: 11,
                            border: 'none',
                            background: 'var(--bg-secondary)',
                            fontWeight: 700,
                            color: 'var(--text-color)'
                        }}>
                            {vipInfo.name} MEMBER
                        </Tag>
                    </div>
                </div>
            </div>

            {/* VIP Info Section (Giữ nguyên) */}
            <div
                onClick={() => setVipDetailVisible(true)} // Thêm sự kiện click
                style={{
                    marginBottom: 20,
                    padding: '12px 16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 12,
                    cursor: 'pointer', // Đổi con trỏ thành bàn tay
                    border: '1px solid transparent',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = token.colorPrimary} // Hiệu ứng hover
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    marginBottom: 6
                }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 5}}>
                        <span>{t('totalDeposit')}:</span>
                        <InfoCircleOutlined style={{fontSize: 12, color: token.colorPrimary}}/>
                    </div>
                    <span style={{fontWeight: 700, color: 'var(--text-color)'}}>
                        {myTotalDeposited ? myTotalDeposited.toLocaleString() : 0} đ
                    </span>
                </div>

                {/* Thanh tiến độ */}
                <div style={{
                    width: '100%',
                    height: 8,
                    background: 'var(--bg-color)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    marginBottom: 5
                }}>
                    <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${vipInfo.color}, ${token.colorPrimary})`,
                        borderRadius: 4,
                        transition: 'width 0.5s ease-out'
                    }}></div>
                </div>

                {nextLevel ? (
                    <Text style={{fontSize: 11, color: 'var(--text-secondary)'}}>
                        Nạp thêm <span style={{
                        fontWeight: 'bold',
                        color: token.colorPrimary
                    }}>{moneyNeeded.toLocaleString()} đ</span> để lên <span
                        style={{fontWeight: 'bold', color: nextLevel.color}}>{nextLevel.name}</span>
                    </Text>
                ) : (
                    <Text style={{fontSize: 11, color: token.colorPrimary}}>Max Level!</Text>
                )}
            </div>

            {/* Status (Giữ nguyên) */}
            <div style={{
                background: 'var(--bg-secondary)',
                padding: 5,
                borderRadius: 10,
                display: 'flex',
                gap: 5,
                marginBottom: 15
            }}>
                {[{key: 'ONLINE', icon: <CheckCircleFilled/>, color: '#52c41a', label: t('online')},
                    {key: 'BUSY', icon: <MinusCircleFilled/>, color: '#faad14', label: t('busy')},
                    {key: 'OFFLINE', icon: <StopFilled/>, color: '#bfbfbf', label: t('offline')}].map(s => {
                    const isActive = myStatus === s.key;
                    return (
                        <div key={s.key} onClick={() => updateUserStatus(s.key)}
                             style={{
                                 flex: 1, textAlign: 'center', cursor: 'pointer', padding: '8px 4px', borderRadius: 8,
                                 background: isActive ? 'var(--card-bg)' : 'transparent',
                                 boxShadow: isActive ? token.boxShadow : 'none',
                                 color: isActive ? s.color : 'var(--text-secondary)',
                                 fontWeight: isActive ? 600 : 400,
                                 transition: 'all 0.3s ease',
                                 display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                                 border: isActive ? `1px solid var(--border-color)` : '1px solid transparent'
                             }}>
                            <span style={{fontSize: 16}}>{s.icon}</span><span style={{fontSize: 10}}>{s.label}</span>
                        </div>
                    );
                })}
            </div>

            <Space direction="vertical" style={{width: '100%'}} size={2}>
                <Button type="text" block style={{textAlign: 'left', color: 'var(--text-color)', height: 42}}
                        icon={<ProfileOutlined/>} onClick={handleProfile}>{t('profile')}</Button>

                {/* 🟢 MỤC ĐƠN HÀNG MỚI */}
                <Button type="text" block style={{textAlign: 'left', color: 'var(--text-color)', height: 42}}
                        icon={<FileTextOutlined/>} onClick={() => navigate('/market/orders')}>Quản lý đơn hàng mua/bán</Button>

                <Button type="text" block style={{textAlign: 'left', color: 'var(--text-color)', height: 42}}
                        icon={<RiseOutlined/>} onClick={() => navigate('/market/finance')}>Lịch sử mua/bán hàng</Button>

                <Button type="text" block style={{textAlign: 'left', color: 'var(--text-color)', height: 42}}
                        icon={<LockOutlined/>}
                        onClick={() => navigate('/change-password')}>{t('changePassword')}</Button>

                <Button
                    type="text"
                    block
                    style={{ textAlign: 'left', color: 'var(--text-color)', height: 42 }}
                    icon={<CustomerServiceOutlined />}
                    onClick={() => navigate('/support')}
                >
                    {t('support') || "Hỗ trợ & Báo lỗi"}
                </Button>

                <Button type="text" block style={{textAlign: 'left', color: 'var(--text-color)', height: 42}}
                        icon={<SettingOutlined/>} onClick={() => setIsSettingsOpen(true)}>{t('settings')}</Button>
                <Divider style={{margin: '8px 0', borderColor: 'var(--border-color)'}}/>
                <Button type="primary" danger block icon={<LogoutOutlined/>} onClick={handleLogout}
                        style={{height: 40, borderRadius: 8, fontWeight: 600}}>{t('logout')}</Button>
            </Space>
        </Card>
    );

    // --- POPUP THÔNG BÁO (Giữ nguyên) ---
    const notificationContent = (
        <div style={{
            width: 380,
            maxHeight: 500,
            overflowY: 'auto',
            background: 'var(--card-bg)',
            backgroundColor: 'var(--bg-color)'
        }}>
            <div style={{
                padding: '16px',
                borderBottom: `1px solid var(--border-color)`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Text strong style={{color: 'var(--text-color)', fontSize: 16}}>{t('notifications')}</Text>
                <Space>
                    {unreadCount > 0 && <Button type="link" size="small" onClick={markNotificationsRead}
                                                style={{padding: 0}}>{t('markAllRead')}</Button>}
                    <Button type="text" size="small" danger icon={<ClearOutlined/>} onClick={clearAllNotifications}/>
                </Space>
            </div>
            <List
                dataSource={notifications}
                locale={{
                    emptyText: <div style={{
                        padding: 40,
                        textAlign: 'center',
                        color: 'var(--text-secondary)'
                    }}>{t('noNotifications')}</div>
                }}
                renderItem={item => (
                    <List.Item
                        onClick={() => {
                            if (!item.read) markOneRead(item.id);
                            if (item.relatedPostId) navigate(`/post/${item.relatedPostId}`);
                        }}
                        style={{
                            cursor: 'pointer',
                            background: item.read ? 'transparent' : 'var(--bg-hover)',
                            padding: '16px',
                            borderBottom: `1px solid var(--border-color)`,
                            transition: 'all 0.2s',
                        }}
                        actions={[<Button type="text" size="small" icon={<DeleteOutlined
                            style={{fontSize: 14, color: 'var(--text-secondary)'}}/>} onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(item.id)
                        }}/>]}
                    >
                        <List.Item.Meta
                            avatar={<Badge dot={!item.read} color={token.colorPrimary}><Avatar style={{
                                backgroundColor: item.read ? 'var(--bg-secondary)' : token.colorPrimary,
                                color: item.read ? 'var(--text-secondary)' : '#fff'
                            }} icon={<BellOutlined/>} size="large"/></Badge>}
                            title={<div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                                <Text style={{
                                    fontSize: 14,
                                    fontWeight: item.read ? 400 : 600,
                                    color: 'var(--text-color)'
                                }}>{item.content}</Text></div>}
                            description={<Text style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(item.createdAt).toLocaleString()}</Text>}
                        />
                    </List.Item>
                )}
            />
        </div>
    );

    return (
        <>
            <Header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-color)',
                backdropFilter: 'blur(20px)',
                borderBottom: `1px solid var(--border-color)`, padding: '0 24px', height: '70px',
                position: 'sticky', top: 0, zIndex: 1000, transition: 'background 0.3s, border-color 0.3s'
            }}>
                <div style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10}} onClick={() => navigate('/feed')}>
                    <AppLogo size={45} showText={isDesktop}/>
                </div>

                {isDesktop ? (
                    <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-secondary)', padding: '5px 20px', borderRadius: 30 }}>
                        <Tooltip title={t('home')}><Button shape="circle" icon={<HomeOutlined/>} onClick={() => navigate('/feed')} style={getBtnStyle('/feed')}/></Tooltip>
                        <Tooltip title={t('explore')}><Button shape="circle" icon={<CompassOutlined/>} onClick={() => navigate('/events')} style={getBtnStyle('/events')}/></Tooltip>

                        {/* 🟢 NÚT MARKETPLACE */}
                        <Tooltip title="Chợ"><Button shape="circle" icon={<ShopOutlined/>} onClick={() => navigate('/market')} style={getBtnStyle('/market')}/></Tooltip>

                        <Tooltip title={t('schedule')}><Button shape="circle" icon={<ScheduleOutlined/>} onClick={() => navigate('/schedule')} style={getBtnStyle('/schedule')}/></Tooltip>
                        <Tooltip title={t('messages')}><Button shape="circle" icon={<MessageOutlined/>} onClick={() => navigate('/chat')} style={getBtnStyle('/chat')}/></Tooltip>

                        {/* 🟢 NÚT GIỎ HÀNG */}
                        <Tooltip title="Giỏ hàng">
                            <Badge count={cartItemCount} size="small" offset={[-5, 5]}>
                                <Button shape="circle" icon={<ShoppingCartOutlined/>} onClick={() => setCartVisible(true)} style={getBtnStyle('/market/cart')}/>
                            </Badge>
                            <CartDrawer visible={cartVisible} onClose={() => setCartVisible(false)} />
                        </Tooltip>
                    </div>
                ) : null}

                <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                    <div onClick={() => navigate('/payment')}
                         style={{
                             display: 'flex', alignItems: 'center', cursor: 'pointer',
                             background: 'var(--input-bg)',
                             padding: '6px 12px', borderRadius: 20,
                             border: `1px solid var(--border-color)`, transition: 'transform 0.2s',
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                         onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{ marginRight: isDesktop ? 8 : 0 }}> <PremiumCoinIcon size={28} /> </div>
                        {isDesktop && (
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                                <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600 }}>BALANCE</span>
                                <span style={{ fontWeight: 700, color: 'var(--text-color)', fontSize: 14, fontFamily: 'monospace' }}>
                                     {myBalance ? myBalance.toLocaleString() : '0'} T
                                </span>
                            </div>
                        )}
                    </div>

                    {isDesktop ? (
                        <>
                            <Popover content={notificationContent} trigger="click" placement="bottomRight" overlayInnerStyle={{ padding: 0, borderRadius: 12, overflow: 'hidden', background: 'var(--card-bg)', border: `1px solid var(--border-color)` }}>
                                <Badge count={unreadCount} overflowCount={99} size="small" offset={[-5, 5]}>
                                    <Button shape="circle" icon={<BellOutlined style={{fontSize: 20, color: 'var(--text-color)'}}/>} type="text" />
                                </Badge>
                            </Popover>

                            <Dropdown dropdownRender={renderProfileMenu} trigger={['click']} placement="bottomRight" arrow>
                                <div style={{
                                    cursor: 'pointer', padding: '4px', borderRadius: 30,
                                    border: `1px solid var(--border-color)`,
                                    background: 'var(--bg-secondary)',
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}>
                                    <Badge dot status={myStatus === 'ONLINE' ? 'success' : 'default'} offset={[-2, 28]}>
                                        <Avatar src={myAvatarUrl} size="large" style={{border: vipInfo.border}} />
                                    </Badge>
                                    <DownOutlined style={{fontSize: 10, color: 'var(--text-secondary)', marginRight: 8}}/>
                                </div>
                            </Dropdown>
                        </>
                    ) : (
                        <Button icon={<MenuOutlined />} onClick={() => setDrawerVisible(true)} size="large" type="text" style={{color: 'var(--text-color)'}} />
                    )}
                </div>

                <SettingsModal visible={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}/>
                <Drawer
                    title={<span style={{color: 'var(--text-color)'}}>Menu</span>}
                    placement="right" onClose={() => setDrawerVisible(false)} open={drawerVisible}
                    styles={{ header: { background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }, body: { background: 'var(--bg-color)' } }}
                >
                    {/* Nội dung Drawer Mobile */}
                    <div style={{textAlign: 'center', marginBottom: 20}}>
                        <PremiumCoinIcon size={40} />
                        <Title level={4} style={{marginTop: 10, color: 'var(--text-color)'}}>{myBalance ? myBalance.toLocaleString() : '0'} T</Title>
                        <Button type="primary" block onClick={() => {navigate('/payment'); setDrawerVisible(false)}}>{t('deposit') || 'Nạp ngay'}</Button>
                    </div>

                    {/* 🟢 MENU MOBILE: CẬP NHẬT THÊM MARKETPLACE */}
                    <List>
                        <List.Item onClick={() => {navigate('/feed'); setDrawerVisible(false)}} style={{cursor:'pointer', color:'var(--text-color)'}}>
                            <HomeOutlined style={{marginRight: 10}}/> {t('home')}
                        </List.Item>
                        <List.Item onClick={() => {navigate('/market'); setDrawerVisible(false)}} style={{cursor:'pointer', color:'var(--text-color)'}}>
                            <ShopOutlined style={{marginRight: 10}}/> Chợ (Market)
                        </List.Item>
                        <List.Item onClick={() => {navigate('/market/cart'); setDrawerVisible(false)}} style={{cursor:'pointer', color:'var(--text-color)'}}>
                            <Badge count={cartItemCount} size="small" offset={[10, 0]}><ShoppingCartOutlined style={{marginRight: 10, color:'var(--text-color)'}}/></Badge> Giỏ hàng
                        </List.Item>
                        <List.Item onClick={() => {navigate('/market/orders'); setDrawerVisible(false)}} style={{cursor:'pointer', color:'var(--text-color)'}}>
                            <FileTextOutlined style={{marginRight: 10}}/> Đơn mua / Đơn bán
                        </List.Item>
                        <List.Item onClick={() => {navigate('/chat'); setDrawerVisible(false)}} style={{cursor:'pointer', color:'var(--text-color)'}}>
                            <MessageOutlined style={{marginRight: 10}}/> {t('messages')}
                        </List.Item>
                        <List.Item onClick={() => {navigate('/profile'); setDrawerVisible(false)}} style={{cursor:'pointer', color:'var(--text-color)'}}>
                            <ProfileOutlined style={{marginRight: 10}}/> {t('profile')}
                        </List.Item>
                    </List>
                </Drawer>
            </Header>
            <LevelUpModal
                visible={!!celebrationData}
                onClose={() => setCelebrationData(null)}
                newLevel={celebrationData?.level}

                currentTotalDeposit={myTotalDeposited || 0}
                levelInfo={vipInfo}
            />

            <VipDetailModal
                visible={vipDetailVisible}
                onClose={() => setVipDetailVisible(false)}
                currentTotalDeposit={myTotalDeposited || 0}
                onDepositClick={() => { setVipDetailVisible(false); navigate('/payment'); }}
            />
        </>
    );
};

export default AppHeader;