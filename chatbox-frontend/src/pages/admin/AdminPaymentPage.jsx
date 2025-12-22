import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Card, Typography, message, Popconfirm, Space, Badge } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, DollarCircleOutlined } from '@ant-design/icons';
import api from '../../services/api'; // Sử dụng instance api gốc để gọi

const { Title } = Typography;

const AdminPaymentPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            // Gọi vào API Admin mới tạo
            const res = await api.get('/admin/transactions');
            setTransactions(res.data);
        } catch (error) {
            message.error("Bạn không có quyền Admin hoặc lỗi kết nối!");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    // Xử lý Duyệt
    const handleApprove = async (code) => {
        try {
            await api.post(`/admin/confirm/${code}`);
            message.success(`Đã duyệt giao dịch ${code}`);
            fetchTransactions(); // Reload lại bảng
        } catch (error) {
            message.error("Lỗi khi duyệt");
        }
    };

    // Xử lý Từ chối
    const handleReject = async (code) => {
        try {
            await api.post(`/admin/reject/${code}`);
            message.success(`Đã hủy giao dịch ${code}`);
            fetchTransactions();
        } catch (error) {
            message.error("Lỗi khi hủy");
        }
    };

    const columns = [
        {
            title: 'Mã Giao Dịch',
            dataIndex: 'transactionCode',
            key: 'code',
            render: text => <Tag color="geekblue">{text}</Tag>
        },
        {
            title: 'Số tiền (VND)',
            dataIndex: 'amountVnd',
            key: 'amount',
            render: val => <b>{val.toLocaleString()} đ</b>
        },
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            key: 'time',
            render: date => new Date(date).toLocaleString('vi-VN')
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: status => {
                if (status === 'SUCCESS') return <Tag color="success">THÀNH CÔNG</Tag>;
                if (status === 'FAILED') return <Tag color="error">ĐÃ HỦY</Tag>;
                return <Badge status="processing" text="CHỜ DUYỆT" />;
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                record.status === 'PENDING' ? (
                    <Space>
                        <Popconfirm title="Xác nhận tiền đã về tài khoản?" onConfirm={() => handleApprove(record.transactionCode)}>
                            <Button type="primary" size="small" icon={<CheckCircleOutlined />} style={{background: '#52c41a'}}>
                                Duyệt
                            </Button>
                        </Popconfirm>
                        <Popconfirm title="Từ chối giao dịch này?" onConfirm={() => handleReject(record.transactionCode)}>
                            <Button type="primary" danger size="small" icon={<CloseCircleOutlined />}>
                                Hủy
                            </Button>
                        </Popconfirm>
                    </Space>
                ) : <span style={{color: '#ccc'}}>Đã xử lý</span>
            )
        }
    ];

    return (
        <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
            <Card style={{ borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <Title level={3}><DollarCircleOutlined /> Quản Lý Giao Dịch</Title>
                    <Button icon={<SyncOutlined />} onClick={fetchTransactions}>Làm mới</Button>
                </div>

                <Table
                    columns={columns}
                    dataSource={transactions}
                    rowKey="id"
                    loading={loading}
                    bordered
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </div>
    );
};

export default AdminPaymentPage;