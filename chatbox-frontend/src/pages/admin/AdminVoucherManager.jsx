import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Tag, message, Popconfirm, Input, Space } from 'antd';
import { ReloadOutlined, SyncOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

const AdminVoucherManager = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        fetchVouchers();
    }, []);

    const fetchVouchers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/vouchers/admin/all');
            setVouchers(res.data);
        } catch (error) {
            message.error("Lỗi tải danh sách voucher");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            message.loading({ content: "Đang quét và bù voucher...", key: 'sync' });
            const res = await api.post('/vouchers/admin/sync-missing');
            message.success({ content: res.data, key: 'sync' });
            fetchVouchers(); // Tải lại bảng sau khi sync
        } catch (error) {
            message.error({ content: "Lỗi khi sync", key: 'sync' });
        }
    };



    // Cấu hình bảng
    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            width: 60,
        },
        {
            title: 'Mã Voucher',
            dataIndex: 'code',
            render: (text) => <Tag color="blue">{text}</Tag>,
            filteredValue: [searchText],
            onFilter: (value, record) => {
                return String(record.code).toLowerCase().includes(value.toLowerCase()) ||
                    String(record.owner?.username).toLowerCase().includes(value.toLowerCase());
            }
        },
        {
            title: 'Chủ sở hữu',
            dataIndex: ['owner', 'username'], // Hiển thị username của owner
            render: (text) => text ? <Tag color="geekblue">{text}</Tag> : <Tag color="green">Dùng chung</Tag>
        },
        {
            title: 'Giảm giá',
            render: (_, record) => (
                <span style={{fontWeight:'bold', color: 'red'}}>
                    {record.discountPercent ? `${record.discountPercent * 100}%` : `${record.discountAmount?.toLocaleString()}đ`}
                </span>
            )
        },
        {
            title: 'Trạng thái',
            render: (_, record) => {
                const isExpired = dayjs().isAfter(dayjs(record.expirationDate));
                if (!record.isActive) return <Tag color="red">Đã khóa</Tag>;
                if (isExpired) return <Tag color="orange">Hết hạn</Tag>;
                if (record.usedCount >= record.usageLimit) return <Tag color="default">Đã dùng</Tag>;
                return <Tag color="success">Sẵn sàng</Tag>;
            }
        },
        {
            title: 'Hết hạn',
            dataIndex: 'expirationDate',
            render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
        }
    ];



    return (
        <Card
            title="Quản Lý Voucher Người Dùng"
            extra={
                <Space>
                    <Input
                        placeholder="Tìm theo mã hoặc username..."
                        prefix={<SearchOutlined />}
                        onChange={e => setSearchText(e.target.value)}
                        style={{width: 250}}
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchVouchers}>Làm mới</Button>
                    <Popconfirm
                        title="Bạn có chắc muốn quét lại toàn bộ user?"
                        description="Hệ thống sẽ kiểm tra tổng nạp và phát bù voucher cho những ai đạt mốc mà chưa có."
                        onConfirm={handleSync}
                    >
                        <Button type="primary" icon={<SyncOutlined />}>Phát bù Voucher (Sync)</Button>
                    </Popconfirm>
                </Space>
            }
        >
            <Table
                dataSource={vouchers}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />
        </Card>
    );
};

export default AdminVoucherManager;