import React, { useEffect, useState, useMemo } from 'react';
import { Tabs, Button, message, Popconfirm, Empty, Card, Statistic, Row, Col, Typography, Spin, Image, Space, Divider } from 'antd';
import {
    SyncOutlined, ShopOutlined, ShoppingOutlined,
    DollarOutlined, WalletOutlined, RiseOutlined, CheckCircleOutlined,
    CloseCircleOutlined, CarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';

import { marketApi } from './MarketAPI';

const { Title, Text } = Typography;

// 🟢 ICON ĐỒNG TIỀN (Logo Tiền Vàng)
const PremiumCoinIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700"/>
                <stop offset="100%" stopColor="#FFA500"/>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        <circle cx="50" cy="50" r="45" stroke="url(#goldGradient)" strokeWidth="4" fill="rgba(255, 215, 0, 0.1)"/>
        <circle cx="50" cy="50" r="38" fill="url(#goldGradient)" filter="url(#glow)"/>
        <path d="M30 35 H70 M50 35 V75" stroke="#8B4513" strokeWidth="8" strokeLinecap="round"/>
        <path d="M50 10 L50 20 M50 80 L50 90 M10 50 L20 50 M80 50 L90 50" stroke="#FFF" strokeWidth="2" opacity="0.6"/>
    </svg>
);

