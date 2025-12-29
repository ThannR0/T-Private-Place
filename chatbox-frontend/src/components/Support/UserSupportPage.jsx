import React, { useState, useEffect, useRef } from 'react';
import { Layout, Input, Button, Card, Avatar, Typography, List, Tag, Form, Select, message, Drawer, Timeline, Badge, Empty, Tooltip, Divider } from 'antd';
import {
    SendOutlined, RobotOutlined, CustomerServiceOutlined, HistoryOutlined,
    PlusCircleOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined,
    ClockCircleOutlined, BugOutlined, DollarOutlined, SafetyCertificateOutlined,
    MessageOutlined, LoadingOutlined
} from '@ant-design/icons';
import { createTicket, getMyTickets } from '../../services/SupportAPI';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion'; // 🟢 Thư viện Animation

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// --- ASSETS & STYLES ---
const BOT_AVATAR = "https://cdn-icons-png.flaticon.com/512/4712/4712027.png";
const USER_AVATAR = "https://cdn-icons-png.flaticon.com/512/924/924915.png";
const BG_IMAGE = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop"; // Nền trừu tượng tối giản sang trọng

// Style kính mờ cao cấp
const glassStyle = {
    background: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    borderRadius: '24px',
};

const UserSupportPage = () => {
    const { currentUser, currentAvatar  } = useChat();

    // State Chat
    const [messages, setMessages] = useState([
        { id: 1, sender: 'bot', text: `Chào ${currentUser || 'bạn'}! 👋\nTôi là trợ lý AI ChatBox. Tôi có thể giúp bạn kiểm tra trạng thái đơn, nạp tiền hoặc kết nối với Admin.`, type: 'text' },
        { id: 2, sender: 'bot', text: "Bạn cần hỗ trợ về vấn đề gì?", type: 'options' }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false); // Hiệu ứng bot đang gõ
    const messagesEndRef = useRef(null);

    // State Ticket & Reply
    const [tickets, setTickets] = useState([]);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [loadingTickets, setLoadingTickets] = useState(false);


    useEffect(() => { scrollToBottom(); fetchMyTickets(); }, [messages, isTyping]);
    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    const fetchMyTickets = async () => {
        setLoadingTickets(true);
        try {
            const res = await getMyTickets();
            setTickets(res.data);
        } catch (error) { console.error(error); }
        finally { setLoadingTickets(false); }
    };

    // --- LOGIC BOT NÂNG CẤP (Regex Matching + Typing Effect) ---
    const processBotLogic = (text) => {
        setIsTyping(true); // Bắt đầu giả vờ gõ

        // Thời gian chờ giả lập độ thông minh (800ms - 1.5s)
        setTimeout(() => {
            const lower = text.toLowerCase();
            let responseMsg = { sender: 'bot', text: "", type: 'text' };

            // Phân tích từ khóa thông minh hơn bằng Regex
            if (/nạp|tiền|bank|banking|thanh toán/i.test(lower)) {
                responseMsg.text = "💳 **Về vấn đề Nạp tiền:**\n\n1. Kiểm tra lại lịch sử giao dịch ngân hàng.\n2. Vào mục 'Ví của tôi' xem số dư.\n3. Nếu quá 15 phút chưa nhận được, hãy **Tạo Ticket** và đính kèm ảnh chụp màn hình.";
                responseMsg.type = 'options_payment';
            }
            else if (/lỗi|bug|lag|không vào được|hư/i.test(lower)) {
                responseMsg.text = "🛠 **Báo cáo sự cố:**\n\nRất xin lỗi vì trải nghiệm này. Để đội kỹ thuật xử lý nhanh nhất, bạn vui lòng bấm nút bên dưới để tạo phiếu báo lỗi chi tiết.";
                responseMsg.type = 'options_bug';
            }
            else if (/voucher|giảm giá|khuyến mãi/i.test(lower)) {
                responseMsg.text = "🎟 **Voucher:**\n\nMã giảm giá thường có số lượng giới hạn. Bạn hãy kiểm tra điều kiện áp dụng tại trang Chi tiết Voucher nhé.";
            }
            else if (/admin|người thật|nhân viên|ticket/i.test(lower)) {
                responseMsg.text = "📝 Đã mở form kết nối với Admin. Bạn hãy điền chi tiết vấn đề nhé.";
                setDrawerVisible(true);
            }
            else {
                responseMsg.text = "Tôi chưa hiểu rõ ý bạn lắm. 🤔\nBạn có thể chọn các chủ đề phổ biến dưới đây hoặc yêu cầu gặp Admin.";
                responseMsg.type = 'options'; // Hiện lại menu chính
            }

            setMessages(prev => [...prev, responseMsg]);
            setIsTyping(false); // Kết thúc gõ
        }, 1200);
    };

    const handleSend = () => {
        if (!inputValue.trim()) return;
        setMessages(prev => [...prev, { sender: 'user', text: inputValue, type: 'text' }]);
        const textCache = inputValue;
        setInputValue("");
        processBotLogic(textCache);
    };

    const handleCreateTicket = async (values) => {
        try {
            // 🟢 2. Gửi kèm userAvatar vào payload
            const ticketData = {
                ...values,
                userAvatar: currentAvatar // Thêm dòng này
            };
            await createTicket(values);
            message.success("✅ Đã gửi phiếu hỗ trợ thành công!");
            setDrawerVisible(false);
            setMessages(prev => [...prev, { sender: 'bot', text: `✅ Yêu cầu "${values.title}" đã được gửi tới Admin. Mã vé đã được tạo.`, type: 'text' }]);
            fetchMyTickets();
        } catch (error) { message.error("Lỗi gửi yêu cầu"); }
    };

    const handleUserReply = async () => {
        if (!replyText.trim()) return;
        try {
            await api.put(`/support/user/reply/${selectedTicket.id}`, { message: replyText });
            message.success("Đã phản hồi Admin!");
            setReplyText("");
            setSelectedTicket(null);
            fetchMyTickets();
        } catch (error) { message.error("Lỗi gửi tin"); }
    };

    // Component Nút chọn nhanh (Chip)
    const QuickChip = ({ icon, label, onClick, color = "#1890ff", bgColor = "#e6f7ff" }) => (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
                icon={icon} onClick={onClick}
                style={{
                    borderRadius: '20px', border: 'none',
                    color: color, background: bgColor,
                    fontWeight: 500, boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    margin: '4px'
                }}
            >
                {label}
            </Button>
        </motion.div>
    );

    return (
        <div style={{
            height: '100vh',
            background: `url(${BG_IMAGE}) center/cover no-repeat`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{ width: '100%', maxWidth: 1400, height: '90vh', display: 'flex', gap: 24 }}>

                {/* --- CỘT TRÁI: KHUNG CHAT THÔNG MINH --- */}
                <Card style={{ ...glassStyle, flex: 2, display: 'flex', flexDirection: 'column', border: 'none' }} bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '20px 25px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Badge dot status="processing" offset={[-5, 35]}>
                                <Avatar size={48} src={BOT_AVATAR} style={{ background: '#fff', padding: 5, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                            </Badge>
                            <div>
                                <Title level={5} style={{ margin: 0, color: '#333' }}>Trợ lý AI ChatBox</Title>
                                <Text type="secondary" style={{ fontSize: 12 }}>Luôn sẵn sàng 24/7</Text>
                            </div>
                        </div>
                        <Button type="primary" shape="round" icon={<PlusCircleOutlined />} onClick={() => setDrawerVisible(true)} style={{ background: '#222', border: 'none' }}>
                            Tạo Ticket Mới
                        </Button>
                    </div>

                    {/* Chat Body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: 15 }}>
                        <AnimatePresence>
                            {messages.map((msg, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}
                                >
                                    {msg.sender === 'bot' && <Avatar size="small" src={BOT_AVATAR} style={{ marginRight: 10, marginBottom: 5 }} />}

                                    <div style={{ maxWidth: '75%' }}>
                                        {/* Bong bóng chat */}
                                        <div style={{
                                            padding: '14px 18px',
                                            borderRadius: '20px',
                                            background: msg.sender === 'user' ? 'linear-gradient(135deg, #2b5876, #4e4376)' : '#fff',
                                            color: msg.sender === 'user' ? '#fff' : '#444',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                                            borderBottomRightRadius: msg.sender === 'user' ? 2 : 20,
                                            borderBottomLeftRadius: msg.sender === 'bot' ? 2 : 20,
                                            whiteSpace: 'pre-line',
                                            fontSize: 15, lineHeight: 1.5
                                        }}>
                                            {msg.text}
                                        </div>

                                        {/* Vùng Options (Nút bấm) */}
                                        {msg.sender === 'bot' && (
                                            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap' }}>
                                                {(msg.type === 'options' || msg.type === 'options_payment') && (
                                                    <>
                                                        <QuickChip label="Nạp tiền" icon={<DollarOutlined />} onClick={() => handleSend({target: {value: 'Nạp tiền'}})} /* Giả lập event */ onClick={() => {setInputValue('Nạp tiền'); handleSend();}} />
                                                        <QuickChip label="Báo lỗi" icon={<BugOutlined />} color="#ff4d4f" bgColor="#fff1f0" onClick={() => {setInputValue('Báo lỗi'); handleSend();}} />
                                                    </>
                                                )}
                                                {msg.type === 'options' && (
                                                    <QuickChip label="Tài khoản" icon={<SafetyCertificateOutlined />} color="#faad14" bgColor="#fffbe6" onClick={() => {setInputValue('Tài khoản'); handleSend();}} />
                                                )}
                                                <QuickChip label="Gặp Admin" icon={<CustomerServiceOutlined />} color="#722ed1" bgColor="#f9f0ff" onClick={() => setDrawerVisible(true)} />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Hiệu ứng đang gõ... */}
                        {isTyping && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 40 }}>
                                <div className="typing-dot" style={{width: 6, height: 6, background: '#aaa', borderRadius: '50%'}} />
                                <div className="typing-dot" style={{width: 6, height: 6, background: '#aaa', borderRadius: '50%'}} />
                                <div className="typing-dot" style={{width: 6, height: 6, background: '#aaa', borderRadius: '50%'}} />
                                <Text type="secondary" style={{fontSize: 12, marginLeft: 5}}>ChatBox đang soạn tin...</Text>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Footer */}
                    <div style={{ padding: 20, background: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ background: '#fff', borderRadius: 30, padding: '5px 10px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                            <Input
                                placeholder="Nhập tin nhắn..."
                                bordered={false}
                                size="large"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onPressEnter={handleSend}
                                disabled={isTyping}
                            />
                            <Button type="primary" shape="circle" size="large" icon={<SendOutlined />} onClick={handleSend} style={{ background: '#222', border: 'none' }} />
                        </div>
                    </div>
                </Card>

                {/* --- CỘT PHẢI: LỊCH SỬ TICKET --- */}
                <Card
                    title={<div style={{display:'flex', alignItems:'center', gap: 10}}><HistoryOutlined style={{color:'#1890ff'}}/> <span style={{fontSize: 18}}>Lịch sử hỗ trợ</span></div>}
                    extra={<Tooltip title="Làm mới"><Button type="text" shape="circle" icon={<SyncOutlined spin={loadingTickets} />} onClick={fetchMyTickets} /></Tooltip>}
                    style={{ ...glassStyle, flex: 1, border: 'none', display: 'flex', flexDirection: 'column' }}
                    bodyStyle={{ flex: 1, overflowY: 'auto', padding: '15px' }}
                >
                    {tickets.length === 0 ? (
                        <div style={{textAlign:'center', marginTop: 50, opacity: 0.6}}>
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có yêu cầu nào" />
                            <Button type="dashed" onClick={() => setDrawerVisible(true)}>Tạo yêu cầu đầu tiên</Button>
                        </div>
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                            {tickets.map(t => {
                                const isResolved = t.status === 'RESOLVED';
                                return (
                                    <motion.div key={t.id} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300 }}>
                                        <Card
                                            hoverable
                                            bordered={false}
                                            onClick={() => setSelectedTicket(t)}
                                            style={{
                                                borderRadius: 16,
                                                background: isResolved ? 'rgba(246, 255, 237, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                                                borderLeft: `4px solid ${isResolved ? '#52c41a' : (t.status === 'OPEN' ? '#ff4d4f' : '#1890ff')}`
                                            }}
                                            bodyStyle={{ padding: 16 }}
                                        >
                                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6}}>
                                                <Tag color={isResolved ? 'success' : 'processing'}>{t.status}</Tag>
                                                <Text type="secondary" style={{fontSize: 11}}>{dayjs(t.createdAt).format('DD/MM HH:mm')}</Text>
                                            </div>
                                            <Text strong style={{fontSize: 15, display: 'block', marginBottom: 5}}>{t.title}</Text>
                                            <div style={{display: 'flex', alignItems: 'center', gap: 5}}>
                                                <Badge status={t.adminResponse ? "success" : "default"} />
                                                <Text type="secondary" style={{fontSize: 12}}>{t.adminResponse ? "Admin đã trả lời" : "Đang chờ xử lý"}</Text>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>

            {/* --- DRAWER TẠO TICKET CHUYÊN NGHIỆP --- */}
            <Drawer
                title={
                    <div style={{display:'flex', alignItems:'center', gap: 10}}>
                        <div style={{background: '#e6f7ff', padding: 8, borderRadius: 10}}><CustomerServiceOutlined style={{color: '#1890ff', fontSize: 20}}/></div>
                        <div>
                            <div style={{fontSize: 16, fontWeight: 700}}>Gửi yêu cầu hỗ trợ</div>
                            <div style={{fontSize: 12, fontWeight: 400, color: '#888'}}>Chúng tôi sẽ phản hồi qua Email & tại đây</div>
                        </div>
                    </div>
                }
                width={500}
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
                headerStyle={{borderBottom: 'none'}}
            >
                <Form layout="vertical" onFinish={handleCreateTicket} requiredMark={false}>
                    <Card type="inner" title="1. Thông tin vấn đề" size="small" style={{marginBottom: 20, background: '#f9f9f9', borderRadius: 12}}>
                        <Form.Item name="title" label="Tiêu đề tóm tắt" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
                            <Input placeholder="VD: Nạp 50k qua momo nhưng chưa nhận được xu" size="large" />
                        </Form.Item>

                        <div style={{display: 'flex', gap: 15}}>
                            <Form.Item name="category" label="Loại lỗi" style={{flex: 1}} initialValue="BUG">
                                <Select size="large">
                                    <Option value="BUG">🐛 Lỗi kỹ thuật</Option>
                                    <Option value="PAYMENT">💰 Thanh toán</Option>
                                    <Option value="ACCOUNT">🔒 Tài khoản</Option>
                                    <Option value="OTHER">📝 Khác</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="priority" label="Mức độ" style={{flex: 1}} initialValue="MEDIUM">
                                <Select size="large">
                                    <Option value="MEDIUM">Bình thường</Option>
                                    <Option value="URGENT">🔥 Khẩn cấp</Option>
                                </Select>
                            </Form.Item>
                        </div>
                    </Card>

                    <Card type="inner" title="2. Chi tiết" size="small" style={{background: '#f9f9f9', borderRadius: 12}}>
                        <Form.Item name="description" label="Mô tả chi tiết" help="Cung cấp mã giao dịch, thời gian xảy ra lỗi hoặc các bước để tái hiện lỗi." rules={[{ required: true }]}>
                            <TextArea rows={6} placeholder="Nhập nội dung..." showCount maxLength={2000} style={{borderRadius: 8}} />
                        </Form.Item>
                    </Card>

                    <div style={{marginTop: 30}}>
                        <Button type="primary" htmlType="submit" block size="large" shape="round" style={{height: 50, fontSize: 16, background: '#222', border: 'none'}}>
                            Gửi yêu cầu ngay <SendOutlined />
                        </Button>
                    </div>
                </Form>
            </Drawer>

            {/* --- MODAL CHI TIẾT & PHẢN HỒI --- */}
            {selectedTicket && (
                <Drawer
                    title="Chi tiết hội thoại"
                    width={500}
                    open={!!selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                >
                    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                        {/* Header Ticket */}
                        <div style={{marginBottom: 20}}>
                            <Title level={4}>{selectedTicket.title}</Title>
                            <div style={{display:'flex', gap: 10, marginBottom: 15}}>
                                <Tag color="blue">{selectedTicket.category}</Tag>
                                <Tag bordered={false}>{dayjs(selectedTicket.createdAt).format('DD/MM/YYYY HH:mm')}</Tag>
                            </div>
                            <div style={{background: '#f5f5f5', padding: 15, borderRadius: 12, fontSize: 15, lineHeight: 1.6}}>
                                {selectedTicket.description}
                            </div>
                        </div>

                        {/* Phần phản hồi của Admin */}
                        <div style={{flex: 1, overflowY: 'auto'}}>
                            {selectedTicket.adminResponse ? (
                                <div style={{display: 'flex', gap: 15}}>
                                    <Avatar src="https://cdn-icons-png.flaticon.com/512/2345/2345338.png" />
                                    <div style={{background: '#f6ffed', border: '1px solid #b7eb8f', padding: 15, borderRadius: 12, width: '100%'}}>
                                        <Text strong style={{color: '#389e0d'}}>Admin Support:</Text>
                                        <div style={{marginTop: 5}}>{selectedTicket.adminResponse}</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{textAlign: 'center', color: '#999', marginTop: 30}}>
                                    <SyncOutlined spin style={{fontSize: 24, marginBottom: 10}} />
                                    <div>Đang chờ Admin phản hồi...</div>
                                </div>
                            )}
                        </div>

                        {/* Footer Reply */}
                        <div style={{marginTop: 20}}>
                            <Divider>Phản hồi lại</Divider>
                            <div style={{display: 'flex', gap: 10}}>
                                <TextArea
                                    autoSize={{ minRows: 2, maxRows: 6 }}
                                    placeholder="Nhập tin nhắn..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    style={{borderRadius: 15}}
                                />
                                <Button type="primary" shape="circle" size="large" icon={<SendOutlined />} onClick={handleUserReply} />
                            </div>
                        </div>
                    </div>
                </Drawer>
            )}
        </div>
    );
};

export default UserSupportPage;