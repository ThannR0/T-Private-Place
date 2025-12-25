import React, { useEffect, useState } from 'react';
import { Card, List, Tag, Button, Typography, Tabs, message, Popconfirm, Empty, Spin } from 'antd';
import { GiftOutlined, DeleteOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
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
            const res = await marketApi.getMyVouchers(); // Cần thêm API này vào MarketAPI.js
            setVouchers(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Xử lý xóa (ẩn) voucher đã dùng
    const handleHideVoucher = async (id) => {
        try {
            await marketApi.hideVoucher(id); // Cần thêm API này
            message.success("Đã xóa khỏi danh sách!");
            fetchMyVouchers();
        } catch (error) {
            message.error("Lỗi xóa");
        }
    };

    const renderVoucherList = (list, isUsedTab) => (
        <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3 }}
            dataSource={list}
            locale={{ emptyText: <Empty description="Không có voucher nào" /> }}
            renderItem={item => (
                <List.Item>
                    <Card
                        hoverable={!isUsedTab}
                        style={{
                            borderRadius: 12,
                            background: isUsedTab ? '#f5f5f5' : 'linear-gradient(135deg, #fff0f6 0%, #fff 100%)',
                            border: isUsedTab ? '1px solid #d9d9d9' : '1px solid #ffadd2',
                            opacity: isUsedTab ? 0.7 : 1
                        }}
                        actions={isUsedTab ? [
                            <Popconfirm title="Xóa khỏi lịch sử?" onConfirm={() => handleHideVoucher(item.id)}>
                                <Button type="text" danger icon={<DeleteOutlined />}>Xóa lịch sử</Button>
                            </Popconfirm>
                        ] : []}
                    >
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                            <div>
                                <Title level={4} style={{color: isUsedTab ? '#999' : '#eb2f96', margin: 0}}>
                                    Giảm {(item.discountPercent * 100).toFixed(0)}%
                                </Title>
                                <Tag color="purple" style={{marginTop: 5, fontSize: 14, padding: '4px 10px'}}>
                                    {item.code}
                                </Tag>
                            </div>
                            <GiftOutlined style={{fontSize: 30, color: isUsedTab ? '#ccc' : '#ffadd2'}} />
                        </div>

                        <div style={{marginTop: 15, fontSize: 12, color: '#666'}}>
                            {isUsedTab ? (
                                <span style={{color: 'red'}}><CheckCircleOutlined /> Đã sử dụng</span>
                            ) : (
                                <span><ClockCircleOutlined /> HSD: {dayjs(item.expiryDate).format('DD/MM/YYYY')}</span>
                            )}
                        </div>
                    </Card>
                </List.Item>
            )}
        />
    );

    const activeVouchers = vouchers.filter(v => !v.isUsed && new Date(v.expiryDate) > new Date());
    const usedVouchers = vouchers.filter(v => v.isUsed);
    const expiredVouchers = vouchers.filter(v => !v.isUsed && new Date(v.expiryDate) <= new Date());

    if (loading) return <div style={{textAlign:'center', padding: 50}}><Spin /></div>;

    return (
        <div style={{ padding: '20px 30px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Title level={3}><GiftOutlined /> Ví Voucher Của Tôi</Title>

            <Card style={{borderRadius: 12}}>
                <Tabs defaultActiveKey="1" items={[
                    {
                        key: '1',
                        label: `Có sẵn (${activeVouchers.length})`,
                        children: renderVoucherList(activeVouchers, false)
                    },
                    {
                        key: '2',
                        label: `Đã dùng (${usedVouchers.length})`,
                        children: renderVoucherList(usedVouchers, true)
                    },
                    {
                        key: '3',
                        label: `Hết hạn (${expiredVouchers.length})`,
                        children: renderVoucherList(expiredVouchers, true)
                    }
                ]} />
            </Card>
        </div>
    );
};

export default MyVouchers;