import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Tag, message, Popconfirm, Input, Space, Tooltip, Modal, Form, InputNumber, DatePicker, Select } from 'antd';
import { ReloadOutlined, SyncOutlined, SearchOutlined, EditOutlined, DeleteOutlined, FilterOutlined } from '@ant-design/icons';
import { marketApi } from './MarketAPI';
import dayjs from 'dayjs';

const { Option } = Select;

const AdminVoucherManager = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');

    // State cho Modal Sửa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchVouchers();
    }, []);

    const fetchVouchers = async () => {
        setLoading(true);
        try {
            const res = await marketApi.getAllVouchers();
            setVouchers(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
            // message.error("Lỗi tải danh sách voucher");
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            message.loading({ content: "Đang quét và bù voucher...", key: 'sync' });
            const res = await marketApi.syncVouchers();
            message.success({ content: res.data || "Thành công", key: 'sync' });
            fetchVouchers();
        } catch (error) {
            message.error({ content: "Lỗi khi sync", key: 'sync' });
        }
    };

    // --- XỬ LÝ XÓA ---
    const handleDelete = async (id) => {
        try {
            await marketApi.deleteVoucher(id);
            message.success("Đã xóa voucher!");
            // Cập nhật lại UI mà không cần gọi lại API (tối ưu)
            setVouchers(prev => prev.filter(v => v.id !== id));
        } catch (error) {
            message.error("Lỗi khi xóa voucher");
        }
    };

    // --- XỬ LÝ SỬA ---
    const openEditModal = (record) => {
        setEditingVoucher(record);
        // Fill dữ liệu vào form
        form.setFieldsValue({
            code: record.code,
            description: record.description,
            discountPercent: record.discountPercent * 100, // Đổi về số nguyên (0.1 -> 10%)
            expirationDate: record.expirationDate ? dayjs(record.expirationDate) : null,
            isActive: record.isActive
        });
        setIsModalOpen(true);
    };

    const handleUpdate = async (values) => {
        try {
            const payload = {
                ...values,
                discountPercent: values.discountPercent / 100, // Đổi lại về thập phân (10% -> 0.1)
                // Backend cần DTO, ta map lại cho đúng
                expiryDate: values.expirationDate // DTO bên Java đang dùng tên field là expiryDate (dựa vào file VoucherService bạn gửi lúc trước)
            };

            await marketApi.updateVoucher(editingVoucher.id, payload);
            message.success("Cập nhật thành công!");
            setIsModalOpen(false);
            fetchVouchers(); // Tải lại dữ liệu mới
        } catch (error) {
            message.error("Lỗi cập nhật: " + (error.response?.data?.message || error.message));
        }
    };

    // --- CẤU HÌNH CỘT BẢNG ---
    const columns = [
        {
            title: 'ID', dataIndex: 'id', width: 60, sorter: (a, b) => a.id - b.id
        },
        {
            title: 'Mã Voucher',
            dataIndex: 'code',
            width: 200,
            render: (text) => <Tag color="blue" style={{ fontWeight: 'bold' }}>{text}</Tag>,
            // TÌM KIẾM
            filteredValue: [searchText],
            onFilter: (value, record) => {
                return String(record.code || '').toLowerCase().includes(value.toLowerCase()) ||
                    String(record.owner?.username || '').toLowerCase().includes(value.toLowerCase());
            }
        },
        {
            title: 'Chủ sở hữu',
            dataIndex: ['owner', 'username'],
            render: (text) => text ? <Tag color="geekblue">{text}</Tag> : <Tag color="green">Dùng chung (Public)</Tag>
        },
        {
            title: 'Giảm giá',
            dataIndex: 'discountPercent',
            render: (val, record) => (
                <span style={{ fontWeight: 'bold', color: '#d4380d' }}>
                    {val ? `${(val * 100).toFixed(0)}%` : `${record.discountAmount?.toLocaleString()}đ`}
                </span>
            )
        },
        {
            title: 'Trạng thái',
            key: 'status',
            width: 120,
            // BỘ LỌC (FILTER)
            filters: [
                { text: 'Sẵn sàng', value: 'ready' },
                { text: 'Hết hạn', value: 'expired' },
                { text: 'Đã khóa', value: 'locked' },
                { text: 'Đã dùng hết', value: 'used_up' }
            ],
            onFilter: (value, record) => {
                const dateCheck = record.expirationDate;
                const isExpired = dateCheck && dayjs().isAfter(dayjs(dateCheck));
                const isUsedUp = record.usageLimit > 0 && record.usedCount >= record.usageLimit;

                if (value === 'locked') return !record.isActive;
                if (value === 'expired') return isExpired;
                if (value === 'used_up') return isUsedUp;
                if (value === 'ready') return record.isActive && !isExpired && !isUsedUp;
                return true;
            },
            render: (_, record) => {
                const dateCheck = record.expirationDate;
                const isExpired = dateCheck && dayjs().isAfter(dayjs(dateCheck));

                if (!record.isActive) return <Tag color="red">Đã khóa</Tag>;
                if (isExpired) return <Tag color="orange">Hết hạn</Tag>;
                if (record.usageLimit > 0 && record.usedCount >= record.usageLimit) return <Tag color="default">Hết lượt</Tag>;
                return <Tag icon={<SyncOutlined spin={false} />} color="success">Sẵn sàng</Tag>;
            }
        },
        {
            title: 'Hết hạn',
            dataIndex: 'expirationDate',
            sorter: (a, b) => new Date(a.expirationDate) - new Date(b.expirationDate),
            render: (date) => date ? (
                <Tooltip title={dayjs(date).format('HH:mm:ss')}>
                    {dayjs(date).format('DD/MM/YYYY')}
                </Tooltip>
            ) : 'Vĩnh viễn'
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            type="primary" ghost size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEditModal(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Xóa vĩnh viễn">
                        <Popconfirm
                            title="Xóa voucher này?"
                            description="Hành động này không thể hoàn tác!"
                            onConfirm={() => handleDelete(record.id)}
                            okText="Xóa" cancelText="Hủy"
                        >
                            <Button danger size="small" icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <Card
            title="Quản Lý Voucher & Mã Giảm Giá"
            extra={
                <Space>
                    <Input
                        placeholder="Tìm mã / username..."
                        prefix={<SearchOutlined />}
                        onChange={e => setSearchText(e.target.value)}
                        allowClear
                        style={{ width: 250 }}
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchVouchers}>Reload</Button>
                    <Popconfirm
                        title="Quét lại Level User?"
                        description="Hệ thống sẽ kiểm tra tổng nạp và phát bù voucher VIP."
                        onConfirm={handleSync}
                    >
                        <Button type="primary" icon={<SyncOutlined />}>Sync VIP</Button>
                    </Popconfirm>
                </Space>
            }
        >
            <Table
                dataSource={vouchers}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 8, showSizeChanger: true }}
                scroll={{ x: 800 }}
            />

            {/* --- MODAL CHỈNH SỬA --- */}
            <Modal
                title={`Sửa Voucher: ${editingVoucher?.code}`}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                okText="Lưu thay đổi"
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical" onFinish={handleUpdate}>
                    <Form.Item name="code" label="Mã Voucher" rules={[{ required: true }]}>
                        <Input disabled={true} style={{ color: '#000' }} />
                        {/* Thường mã không nên sửa để tránh lỗi logic, nếu muốn sửa thì bỏ disabled */}
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item
                            name="discountPercent"
                            label="Giảm giá (%)"
                            rules={[{ required: true }]}
                            style={{ flex: 1 }}
                        >
                            <InputNumber min={1} max={100} formatter={value => `${value}%`} parser={value => value.replace('%', '')} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                            name="isActive"
                            label="Trạng thái"
                            style={{ flex: 1 }}
                        >
                            <Select>
                                <Option value={true}>Hoạt động (Active)</Option>
                                <Option value={false}>Đã khóa (Locked)</Option>
                            </Select>
                        </Form.Item>
                    </div>

                    <Form.Item name="expirationDate" label="Ngày hết hạn">
                        <DatePicker showTime format="DD/MM/YYYY HH:mm:ss" style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default AdminVoucherManager;