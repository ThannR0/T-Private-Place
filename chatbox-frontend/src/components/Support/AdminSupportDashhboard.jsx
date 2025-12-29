import React, { useEffect, useState } from 'react';
import {
    Table,
    Tag,
    Button,
    Card,
    Row,
    Col,
    Select,
    message,
    Drawer,
    Typography,
    Input,
    Space,
    Badge,
    Avatar,
    Divider,
    Tooltip,
    Empty,
    Spin,
    Statistic
} from 'antd';
import {
    CheckCircleOutlined, ClockCircleOutlined, SyncOutlined,
    MessageOutlined, MailOutlined, ReloadOutlined,
    UserOutlined, SearchOutlined, SafetyCertificateOutlined,
    BugOutlined, DollarOutlined, FireOutlined, SendOutlined,
    PhoneOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import { getAllTicketsAdmin, replyTicketAdmin } from '../../services/SupportAPI';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { motion } from 'framer-motion';
import { getAvatarUrl } from "../../utils/common.js";

// Kích hoạt plugin thời gian
dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Style chuẩn CRM (Clean & Professional)
const cardStyle = {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #f0f0f0', // Viền mỏng tinh tế
    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
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
        } catch (error) { message.error("Lỗi tải dữ liệu"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTickets(); }, []);

    // Logic thống kê
    const stats = {
        open: tickets.filter(t => t.status === 'OPEN').length,
        processing: tickets.filter(t => t.status === 'PROCESSING').length,
        resolved: tickets.filter(t => t.status === 'RESOLVED').length,
    };

    const handleReply = async () => {
        if (!replyText.trim()) return message.warning("Vui lòng nhập nội dung phản hồi");
        setReplyLoading(true);
        try {
            await replyTicketAdmin(selectedTicket.id, replyText, replyStatus);
            message.success("✅ Đã gửi phản hồi và Email cho khách!");
            setSelectedTicket(null);
            fetchTickets();
        } catch (error) { message.error("Lỗi gửi phản hồi"); }
        finally { setReplyLoading(false); }
    };

    // Hàm phân tích lịch sử chat từ description (để hiển thị dạng hội thoại)
    // Backend đang lưu kiểu: "Nội dung gốc... \n\n--- [Time] User phản hồi: ---\nNội dung mới"
    const parseChatHistory = (description) => {
        if (!description) return [];
        // Tách các đoạn phản hồi dựa trên chuỗi ký tự phân cách của Backend
        const parts = description.split(/\n\n--- \[.*?\] User phản hồi: ---\n/g);
        // Phần đầu tiên là nội dung gốc, các phần sau là user chat thêm
        return parts;
    };

    // Cấu hình bảng
    const columns = [
        {
            title: 'Khách hàng',
            dataIndex: 'userId',
            width: 250,
            render: (text, record) => (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Avatar
                        src={getAvatarUrl(record.userId, record.userId, record.userAvatar)}
                        size={40}
                        style={{ border: '1px solid #eee' }}
                    />
                    <div>
                        <Text strong style={{ display: 'block', fontSize: 14 }}>{text}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {record.userEmail ? <><MailOutlined /> {record.userEmail}</> : "Chưa có email"}
                        </Text>
                    </div>
                </div>
            )
        },
        {
            title: 'Vấn đề',
            dataIndex: 'title',
            render: (text, record) => (
                <div>
                    <Text strong style={{ fontSize: 15 }}>{text}</Text>
                    <div style={{ marginTop: 4 }}>
                        <Tag color={record.category === 'PAYMENT' ? 'green' : (record.category === 'BUG' ? 'volcano' : 'geekblue')}>
                            {record.category}
                        </Tag>
                        {record.priority === 'URGENT' && <Tag color="red" icon={<FireOutlined />}>KHẨN CẤP</Tag>}
                    </div>
                </div>
            )
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 150,
            render: (s) => {
                let color = s === 'OPEN' ? 'error' : (s === 'PROCESSING' ? 'warning' : 'success');
                let text = s === 'OPEN' ? 'Mới' : (s === 'PROCESSING' ? 'Đang xử lý' : 'Hoàn tất');
                return <Badge status={color} text={<span style={{ fontWeight: 500 }}>{text}</span>} />;
            }
        },
        {
            title: 'Cập nhật',
            dataIndex: 'updatedAt', // Hoặc createdAt nếu chưa update
            width: 150,
            render: (d, record) => (
                <Text type="secondary" style={{ fontSize: 13 }}>
                    {dayjs(record.updatedAt || record.createdAt).fromNow()}
                </Text>
            )
        },
        {
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Button
                    type="primary" size="small"
                    icon={<MessageOutlined />}
                    style={{ background: '#222', borderColor: '#222' }}
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
        const matchesSearch = t.title.toLowerCase().includes(searchText.toLowerCase()) ||
            t.userId.toLowerCase().includes(searchText.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div style={{ minHeight: '100vh', background: '#f5f7fa', padding: '24px', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ maxWidth: 1600, margin: '0 auto' }}>

                {/* --- HEADER --- */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#1f1f1f' }}>Hệ thống hỗ trợ (Support Desk)</Title>
                        <Text type="secondary">Quản lý ticket và phản hồi khách hàng tập trung</Text>
                    </div>
                    <Space>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                            placeholder="Tìm kiếm..."
                            style={{ width: 300, borderRadius: 6 }}
                            onChange={e => setSearchText(e.target.value)}
                        />
                        <Button icon={<ReloadOutlined />} onClick={fetchTickets}>Làm mới</Button>
                    </Space>
                </div>

                {/* --- STATS CARDS --- */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={8}>
                        <Card bordered={false} style={{ ...cardStyle, borderLeft: '4px solid #ff4d4f' }}>
                            <Statistic
                                title={<span style={{fontSize: 14, fontWeight: 600, color: '#666'}}>CẦN XỬ LÝ (MỚI)</span>}
                                value={stats.open}
                                valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card bordered={false} style={{ ...cardStyle, borderLeft: '4px solid #faad14' }}>
                            <Statistic
                                title={<span style={{fontSize: 14, fontWeight: 600, color: '#666'}}>ĐANG THEO DÕI</span>}
                                value={stats.processing}
                                valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
                                prefix={<SyncOutlined spin />}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card bordered={false} style={{ ...cardStyle, borderLeft: '4px solid #52c41a' }}>
                            <Statistic
                                title={<span style={{fontSize: 14, fontWeight: 600, color: '#666'}}>ĐÃ HOÀN THÀNH</span>}
                                value={stats.resolved}
                                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                                prefix={<CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* --- TABLE DATA --- */}
                <Card bordered={false} style={cardStyle} styles={{ body: { padding: '0' } }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 10 }}>
                        <Text strong>Lọc trạng thái:</Text>
                        <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 150 }} size="small">
                            <Option value="ALL">Tất cả</Option>
                            <Option value="OPEN">Mới tạo</Option>
                            <Option value="PROCESSING">Đang xử lý</Option>
                            <Option value="RESOLVED">Đã xong</Option>
                        </Select>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 8, showSizeChanger: false }}
                    />
                </Card>
            </div>

            {/* --- DRAWER CHI TIẾT (PHIÊN BẢN PRO) --- */}
            <Drawer
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: '#e6f7ff', padding: '8px 12px', borderRadius: 8, color: '#1890ff', fontWeight: 'bold' }}>
                            #{selectedTicket?.id}
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>Hồ sơ hỗ trợ</div>
                            <div style={{ fontSize: 12, color: '#888' }}>
                                {selectedTicket ? dayjs(selectedTicket.createdAt).format('HH:mm DD/MM/YYYY') : ''}
                            </div>
                        </div>
                    </div>
                }
                width={700}
                onClose={() => setSelectedTicket(null)}
                open={!!selectedTicket}
                styles={{ header: { borderBottom: '1px solid #f0f0f0' }, body: { padding: 0, background: '#f8f9fa' } }}
            >
                {selectedTicket && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                        {/* 1. USER PROFILE CARD (Thông tin khách hàng) */}
                        <div style={{ padding: '20px', background: '#fff', borderBottom: '1px solid #eee' }}>
                            <Row gutter={24}>
                                <Col span={14}>
                                    <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Khách hàng</Text>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                                        <Avatar size={48} src={getAvatarUrl(selectedTicket.userId, selectedTicket.userId, selectedTicket.userAvatar)} />
                                        <div>
                                            <Title level={5} style={{ margin: 0 }}>{selectedTicket.userId}</Title>
                                            {selectedTicket.userEmail ? (
                                                <div style={{ color: '#1890ff', fontSize: 13 }}><MailOutlined /> {selectedTicket.userEmail}</div>
                                            ) : (
                                                <div style={{ color: '#999', fontSize: 13 }}>Chưa cập nhật Email</div>
                                            )}
                                        </div>
                                    </div>
                                </Col>
                                <Col span={10}>
                                    <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Chi tiết Ticket</Text>
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ marginBottom: 5 }}><Text strong>Mức độ:</Text> <Tag color={selectedTicket.priority === 'URGENT' ? 'red' : 'blue'}>{selectedTicket.priority}</Tag></div>
                                        <div><Text strong>Loại:</Text> {selectedTicket.category}</div>
                                    </div>
                                </Col>
                            </Row>
                        </div>

                        {/* 2. CHAT HISTORY (Mô phỏng hội thoại) */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                            {/* Tiêu đề Ticket */}
                            <Divider plain><Text type="secondary" style={{fontSize: 12}}>BẮT ĐẦU PHIÊN HỖ TRỢ</Text></Divider>
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <Text strong style={{ fontSize: 16 }}>"{selectedTicket.title}"</Text>
                            </div>

                            {/* Hội thoại: User (Gốc + Reply sau này) */}
                            {parseChatHistory(selectedTicket.description).map((msg, index) => (
                                <div key={index} style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                                    <Avatar src={getAvatarUrl(selectedTicket.userId, selectedTicket.userId, selectedTicket.userAvatar)} />
                                    <div style={{ maxWidth: '85%' }}>
                                        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '0 16px 16px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                                            <Text strong style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
                                                {selectedTicket.userId} {index > 0 ? '(Phản hồi thêm)' : ''}
                                            </Text>
                                            <div style={{ whiteSpace: 'pre-line', fontSize: 14, color: '#333' }}>{msg.trim()}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Hội thoại: Admin (Phản hồi hiện tại) */}
                            {selectedTicket.adminResponse && (
                                <div style={{ display: 'flex', gap: 15, justifyContent: 'flex-end', marginBottom: 20 }}>
                                    <div style={{ maxWidth: '85%', textAlign: 'right' }}>
                                        <div style={{ background: '#e6f7ff', padding: '12px 16px', borderRadius: '16px 0 16px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: '#0050b3' }}>
                                            <Text strong style={{ fontSize: 13, color: '#096dd9', display: 'block', marginBottom: 4 }}>
                                                Admin Support
                                            </Text>
                                            <div style={{ whiteSpace: 'pre-line', fontSize: 14 }}>{selectedTicket.adminResponse}</div>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11, marginTop: 5, display: 'block' }}>
                                            Đã gửi qua Email • {dayjs(selectedTicket.updatedAt).fromNow()}
                                        </Text>
                                    </div>
                                    <Avatar style={{ backgroundColor: '#1890ff' }} icon={<SafetyCertificateOutlined />} />
                                </div>
                            )}
                        </div>

                        {/* 3. REPLY BOX (Khung soạn thảo chuyên nghiệp) */}
                        <div style={{ padding: '20px', background: '#fff', borderTop: '1px solid #eee', boxShadow: '0 -4px 10px rgba(0,0,0,0.02)' }}>
                            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong><MessageOutlined /> Phản hồi khách hàng</Text>
                                <Tag color="blue">Hệ thống sẽ tự động gửi Email</Tag>
                            </div>

                            <TextArea
                                rows={4}
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Nhập câu trả lời chi tiết tại đây..."
                                style={{ borderRadius: 8, marginBottom: 15, borderColor: '#d9d9d9' }}
                            />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                    <Text type="secondary">Cập nhật trạng thái:</Text>
                                    <Select value={replyStatus} onChange={setReplyStatus} style={{ width: 160 }} size="large">
                                        <Option value="PROCESSING">🟡 Đang xử lý</Option>
                                        <Option value="RESOLVED">🟢 Hoàn tất (Đóng)</Option>
                                    </Select>
                                </Space>
                                <Button
                                    type="primary" size="large"
                                    icon={<SendOutlined />}
                                    loading={replyLoading}
                                    onClick={handleReply}
                                    style={{ background: '#222', borderColor: '#222', height: 40, paddingLeft: 25, paddingRight: 25 }}
                                >
                                    Gửi phản hồi
                                </Button>
                            </div>
                        </div>

                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default AdminSupportDashboard;