const OrderDashboard = () => {
    const [buyOrders, setBuyOrders] = useState([]);
    const [sellOrders, setSellOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // 🟢 1. TỰ ĐỘNG TẢI DỮ LIỆU
    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [resBuy, resSell] = await Promise.all([
                marketApi.getMyOrders(), // API lấy đơn mua
                marketApi.getMySales()   // API lấy đơn bán
            ]);
            // Sort mới nhất lên đầu
            setBuyOrders((Array.isArray(resBuy.data) ? resBuy.data : []).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)));
            setSellOrders((Array.isArray(resSell.data) ? resSell.data : []).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)));
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await marketApi.updateOrderStatus(id, status);
            message.success(status === 'DELIVERED' ? "Đã nhận hàng thành công!" : "Cập nhật thành công!");
            fetchAllData();
        } catch (error) {
            message.error("Lỗi: " + (error.response?.data || "Unknown"));
        }
    };

    // 🟢 2. TÍNH TOÁN DỮ LIỆU BIỂU ĐỒ
    const chartData = useMemo(() => {
        const map = {};
        for(let i=6; i>=0; i--) {
            const d = dayjs().subtract(i, 'day').format('DD/MM');
            map[d] = { date: d, spent: 0, income: 0 };
        }
        [...buyOrders, ...sellOrders].forEach(order => {
            const date = dayjs(order.orderDate).format('DD/MM');
            if (map[date]) {
                if (buyOrders.find(o => o.id === order.id) && order.status !== 'CANCELLED') {
                    map[date].spent += order.finalAmount;
                } else if (sellOrders.find(o => o.id === order.id) && order.status === 'COMPLETED') {
                    map[date].income += order.finalAmount;
                }
            }
        });
        return Object.values(map);
    }, [buyOrders, sellOrders]);

    const stats = useMemo(() => {
        const totalSpent = buyOrders.filter(o => o.status !== 'CANCELLED').reduce((acc, cur) => acc + cur.finalAmount, 0);
        const totalRevenue = sellOrders.filter(o => o.status === 'COMPLETED').reduce((acc, cur) => acc + cur.finalAmount, 0);
        return { totalSpent, totalRevenue };
    }, [buyOrders, sellOrders]);

    // 🟢 3. COMPONENT HIỂN THỊ DANH SÁCH GIỐNG SHOPEE
    const OrderListShopeeStyle = ({ orders, type }) => {
        const renderStatusTag = (status) => {
            switch(status) {
                case 'PREPARING': return <span style={{color: '#fa8c16', textTransform: 'uppercase', fontWeight: 600}}>Chờ xác nhận</span>;
                case 'SHIPPED': return <span style={{color: '#1890ff', textTransform: 'uppercase', fontWeight: 600}}>Đang giao</span>;
                case 'DELIVERED': return <span style={{color: '#13c2c2', textTransform: 'uppercase', fontWeight: 600}}>Đã nhận hàng</span>;
                case 'COMPLETED': return <span style={{color: '#52c41a', textTransform: 'uppercase', fontWeight: 600}}>Hoàn thành</span>;
                case 'CANCELLED': return <span style={{color: '#ff4d4f', textTransform: 'uppercase', fontWeight: 600}}>Đã hủy</span>;
                case 'RETURNED': return <span style={{color: '#eb2f96', textTransform: 'uppercase', fontWeight: 600}}>Đã hoàn tiền</span>;
                default: return <span>{status}</span>;
            }
        };

        if (orders.length === 0) return <Empty description="Chưa có đơn hàng nào" style={{padding: '40px 0'}} />;

        return (
            <div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
                {orders.map(order => (
                    <Card key={order.id} bordered={false} style={{borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}} bodyStyle={{padding: '16px'}}>
                        {/* HEADER */}
                        <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', paddingBottom: 10, marginBottom: 12}}>
                            <Space>
                                <ShopOutlined />
                                <Text strong>{type === 'BUY' ? order.seller?.username : order.buyer?.username}</Text>
                                <Button type="link" size="small" onClick={() => navigate(`/market/shop/${type === 'BUY' ? order.seller?.username : order.buyer?.username}`)}>
                                    {type === 'BUY' ? 'Xem Shop' : 'Xem Khách'}
                                </Button>
                            </Space>
                            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                                <Text type="secondary" style={{fontSize: 12}}>Mã: {order.orderCode}</Text>
                                <div style={{height: 14, width: 1, background: '#ddd'}}></div>
                                {renderStatusTag(order.status)}
                            </div>
                        </div>

                        {/* BODY */}
                        {order.items?.map((item, idx) => (
                            <div key={idx} style={{display: 'flex', gap: 12, marginBottom: 12, cursor: 'pointer'}} onClick={() => navigate(`/market/product/${item.product?.id}`)}>
                                <Image
                                    src={item.product?.images?.[0]}
                                    width={80} height={80}
                                    style={{borderRadius: 4, objectFit: 'cover', border: '1px solid #f0f0f0'}}
                                    preview={false}
                                    fallback="https://via.placeholder.com/80"
                                />
                                <div style={{flex: 1}}>
                                    <Text style={{fontSize: 16}} ellipsis>{item.product?.name}</Text>
                                    <div style={{color: '#888', fontSize: 13, marginTop: 4}}>Phân loại: {item.product?.category || 'Mặc định'}</div>
                                    <div style={{marginTop: 4}}>x{item.quantity}</div>
                                </div>
                                <div style={{textAlign: 'right'}}>
                                    <div style={{color: '#faad14', fontWeight: 500}}>
                                        {item.priceAtPurchase?.toLocaleString()} <PremiumCoinIcon />
                                    </div>
                                </div>
                            </div>
                        ))}

                        <Divider style={{margin: '10px 0'}} />

                        {/* FOOTER */}
                        <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, background: '#fffaf0', padding: '10px', borderRadius: 4}}>
                            <Text>Thành tiền:</Text>
                            <Text style={{fontSize: 20, fontWeight: 'bold', color: '#ff4d4f'}}>
                                {order.finalAmount?.toLocaleString()} <PremiumCoinIcon size={20} />
                            </Text>
                        </div>

                        <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 10}}>
                            <Text type="secondary" style={{fontSize: 12, marginRight: 'auto', alignSelf: 'center'}}>
                                {dayjs(order.orderDate).format('DD/MM/YYYY HH:mm')}
                            </Text>

                            {type === 'BUY' && (
                                <>
                                    {order.status === 'PREPARING' && (
                                        <Popconfirm title="Hủy đơn này?" onConfirm={() => handleUpdateStatus(order.id, 'CANCELLED')}>
                                            <Button danger>Hủy Đơn</Button>
                                        </Popconfirm>
                                    )}
                                    {order.status === 'SHIPPED' && (
                                        <Popconfirm title="Bạn đã nhận được hàng?" onConfirm={() => handleUpdateStatus(order.id, 'DELIVERED')}>
                                            <Button type="primary" style={{background: '#ff4d4f', borderColor: '#ff4d4f'}}>Đã Nhận Được Hàng</Button>
                                        </Popconfirm>
                                    )}
                                    {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
                                        <Button onClick={() => message.info("Chức năng Mua Lại sắp ra mắt")}>Mua Lại</Button>
                                    )}
                                </>
                            )}

                            {type === 'SELL' && (
                                <>
                                    {order.status === 'PREPARING' && (
                                        <Button type="primary" onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}>Gửi Hàng</Button>
                                    )}
                                </>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    const renderTabContent = (orderList, type) => {
        const filter = (statusList) => orderList.filter(o => statusList.includes(o.status));
        const subTabs = [
            { key: 'ALL', label: 'Tất cả', children: <OrderListShopeeStyle orders={orderList} type={type} /> },
            { key: 'WAIT', label: 'Chờ xác nhận', children: <OrderListShopeeStyle orders={filter(['PREPARING'])} type={type} /> },
            { key: 'SHIP', label: 'Đang giao', children: <OrderListShopeeStyle orders={filter(['SHIPPED', 'DELIVERED'])} type={type} /> },
            { key: 'DONE', label: 'Hoàn thành', children: <OrderListShopeeStyle orders={filter(['COMPLETED'])} type={type} /> },
            { key: 'CANCEL', label: 'Đã hủy', children: <OrderListShopeeStyle orders={filter(['CANCELLED', 'RETURNED'])} type={type} /> },
        ];
        return <Tabs items={subTabs} defaultActiveKey="ALL" style={{marginTop: -10}} />;
    };

    if (loading && buyOrders.length === 0) return <div style={{textAlign:'center', padding: 50}}><Spin size="large" /></div>;

    return (
        <div style={{ padding: '20px 30px', background: '#f0f2f5', minHeight: '100vh' }}>
            <div style={{maxWidth: 1000, margin: '0 auto'}}>
                <Title level={3}><WalletOutlined /> Tài Chính & Đơn Hàng</Title>

                {/* THỐNG KÊ & BIỂU ĐỒ */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={8}>
                        <Card bordered={false} style={{ background: 'linear-gradient(135deg, #ff9c6e 0%, #ff7875 100%)', borderRadius: 16 }}>
                            <Statistic title={<span style={{color: '#fff', opacity: 0.9}}>Tổng chi tiêu</span>} value={stats.totalSpent} suffix={<PremiumCoinIcon size={24} />} valueStyle={{color: '#fff', fontWeight: 'bold'}} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card bordered={false} style={{ background: 'linear-gradient(135deg, #95de64 0%, #52c41a 100%)', borderRadius: 16 }}>
                            <Statistic title={<span style={{color: '#fff', opacity: 0.9}}>Tổng doanh thu</span>} value={stats.totalRevenue} suffix={<PremiumCoinIcon size={24} />} valueStyle={{color: '#fff', fontWeight: 'bold'}} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card bordered={false} style={{ background: 'linear-gradient(135deg, #85a5ff 0%, #2f54eb 100%)', borderRadius: 16 }}>
                            <Statistic title={<span style={{color: '#fff', opacity: 0.9}}>Lợi nhuận ròng</span>} value={stats.totalRevenue - stats.totalSpent} suffix={<PremiumCoinIcon size={24} />} valueStyle={{color: '#fff', fontWeight: 'bold'}} />
                        </Card>
                    </Col>
                </Row>

                <Card title="📊 Biểu đồ dòng tiền (7 ngày gần nhất)" style={{borderRadius: 12, marginBottom: 24}} bodyStyle={{padding: '20px 0 0 0'}}>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff4d4f" stopOpacity={0.8}/><stop offset="95%" stopColor="#ff4d4f" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8}/><stop offset="95%" stopColor="#52c41a" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" /><YAxis /><CartesianGrid strokeDasharray="3 3" vertical={false} /><ChartTooltip />
                                <Area type="monotone" dataKey="spent" name="Chi tiêu" stroke="#ff4d4f" fillOpacity={1} fill="url(#colorSpent)" />
                                <Area type="monotone" dataKey="income" name="Doanh thu" stroke="#52c41a" fillOpacity={1} fill="url(#colorIncome)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* DANH SÁCH ĐƠN HÀNG */}
                <Card style={{borderRadius: 12, minHeight: 500}}>
                    <Tabs
                        defaultActiveKey="BUY"
                        type="card"
                        size="large"
                        items={[
                            {
                                key: 'BUY',
                                label: <span><ShoppingOutlined /> Đơn Mua ({buyOrders.length})</span>,
                                children: renderTabContent(buyOrders, 'BUY')
                            },
                            {
                                key: 'SELL',
                                label: <span><ShopOutlined /> Đơn Bán ({sellOrders.length})</span>,
                                children: renderTabContent(sellOrders, 'SELL')
                            }
                        ]}
                    />
                </Card>
            </div>
        </div>
    );
};

export default OrderDashboard;