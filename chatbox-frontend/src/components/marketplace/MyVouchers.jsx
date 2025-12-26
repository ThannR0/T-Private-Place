import React, { useEffect, useState } from 'react';
import { Card, List, Tag, Button, Typography, Tabs, message, Popconfirm, Empty, Spin, Badge } from 'antd';
import { GiftOutlined, DeleteOutlined, ClockCircleOutlined, CheckCircleOutlined, HISTORY_ICON_KEY, HistoryOutlined } from '@ant-design/icons';
import { marketApi } from './MarketAPI';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const MyVouchers = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyVouchers();
    }, []);

    const fetchMyVouchers = async () => {
        setLoading(true);
        try {
            const res = await marketApi.getMyVouchers();
            setVouchers(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Lỗi lấy voucher:", error);
        } finally {
            setLoading(false);
        }
    };

    // Hàm xóa voucher (Ẩn khỏi danh sách)
    const handleHideVoucher = async (id) => {
        try {
            await marketApi.hideVoucher(id);
            message.success("Đã xóa voucher khỏi danh sách!");
            // Cập nhật lại state ngay lập tức (UI Optimistic Update)
            setVouchers(prev => prev.filter(v => v.id !== id));
        } catch (error) {
            message.error("Lỗi khi xóa voucher");
        }
    };

    // --- LOGIC PHÂN LOẠI ---
    const now = dayjs();

    // 1. Voucher KHẢ DỤNG: Chưa dùng VÀ (Chưa hết hạn HOẶC không có hạn)
    const activeVouchers = vouchers.filter(v => {
        const expDate = v.expirationDate || v.expiryDate;
        const isNotExpired = !expDate || dayjs(expDate).isAfter(now);
        return !v.isUsed && isNotExpired;
    });

    // 2. Voucher LỊCH SỬ: (Đã dùng) HOẶC (Đã hết hạn)
    // Đây là "List rác" mà bạn muốn hiển thị
    const historyVouchers = vouchers.filter(v => {
        const expDate = v.expirationDate || v.expiryDate;
        const isExpired = expDate && dayjs(expDate).isBefore(now);
        return v.isUsed || isExpired;
    });

    // Render từng Item
    const renderVoucherItem = (item, isHistory) => {
        const expDate = item.expirationDate || item.expiryDate;

        // Style khác biệt cho voucher lịch sử (mờ đi)
        const cardStyle = isHistory ? {
            background: '#f5f5f5',
            border: '1px dashed #d9d9d9',
            opacity: 0.8
        } : {
            background: 'linear-gradient(135deg, #fff0f6 0%, #fff 100%)',
            border: '1px solid #ffadd2',
            boxShadow: '0 2px 8px rgba(235, 47, 150, 0.1)'
        };

        const iconColor = isHistory ? '#bfbfbf' : '#eb2f96';
        const titleColor = isHistory ? '#595959' : '#c41d7f';

        return (
            <List.Item>
                <Card
                    hoverable={!isHistory}
                    style={{ borderRadius: 12, ...cardStyle }}
                    // Chỉ hiện nút Xóa ở tab Lịch sử
                    actions={isHistory ? [
                        <Popconfirm
                            title="Xóa voucher này?"
                            description="Bạn sẽ không thấy nó trong danh sách nữa."
                            onConfirm={() => handleHideVoucher(item.id)}
                            okText="Xóa" cancelText="Hủy"
                        >
                            <Button type="text" danger icon={<DeleteOutlined />}>Xóa bỏ</Button>
                        </Popconfirm>
                    ] : []}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <Title level={4} style={{ color: titleColor, margin: 0 }}>
                                {item.discountPercent > 0 ? `Giảm ${(item.discountPercent * 100).toFixed(0)}%` : `${item.discountAmount?.toLocaleString()}đ`}
                            </Title>
                            <Tag color={isHistory ? "default" : "purple"} style={{ marginTop: 5, fontSize: 13 }}>
                                {item.code}
                            </Tag>
                        </div>
                        {isHistory ? <HistoryOutlined style={{ fontSize: 32, color: iconColor }} />
                            : <GiftOutlined style={{ fontSize: 32, color: iconColor }} />}
                    </div>

                    <div style={{ marginTop: 15 }}>
                        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                            {item.description}
                        </Text>

                        <div style={{ fontSize: 12, color: isHistory ? '#8c8c8c' : '#52c41a', display:'flex', alignItems:'center', gap: 5 }}>
                            {item.isUsed ? (
                                <><CheckCircleOutlined /> Đã sử dụng</>
                            ) : expDate && dayjs(expDate).isBefore(now) ? (
                                <><ClockCircleOutlined /> Đã hết hạn</>
                            ) : (
                                <><ClockCircleOutlined /> HSD: {expDate ? dayjs(expDate).format('DD/MM/YYYY') : 'Vĩnh viễn'}</>
                            )}
                        </div>
                    </div>
                </Card>
            </List.Item>
        );
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" tip="Đang tải ví..." /></div>;

    const items = [
        {
            key: 'active',
            label: (
                <span>
                    <GiftOutlined /> Khả dụng <Badge count={activeVouchers.length} showZero color="#eb2f96" style={{marginLeft: 5}}/>
                </span>
            ),
            children: (
                <List
                    grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3 }}
                    dataSource={activeVouchers}
                    renderItem={item => renderVoucherItem(item, false)}
                    locale={{ emptyText: <Empty description="Bạn chưa có voucher nào khả dụng" /> }}
                />
            )
        },
        {
            key: 'history',
            label: (
                <span>
                    <HistoryOutlined /> Lịch sử / Hết hạn
                </span>
            ),
            children: (
                <List
                    grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 3 }}
                    dataSource={historyVouchers}
                    renderItem={item => renderVoucherItem(item, true)}
                    locale={{ emptyText: <Empty description="Lịch sử trống" /> }}
                />
            )
        }
    ];

    return (
        <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
            <div style={{maxWidth: 1000, margin: '0 auto'}}>
                <Title level={2} style={{marginBottom: 20, color: '#1f1f1f'}}>Ví Voucher Của Tôi</Title>
                <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <Tabs defaultActiveKey="active" items={items} type="card" size="large" />
                </Card>
            </div>
        </div>
    );
};

export default MyVouchers;