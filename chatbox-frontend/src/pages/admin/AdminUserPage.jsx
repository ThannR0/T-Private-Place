import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Card, Typography, message, Popconfirm, Space, Avatar, Modal, Form, Input, Select, InputNumber, Switch } from 'antd';
import { UserOutlined, EditOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title } = Typography;
const { Option } = Select;

const AdminUserPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // State cho Modal
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // null = Thêm mới, object = Sửa
    const [form] = Form.useForm();

    // 1. Load danh sách User
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch (error) {
            message.error("Lỗi tải danh sách người dùng");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // 2. Xử lý Xóa
    const handleDelete = async (id) => {
        try {
            await api.delete(`/admin/users/${id}`);
            message.success("Đã xóa người dùng");
            fetchUsers();
        } catch (error) {
            message.error("Không thể xóa người dùng này");
        }
    };

    // 3. Xử lý Mở Modal (Thêm hoặc Sửa)
    const handleEdit = (user) => {
        setEditingUser(user);
        if (user) {
            // Fill dữ liệu vào form nếu là sửa
            form.setFieldsValue({
                ...user,
                role: user.role ? user.role.name : 'ROLE_USER' // Lấy tên role từ object
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ role: 'ROLE_USER', enabled: true, balance: 0 });
        }
        setIsModalVisible(true);
    };

    // 4. Xử lý Lưu (Submit Form)
    const handleSave = async () => {
        try {
            const values = await form.validateFields();

            if (editingUser) {
                // --- API SỬA ---
                await api.put(`/admin/users/${editingUser.id}`, values);
                message.success("Cập nhật thành công!");
            } else {
                // --- API THÊM MỚI ---
                await api.post('/admin/users', values);
                message.success("Tạo người dùng mới thành công!");
            }

            setIsModalVisible(false);
            fetchUsers();
        } catch (error) {
            console.error(error);
            message.error("Có lỗi xảy ra, vui lòng kiểm tra lại thông tin");
        }
    };

    const columns = [
        {
            title: 'User',
            key: 'avatar',
            render: (_, record) => (
                <Space>
                    <Avatar src={record.avatar} icon={<UserOutlined />} />
                    <div>
                        <div style={{fontWeight: 'bold'}}>{record.username}</div>
                        <div style={{fontSize: 12, color: '#888'}}>{record.email}</div>
                    </div>
                </Space>
            )
        },
        {
            title: 'Họ tên',
            dataIndex: 'fullName',
            key: 'fullName',
        },
        {
            title: 'Số dư (Than)',
            dataIndex: 'balance',
            key: 'balance',
            render: val => <span style={{color: '#faad14', fontWeight: 'bold'}}>{val ? val.toLocaleString() : 0} T</span>
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            render: (role) => {
                const name = role?.name || "USER";
                return name === 'ROLE_ADMIN'
                    ? <Tag color="red">ADMIN</Tag>
                    : <Tag color="blue">USER</Tag>;
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'enabled',
            key: 'enabled',
            render: (enabled) => enabled
                ? <Tag color="success">Hoạt động</Tag>
                : <Tag color="default">Đã khóa</Tag>
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Bạn chắc chắn muốn xóa user này?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa" cancelText="Hủy"
                    >
                        <Button type="primary" danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
            <Card style={{ borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <Title level={3}><UserOutlined /> Quản Lý Người Dùng</Title>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchUsers}>Làm mới</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleEdit(null)}>Thêm mới</Button>
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                    bordered
                />
            </Card>

            {/* --- MODAL EDIT/ADD --- */}
            <Modal
                title={editingUser ? `Chỉnh sửa: ${editingUser.username}` : "Thêm người dùng mới"}
                open={isModalVisible}
                onOk={handleSave}
                onCancel={() => setIsModalVisible(false)}
                okText="Lưu"
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical">
                    {!editingUser && (
                        <>
                            <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                                <Input placeholder="Nhập username" />
                            </Form.Item>
                            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}>
                                <Input.Password placeholder="Nhập mật khẩu" />
                            </Form.Item>
                        </>
                    )}

                    <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                        <Input />
                    </Form.Item>

                    <div style={{display: 'flex', gap: 20}}>
                        <Form.Item name="role" label="Vai trò" style={{flex: 1}}>
                            <Select>
                                <Option value="ROLE_USER">Người dùng (USER)</Option>
                                <Option value="ROLE_ADMIN">Quản trị (ADMIN)</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item name="balance" label="Số dư (Than)" style={{flex: 1}}>
                            <InputNumber style={{width: '100%'}} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                        </Form.Item>
                    </div>

                    <Form.Item name="enabled" label="Trạng thái kích hoạt" valuePropName="checked">
                        <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminUserPage;