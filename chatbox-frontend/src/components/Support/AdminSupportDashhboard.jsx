import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Card, Row, Col, Select, message, Drawer, Typography, Input, Space, Badge, Avatar, Divider } from 'antd';
import {
    CheckCircleOutlined, ClockCircleOutlined, SyncOutlined,
    MessageOutlined, MailOutlined, ReloadOutlined,
    UserOutlined, SearchOutlined, SafetyCertificateOutlined,
    BugOutlined, DollarOutlined, FireOutlined
} from '@ant-design/icons';
import { getAllTicketsAdmin, replyTicketAdmin } from '../../services/SupportAPI';
import dayjs from 'dayjs';
// 🟢 FIX LỖI 1: Import plugin relativeTime cho dayjs
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi'; // (Tùy chọn) Nếu muốn hiển thị tiếng Việt
import { motion } from 'framer-motion';

// Kích hoạt plugin
dayjs.extend(relativeTime);
dayjs.locale('vi'); // (Tùy chọn)

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// --- ASSETS & STYLES ---

const ADMIN_AVATAR = "https://cdn-icons-png.flaticon.com/512/2345/2345338.png";

// Style kính mờ (Glassmorphism)
const glassStyle = {
    background: '#ffffff',  // Nền trắng 100%
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', // Bóng đổ nhẹ
    border: '1px solid #f0f0f0' // Viền mỏng
};

const AdminSupportDashboard = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);

    // State xử lý ticket
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [replyStatus, setReplyStatus] = useState("RESOLVED");
    const [replyLoading, setReplyLoading] = useState(false);

    // State lọc & tìm kiếm
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchText, setSearchText] = useState('');

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await getAllTicketsAdmin();
            const sorted = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setTickets(sorted);
        } catch (error) { message.error("Lỗi kết nối"); }
        finally { setLoading(false); }
    };

    const getAvatar = (record) => {
        // Ưu tiên ảnh thật -> Nếu không có thì dùng ảnh tạo tự động theo tên -> Cuối cùng là icon
        return record.userAvatar || `https://ui-avatars.com/api/?name=${record.userId}&background=random`;
    };

    useEffect(() => { fetchTickets(); }, []);

    // Logic thống kê
    const stats = {
        open: tickets.filter(t => t.status === 'OPEN').length,
        processing: tickets.filter(t => t.status === 'PROCESSING').length,
        resolved: tickets.filter(t => t.status === 'RESOLVED').length,
    };

    const handleReply = async () => {
        if (!replyText.trim()) return message.warning("Vui lòng nhập nội dung");
        setReplyLoading(true);
        try {
            await replyTicketAdmin(selectedTicket.id, replyText, replyStatus);
            message.success("Đã cập nhật hồ sơ!");
            setSelectedTicket(null);
            fetchTickets();
        } catch (error) { message.error("Lỗi gửi phản hồi"); }
        finally { setReplyLoading(false); }
    };

    // Component Thẻ Thống Kê Động
    const StatCard = ({ title, value, icon, color, bgColor }) => (
        <motion.div whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 300 }}>
            {/* 🟢 FIX LỖI 2: Thay bordered={false} bằng variant="borderless" */}
            <Card variant="borderless" style={{ ...glassStyle, borderLeft: `5px solid ${color}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <Text type="secondary" style={{ fontSize: 13, textTransform: 'uppercase', fontWeight: 600 }}>{title}</Text>
                        <Title level={2} style={{ margin: 0, color: color }}>{value}</Title>
                    </div>
                    <div style={{
                        background: bgColor, color: color, width: 50, height: 50,
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                    }}>
                        {icon}
                    </div>
                </div>
            </Card>
        </motion.div>
    );

    // Cấu hình bảng
    const columns = [
        {
            title: 'Hồ sơ',
            dataIndex: 'title',
            render: (text, record) => (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Avatar
                        shape="square"
                        style={{ backgroundColor: record.category === 'BUG' ? '#ff4d4f' : '#1890ff' }}
                        icon={record.category === 'BUG' ? <BugOutlined /> : <DollarOutlined />}
                    />
                    <div>
                        <Text strong style={{ fontSize: 15, display: 'block' }}>{text}</Text>
                        <Space size="small">
                            {/* 🟢 FIX LỖI 3: Thay bordered={false} cho Tag bằng variant="borderless" hoặc "filled" */}
                            <Tag variant="borderless" style={{ fontSize: 11 }}>{record.category}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>#{record.id}</Text>
                        </Space>
                    </div>
                </div>
            )
        },
        {
            title: 'Người gửi',
            dataIndex: 'userId',
            render: (text, record) => ( // Nhớ thêm tham số 'record'
                <Space>
                    {/* 🟢 SỬA LẠI: Dùng Avatar thay vì UserOutlined */}
                    <Avatar src={getAvatar(record)} icon={<UserOutlined />} />
                    <Text strong>{text}</Text>
                </Space>
            )
        },
        {
            title: 'Mức độ',
            dataIndex: 'priority',
            render: (p) => (
                <Tag color={p === 'URGENT' ? 'red' : (p === 'HIGH' ? 'orange' : 'blue')} style={{ borderRadius: 10 }}>
                    {p === 'URGENT' && <FireOutlined />} {p}
                </Tag>
            )
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s) => {
                let color = s === 'OPEN' ? '#f50' : (s === 'PROCESSING' ? '#faad14' : '#52c41a');
                let label = s === 'OPEN' ? 'Mới' : (s === 'PROCESSING' ? 'Đang xử lý' : 'Hoàn tất');
                return <Badge color={color} text={label} />;
            }
        },
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            // 🟢 FIX LỖI 4: fromNow() sẽ hoạt động nhờ plugin relativeTime
            render: (d) => <Text type="secondary" style={{ fontSize: 13 }}>{dayjs(d).fromNow()}</Text>
        },
        {
            key: 'action',
            render: (_, record) => (
                <Button
                    type="primary" shape="round" size="small"
                    style={{ background: '#222', border: 'none' }}
                    onClick={() => {
                        setSelectedTicket(record);
                        setReplyText(record.adminResponse || "");
                        setReplyStatus(record.status === 'OPEN' ? 'PROCESSING' : record.status);
                    }}
                >
                    Xử lý
                </Button>
            )
        }
    ];

    const filteredData = tickets.filter(t => {
        const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
        const matchesSearch = t.title.toLowerCase().includes(searchText.toLowerCase()) || t.userId.toLowerCase().includes(searchText.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div style={{
            minHeight: '100vh',
            background: `url(#f0f2f5) center/cover no-repeat fixed`,
            padding: '30px', fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>

                {/* --- HEADER --- */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                    <div style={{ ...glassStyle, padding: '15px 25px', display: 'flex', alignItems: 'center', gap: 15 }}>
                        <SafetyCertificateOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                        <div>
                            <Title level={3} style={{ margin: 0 }}>Xử Lý Vấn Đề Của Người Dùng</Title>
                            <Text type="secondary">Quản lý khiếu nại & báo lỗi hệ thống</Text>
                        </div>
                    </div>
                    <Button type="primary" shape="circle" size="large" icon={<ReloadOutlined />} onClick={fetchTickets} />
                </div>

                {/* --- THỐNG KÊ (STATS) --- */}
                <Row gutter={[20, 20]} style={{ marginBottom: 30 }}>
                    <Col xs={24} sm={8}>
                        <StatCard title="Cần xử lý gấp" value={stats.open} icon={<ClockCircleOutlined />} color="#ff4d4f" bgColor="#fff1f0" />
                    </Col>
                    <Col xs={24} sm={8}>
                        <StatCard title="Đang theo dõi" value={stats.processing} icon={<SyncOutlined spin />} color="#faad14" bgColor="#fffbe6" />
                    </Col>
                    <Col xs={24} sm={8}>
                        <StatCard title="Đã giải quyết" value={stats.resolved} icon={<CheckCircleOutlined />} color="#52c41a" bgColor="#f6ffed" />
                    </Col>
                </Row>

                {/* --- BẢNG DỮ LIỆU --- */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    {/* 🟢 FIX LỖI 5: bodyStyle -> styles.body */}
                    <Card variant="borderless" style={{ ...glassStyle, border: 'none' }} styles={{ body: { padding: '24px' } }}>
                        {/* Toolbar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                            <Input
                                prefix={<SearchOutlined style={{ color: '#ccc' }} />}
                                placeholder="Tìm theo tên user, tiêu đề..."
                                style={{ width: 300, borderRadius: 20 }}
                                onChange={e => setSearchText(e.target.value)}
                            />
                            <Select defaultValue="ALL" style={{ width: 180 }} onChange={setFilterStatus} size="large">
                                <Option value="ALL">Tất cả hồ sơ</Option>
                                <Option value="OPEN">🔴 Mới tạo</Option>
                                <Option value="PROCESSING">🟡 Đang xử lý</Option>
                                <Option value="RESOLVED">🟢 Đã xong</Option>
                            </Select>
                        </div>

                        <Table
                            columns={columns}
                            dataSource={filteredData}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 8 }}
                            rowClassName="glass-table-row"
                        />
                    </Card>
                </motion.div>
            </div>

            {/* --- DRAWER XỬ LÝ "CASE FILE" --- */}
            <Drawer
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar style={{ backgroundColor: '#222' }}>#{selectedTicket?.id}</Avatar>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>Hồ sơ vụ việc</div>
                            <div style={{ fontSize: 12, fontWeight: 400, color: '#888' }}>Chi tiết trao đổi</div>
                        </div>
                    </div>
                }
                width={650} // Lưu ý: width vẫn hoạt động tốt, nếu lỗi có thể thử đổi sang size="large"
                onClose={() => setSelectedTicket(null)}
                open={!!selectedTicket}
                // 🟢 FIX LỖI 6: headerStyle & bodyStyle -> styles.header & styles.body
                styles={{
                    header: { borderBottom: '1px solid #f0f0f0' },
                    body: { background: '#f9f9f9', padding: 0, display: 'flex', flexDirection: 'column' }
                }}
            >
                {selectedTicket && (
                    <>
                        {/* 1. THÔNG TIN TÓM TẮT */}
                        <div style={{ padding: 20, background: '#fff', borderBottom: '1px solid #eee' }}>
                            <Title level={4} style={{ marginTop: 0 }}>{selectedTicket.title}</Title>
                            <Row gutter={16} style={{ fontSize: 13 }}>
                                <Col span={12}>
                                    <Space direction="vertical" size={2}>
                                        <Text type="secondary">Người báo cáo:</Text>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <Avatar size="small" src={getAvatar(selectedTicket)} />
                                            <Text strong>{selectedTicket.userId}</Text>
                                        </div>
                                    </Space>
                                </Col>
                                <Col span={12}>
                                    <Space direction="vertical" size={2}>
                                        <Text type="secondary">Trạng thái:</Text>
                                        <Tag color={selectedTicket.priority === 'URGENT' ? 'red' : 'blue'}>{selectedTicket.priority}</Tag>
                                    </Space>
                                </Col>
                            </Row>
                        </div>

                        {/* 2. LỊCH SỬ TRAO ĐỔI (Scrollable) */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                            {/* Nội dung gốc từ User (Luôn hiển thị đầu tiên) */}
                            <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                                <Avatar icon={<UserOutlined />} />
                                <div>
                                    <div style={{ background: '#fff', padding: 15, borderRadius: '0 15px 15px 15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                                        <Text strong style={{ display: 'block', marginBottom: 5 }}>{selectedTicket.userId} (Mô tả gốc)</Text>
                                        <div style={{ whiteSpace: 'pre-line', fontSize: 14 }}>{selectedTicket.description}</div>
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 5 }}>{dayjs(selectedTicket.createdAt).format('HH:mm DD/MM/YYYY')}</Text>
                                </div>
                            </div>

                            {/* Phản hồi cũ của Admin (Nếu có) */}
                            {selectedTicket.adminResponse && (
                                <div style={{ display: 'flex', gap: 15, justifyContent: 'flex-end', marginBottom: 20 }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ background: '#e6f7ff', padding: 15, borderRadius: '15px 0 15px 15px', color: '#0050b3', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                            <Text strong style={{ display: 'block', marginBottom: 5, color: '#096dd9' }}>Admin Support</Text>
                                            <div style={{ fontSize: 14 }}>{selectedTicket.adminResponse}</div>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11, marginRight: 5 }}>Cập nhật gần nhất</Text>
                                    </div>
                                    <Avatar src={ADMIN_AVATAR} />
                                </div>
                            )}
                        </div>

                        {/* 3. KHUNG SOẠN THẢO */}
                        <div style={{ padding: 20, background: '#fff', borderTop: '1px solid #eee', boxShadow: '0 -5px 15px rgba(0,0,0,0.02)' }}>
                            <Title level={5} style={{ fontSize: 14, marginBottom: 10 }}><MessageOutlined /> Gửi phản hồi & Cập nhật</Title>
                            <TextArea
                                rows={4}
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Nhập câu trả lời cho khách hàng..."
                                style={{ borderRadius: 10, marginBottom: 15, padding: 10 }}
                                showCount maxLength={2000}
                            />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                    <Text strong>Đánh dấu:</Text>
                                    <Select value={replyStatus} onChange={setReplyStatus} style={{ width: 160 }} size="large">
                                        <Option value="PROCESSING">🟡 Đang xử lý</Option>
                                        <Option value="RESOLVED">🟢 Hoàn tất (Đóng)</Option>
                                    </Select>
                                </Space>
                                <Button
                                    type="primary" size="large" shape="round"
                                    icon={<MailOutlined />}
                                    loading={replyLoading}
                                    onClick={handleReply}
                                    style={{ background: '#222', border: 'none', paddingLeft: 30, paddingRight: 30 }}
                                >
                                    Gửi ngay
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </Drawer>
        </div>
    );
};

export default AdminSupportDashboard;