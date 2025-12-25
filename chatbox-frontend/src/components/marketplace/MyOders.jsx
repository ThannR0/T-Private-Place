import React, { useEffect, useState, useMemo } from 'react';
import { Tabs, Table, Tag, Button, message, Popconfirm, Empty, Card, Statistic, Row, Col, Typography, Spin } from 'antd';
import {
    CheckCircleOutlined, SyncOutlined, ClockCircleOutlined,
    ShopOutlined, ShoppingOutlined, DollarOutlined,
    WalletOutlined, RiseOutlined, FallOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';

import { marketApi } from './MarketAPI';
import { useChat } from '../../context/ChatContext';

const { Title, Text } = Typography;

const MyOrders = () => {
    // State dữ liệu
    const [buyOrders, setBuyOrders] = useState([]);   // Đơn mình mua
    const [sellOrders, setSellOrders] = useState([]); // Đơn mình bán
    const [loading, setLoading] = useState(false);

    // Lấy context
    const { currentUser, notifications } = useChat();
    const navigate = useNavigate();

    // 🟢 1. TỰ ĐỘNG TẢI DỮ LIỆU & LẮNG NGHE SỰ KIỆN
    useEffect(() => {
        if (currentUser) {
            fetchAllData();
        }
    }, [currentUser]);

    // Lắng nghe notification mới để auto-reload (Khi có thông báo đơn hàng -> reload ngay)
    useEffect(() => {
        if (notifications.length > 0) {
            const latest = notifications[0];
            // Nếu thông báo liên quan đến đơn hàng, reload bảng
            if (latest.content && (latest.content.includes("đơn hàng") || latest.content.includes("thanh toán"))) {
                fetchAllData();
            }
        }
    }, [notifications]);


    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await marketApi.getMyOrders(); // API lấy đơn tôi đã mua
            // Sắp xếp đơn mới nhất lên đầu
            setOrders(res.data.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // 🟢 KHÁCH BẤM "ĐÃ NHẬN HÀNG" -> Chuyển trạng thái sang DELIVERED
    const handleReceived = (orderId) => {
        Modal.confirm({
            title: 'Xác nhận đã nhận hàng?',
            content: 'Bạn xác nhận đã nhận được hàng và hài lòng với sản phẩm? Sau bước này Shop sẽ nhận được tiền.',
            okText: 'Đã nhận hàng',
            cancelText: 'Chưa',
            onOk: async () => {
                try {
                    // Gọi API chuyển trạng thái sang DELIVERED
                    await marketApi.updateOrderStatus(orderId, 'DELIVERED');
                    message.success("Đã xác nhận! Đang chờ Shop hoàn tất.");
                    fetchOrders();
                } catch (error) {
                    message.error("Lỗi cập nhật");
                }
            }
        });
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // Gọi song song cả API mua và bán để tính toán tài chính
            const [resBuy, resSell] = await Promise.all([
                marketApi.getMyOrders(), // API lấy đơn mua
                marketApi.getMySales()   // API lấy đơn bán (Từ MyShop chuyển sang đây để vẽ chart)
            ]);

            // Sắp xếp theo ngày mới nhất
            setBuyOrders((resBuy.data || []).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)));
            setSellOrders((resSell.data || []).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)));

        } catch (error) {
            console.error("Lỗi đồng bộ dữ liệu:", error);
            // message.error("Không thể tải dữ liệu đơn hàng"); // Có thể ẩn để đỡ spam
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await marketApi.updateOrderStatus(id, status);
            message.success("Cập nhật trạng thái thành công!");
            fetchAllData(); // Reload lại ngay
        } catch (error) {
            message.error("Lỗi cập nhật: " + (error.response?.data || "Unknown"));
        }
    };

    // 🟢 2. TÍNH TOÁN THỐNG KÊ CHO BIỂU ĐỒ & CARD
    const stats = useMemo(() => {
        const totalSpent = buyOrders
            .filter(o => o.status !== 'CANCELLED')
            .reduce((acc, cur) => acc + cur.finalAmount, 0);

        const totalRevenue = sellOrders
            .filter(o => o.status === 'COMPLETED') // Chỉ tính tiền khi đơn hoàn tất
            .reduce((acc, cur) => acc + cur.finalAmount, 0);

        const pendingOrders = buyOrders.filter(o => ['PREPARING', 'SHIPPED'].includes(o.status)).length;
        const pendingSales = sellOrders.filter(o => ['PREPARING'].includes(o.status)).length;

        return { totalSpent, totalRevenue, pendingOrders, pendingSales };
    }, [buyOrders, sellOrders]);

    // 🟢 3. CHUẨN BỊ DỮ LIỆU BIỂU ĐỒ (Group theo ngày)
    const chartData = useMemo(() => {
        const map = {};

        // Hợp nhất cả mua và bán vào timeline
        [...buyOrders, ...sellOrders].forEach(order => {
            const date = dayjs(order.orderDate).format('DD/MM');
            if (!map[date]) map[date] = { date, spent: 0, income: 0 };

            const isMyBuy = order.buyer?.username === currentUser;
            const isCompleted = order.status === 'COMPLETED'; // Thu nhập chỉ tính khi completed
            const isValidBuy = order.status !== 'CANCELLED';

            if (isMyBuy && isValidBuy) {
                map[date].spent += order.finalAmount;
            } else if (!isMyBuy && isCompleted) {
                map[date].income += order.finalAmount;
            }
        });

        // Chuyển object thành array và sort theo ngày (lấy 7 ngày gần nhất)
        return Object.values(map)
            .sort((a, b) => dayjs(a.date, 'DD/MM').diff(dayjs(b.date, 'DD/MM')))
            .slice(-7);
    }, [buyOrders, sellOrders, currentUser]);

    // --- CẤU HÌNH CỘT BẢNG ---
    const getColumns = (type) => [
        {
            title: 'Mã đơn',
            dataIndex: 'orderCode',
            render: t => <Tag color="geekblue">{t}</Tag>
        },
        {
            title: 'Sản phẩm',
            render: (_, record) => (
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{fontWeight: 600}}>{record.items?.[0]?.product?.name || "Sản phẩm"}</span>
                    <span style={{fontSize: 12, color: '#888'}}>
                        {type === 'BUY'
                            ? `Người bán: ${record.seller?.username}`
                            : `Người mua: ${record.buyer?.username}`}
                    </span>
                </div>
            )
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'finalAmount',
            render: (val) => (
                <span style={{
                    color: type === 'BUY' ? '#ff4d4f' : '#52c41a',
                    fontWeight: 'bold', fontFamily: 'monospace', fontSize: 15
                }}>
                    {type === 'BUY' ? '-' : '+'}{val?.toLocaleString()} T
                </span>
            )
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: status => {
                let color = 'default';
                let text = status;
                if (status === 'COMPLETED') { color = '#52c41a'; text = 'Hoàn tất'; }
                if (status === 'PREPARING') { color = '#faad14'; text = 'Chờ gửi'; }
                if (status === 'SHIPPED') { color = '#1890ff'; text = 'Đang giao'; }
                if (status === 'DELIVERED') { color = '#13c2c2'; text = 'Đã nhận'; }
                if (status === 'CANCELLED') { color = '#ff4d4f'; text = 'Đã hủy'; }
                return <Tag color={color} style={{fontWeight: 600}}>{text}</Tag>;
            }
        },
        {
            title: 'Hành động',
            render: (_, record) => {
                const status = record.status;
                return (
                    <div style={{ display: 'flex', gap: 5 }}>
                        {/* Logic cho NGƯỜI BÁN (Giữ nguyên) */}
                        {type === 'SELL' && status === 'PREPARING' && (
                            <Button size="small" type="primary" onClick={() => handleUpdateStatus(record.id, 'SHIPPED')}>
                                Gửi hàng
                            </Button>
                        )}

                        {/* --- 🟢 SỬA ĐOẠN NÀY CHO NGƯỜI MUA --- */}

                        {/* 1. Nếu đang giao (SHIPPED) -> Hiện nút Đã nhận hàng */}
                        {type === 'BUY' && status === 'SHIPPED' && (
                            <Popconfirm title="Bạn đã nhận được hàng và kiểm tra kỹ chưa?" onConfirm={() => handleUpdateStatus(record.id, 'DELIVERED')}>
                                <Button size="small" type="primary" style={{background: '#13c2c2', borderColor: '#13c2c2'}}>
                                    Đã nhận hàng
                                </Button>
                            </Popconfirm>
                        )}

                        {/* 2. Nếu đã hoàn tất (COMPLETED) -> Hiện nút Đánh giá */}
                        {type === 'BUY' && status === 'COMPLETED' && (
                            <Button size="small" onClick={() => navigate(`/market/product/${record.items[0]?.product?.id}`)}>
                                Đánh giá
                            </Button>
                        )}

                        {/* 3. Hủy đơn (Giữ nguyên) */}
                        {type === 'BUY' && status === 'PREPARING' && (
                            <Popconfirm title="Hủy đơn này?" onConfirm={() => handleUpdateStatus(record.id, 'CANCELLED')}>
                                <Button size="small" danger>Hủy</Button>
                            </Popconfirm>
                        )}
                    </div>
                );
            }
        }
    ];

    if (!currentUser) return (
        <Empty description="Vui lòng đăng nhập" style={{marginTop: 50}}>
            <Button type="primary" onClick={() => navigate('/login')}>Đăng nhập</Button>
        </Empty>
    );

    return (
        <div style={{ padding: '20px 30px', background: '#f0f2f5', minHeight: '100vh' }}>

            {/* 1. HEADER & REFRESH */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                <div>
                    <Title level={3} style={{margin: 0}}>💰 Quản Lý Tài Chính & Đơn Hàng</Title>
                    <Text type="secondary">Theo dõi dòng tiền mua sắm và kinh doanh của bạn</Text>
                </div>
                <Button icon={<SyncOutlined spin={loading} />} onClick={fetchAllData}>Cập nhật</Button>
            </div>

            {/* 2. THẺ THỐNG KÊ (Gradient Colors) */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ background: 'linear-gradient(135deg, #ff9c6e 0%, #ff7875 100%)', borderRadius: 16 }}>
                        <Statistic
                            title={<span style={{color: '#fff', opacity: 0.9}}>Tổng chi tiêu (Mua sắm)</span>}
                            value={stats.totalSpent}
                            prefix={<ShoppingOutlined />}
                            suffix="Than"
                            valueStyle={{color: '#fff', fontWeight: 'bold'}}
                        />
                        <div style={{color: '#fff', marginTop: 10, fontSize: 12}}>
                            {stats.pendingOrders} đơn đang chờ xử lý
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ background: 'linear-gradient(135deg, #95de64 0%, #52c41a 100%)', borderRadius: 16 }}>
                        <Statistic
                            title={<span style={{color: '#fff', opacity: 0.9}}>Tổng doanh thu (Bán hàng)</span>}
                            value={stats.totalRevenue}
                            prefix={<DollarOutlined />}
                            suffix="Than"
                            valueStyle={{color: '#fff', fontWeight: 'bold'}}
                        />
                        <div style={{color: '#fff', marginTop: 10, fontSize: 12}}>
                            {stats.pendingSales} đơn cần gửi hàng gấp
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card bordered={false} style={{ background: 'linear-gradient(135deg, #85a5ff 0%, #2f54eb 100%)', borderRadius: 16 }}>
                        <Statistic
                            title={<span style={{color: '#fff', opacity: 0.9}}>Lợi nhuận ròng</span>}
                            value={stats.totalRevenue - stats.totalSpent}
                            prefix={<WalletOutlined />}
                            suffix="Than"
                            valueStyle={{color: '#fff', fontWeight: 'bold'}}
                        />
                        <div style={{color: '#fff', marginTop: 10, fontSize: 12}}>
                            Dựa trên dòng tiền thực tế
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 3. BIỂU ĐỒ (CHART) */}
            <Card title="📊 Biểu đồ dòng tiền (7 ngày gần nhất)" style={{borderRadius: 12, marginBottom: 24}} bodyStyle={{padding: '20px 0 0 0'}}>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff4d4f" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#ff4d4f" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#52c41a" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" />
                            <YAxis />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <ChartTooltip />
                            <Area type="monotone" dataKey="spent" name="Chi tiêu" stroke="#ff4d4f" fillOpacity={1} fill="url(#colorSpent)" />
                            <Area type="monotone" dataKey="income" name="Doanh thu" stroke="#52c41a" fillOpacity={1} fill="url(#colorIncome)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* 4. BẢNG DỮ LIỆU */}
            <Card style={{borderRadius: 12}}>
                <Tabs defaultActiveKey="1" items={[
                    {
                        key: '1',
                        label: <span><ShoppingOutlined /> Đơn Mua Hàng ({buyOrders.length})</span>,
                        children: <Table dataSource={buyOrders} columns={getColumns('BUY')} rowKey="id" loading={loading} pagination={{pageSize: 5}} />
                    },
                    {
                        key: '2',
                        label: <span><ShopOutlined /> Đơn Bán Hàng ({sellOrders.length})</span>,
                        children: <Table dataSource={sellOrders} columns={getColumns('SELL')} rowKey="id" loading={loading} pagination={{pageSize: 5}} />
                    }
                ]} />
            </Card>
        </div>
    );
};

export default MyOrders;