import React, { useState, useEffect, useRef } from 'react';
import { Layout, Input, Button, Card, Avatar, Typography, List, Tag, Form, Select, message, Drawer, Timeline, Badge, Empty, Tooltip, Divider, Spin } from 'antd';
import {
    SendOutlined, RobotOutlined, CustomerServiceOutlined, HistoryOutlined,
    PlusCircleOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined,
    ClockCircleOutlined, BugOutlined, DollarOutlined, SafetyCertificateOutlined,
    MessageOutlined, LoadingOutlined, FireOutlined, MailOutlined, UserOutlined
} from '@ant-design/icons';
import { createTicket, getMyTickets } from '../../services/SupportAPI';
import api from '../../services/api';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvatarUrl } from "../../utils/common.js";
import { useChat } from '../../context/ChatContext';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// --- ASSETS & STYLES ---
const BOT_AVATAR = "https://cdn-icons-png.flaticon.com/512/4712/4712027.png";
const BG_IMAGE = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop";

// Style kính mờ cao cấp
const glassStyle = {
    background: 'rgba(255, 255, 255, 0.85)', // Tăng độ đục một chút để dễ đọc
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    borderRadius: '24px',
};

const UserSupportPage = () => {
    // 1. Context
    const { currentUser, currentAvatar, currentFullName } = useChat();

    // 2. State User Info (Email)
    const [userEmail, setUserEmail] = useState("");
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    // 3. State Chat & Bot
    const [messages, setMessages] = useState([
        { id: 1, sender: 'bot', text: `Chào ${currentUser || 'bạn'}! 👋\nTôi là trợ lý AI ChatBox Pro. Tôi có thể giúp bạn kiểm tra trạng thái đơn, nạp tiền hoặc kết nối chuyên sâu với Admin.`, type: 'text' },
        { id: 2, sender: 'bot', text: "Bạn cần hỗ trợ chủ đề gì hôm nay?", type: 'options_smart', options: [
                { label: "💰 Nạp tiền/Ví", code: "PAYMENT_GENERAL" },
                { label: "🐛 Báo lỗi App", code: "BUG_GENERAL" },
                { label: "🔒 Tài khoản/Bảo mật", code: "ACCOUNT_GENERAL" }
            ]}
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // 4. State Ticket & Form
    const [tickets, setTickets] = useState([]);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [loadingTickets, setLoadingTickets] = useState(false);

    // Form Hook
    const [form] = Form.useForm();
    const [formInitialValues, setFormInitialValues] = useState({
        category: 'BUG', priority: 'MEDIUM', title: '', description: ''
    });

    // --- EFFECT: Lấy thông tin User (Email) & Ticket ---
    useEffect(() => {
        fetchUserProfile();
        fetchMyTickets();
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    // API: Lấy thông tin chi tiết user (để lấy Email thật từ DB)
    const fetchUserProfile = async () => {
        try {
            // Gọi API lấy thông tin cá nhân (Bạn cần đảm bảo backend có endpoint này, thường là /users/me hoặc /users/{username})
            // Nếu chưa có, hãy dùng tạm localStorage nếu lúc login có lưu
            const res = await api.get('/users/me');
            if (res.data && res.data.email) {
                setUserEmail(res.data.email);
            }
        } catch (error) {
            console.warn("Không lấy được email user:", error);
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const fetchMyTickets = async () => {
        setLoadingTickets(true);
        try {
            const res = await getMyTickets();
            setTickets(res.data);
        } catch (error) { console.error(error); }
        finally { setLoadingTickets(false); }
    };

    // --- LOGIC BOT PRO MAX (Xử lý ngôn ngữ tự nhiên cơ bản) ---
    const processBotLogic = (text) => {
        setIsTyping(true);
        const lower = text.toLowerCase();

        setTimeout(() => {
            let responseMsg = { sender: 'bot', text: "", type: 'text' };

            // 1. CHÀO HỎI XÃ GIAO
            if (/^(hi|hello|chào|halo|xin chào)/i.test(lower)) {
                responseMsg.text = `Chào bạn ${currentFullName || currentUser}! 🌟\nChúc bạn một ngày tốt lành. Bạn cần tôi giúp gì không?`;
            }
            // 2. NẠP TIỀN / THANH TOÁN
            else if (/nạp|tiền|bank|momo|ví|thanh toán/i.test(lower)) {
                responseMsg.text = "💳 **Vấn đề Tài chính & Nạp tiền:**\nTôi có thể giúp bạn tạo phiếu yêu cầu tra soát ngay lập tức.";
                responseMsg.type = 'options_smart';
                responseMsg.options = [
                    { label: "Chuyển khoản chưa nhận được", code: "PAYMENT_BANK" },
                    { label: "Lỗi Ví điện tử/Thẻ", code: "PAYMENT_WALLET" },
                    { label: "Nạp sai nội dung", code: "PAYMENT_WRONG" }
                ];
            }
            // 3. LỖI KỸ THUẬT
            else if (/lỗi|bug|lag|hư|không (vào|chat|gửi) được/i.test(lower)) {
                responseMsg.text = "🛠 **Trung tâm xử lý sự cố:**\nĐể kỹ thuật viên hỗ trợ nhanh nhất, hãy cho tôi biết bạn gặp lỗi gì?";
                responseMsg.type = 'options_smart';
                responseMsg.options = [
                    { label: "Lỗi Chat/Kết nối", code: "BUG_CHAT" },
                    { label: "Lỗi Giao diện/Hiển thị", code: "BUG_UI" },
                    { label: "Lỗi Đăng nhập/App", code: "BUG_LOGIN" }
                ];
            }
            // 4. TÀI KHOẢN & BẢO MẬT (Mới)
            else if (/mật khẩu|pass|tài khoản|bị hack|đổi tên|avatar/i.test(lower)) {
                responseMsg.text = "🔒 **An toàn & Tài khoản:**\nBạn đang gặp vấn đề gì về tài khoản?";
                responseMsg.type = 'options_smart';
                responseMsg.options = [
                    { label: "Quên mật khẩu", code: "ACC_FORGOT_PASS" },
                    { label: "Muốn đổi thông tin", code: "ACC_CHANGE_INFO" },
                    { label: "Nghi ngờ bị Hack", code: "URGENT_HACK" }
                ];
            }
            // 5. KHẨN CẤP / GẶP NGƯỜI THẬT
            else if (/gấp|lừa đảo|admin đâu|gặp người|nhân viên/i.test(lower)) {
                responseMsg.text = "🚨 **Yêu cầu khẩn cấp:**\nTôi sẽ chuyển bạn đến kênh ưu tiên. Vui lòng điền form dưới đây, Admin sẽ nhận được thông báo ngay lập tức.";
                handleSmartAction("URGENT_ACTION");
                setIsTyping(false);
                return;
            }
            // 6. DEFAULT
            else {
                responseMsg.text = "🤖 Tôi đang học hỏi thêm mỗi ngày, nên chưa hiểu ý này của bạn.\n\nBạn có thể chọn nhanh các chủ đề hỗ trợ phổ biến:";
                responseMsg.type = 'options_smart';
                responseMsg.options = [
                    { label: "💰 Nạp tiền", code: "PAYMENT_GENERAL" },
                    { label: "🐛 Báo lỗi", code: "BUG_GENERAL" },
                    { label: "📝 Gặp Admin", code: "OTHER_ADMIN" }
                ];
            }

            setMessages(prev => [...prev, responseMsg]);
            setIsTyping(false);
        }, 1200); // Delay giả lập suy nghĩ
    };

    // --- HÀNH ĐỘNG THÔNG MINH ---
    const handleSmartAction = (code) => {
        let newValues = { category: 'OTHER', priority: 'MEDIUM', title: '', description: '' };

        // Logic điền sẵn Form (Smart Pre-fill)
        switch (code) {
            case 'PAYMENT_BANK':
                newValues = { category: 'PAYMENT', priority: 'HIGH', title: 'Khiếu nại: Nạp tiền Ngân hàng', description: 'Ngân hàng thụ hưởng: ...\nSố tiền đã chuyển: ...\nMã giao dịch (FT/Mã lệnh): ...\nThời gian chuyển: ...' };
                break;
            case 'PAYMENT_WRONG':
                newValues = { category: 'PAYMENT', priority: 'MEDIUM', title: 'Hỗ trợ: Chuyển khoản sai nội dung', description: 'Nội dung đúng yêu cầu: ...\nNội dung tôi đã ghi: ...\n(Vui lòng đính kèm link ảnh biên lai)' };
                break;
            case 'BUG_CHAT':
                newValues = { category: 'BUG', priority: 'MEDIUM', title: 'Báo lỗi: Chức năng Chat', description: 'Mô tả lỗi: Tin nhắn không gửi được / Không hiện hình ảnh...\nThiết bị đang dùng: PC / Mobile\nTrình duyệt: ...' };
                break;
            case 'ACC_FORGOT_PASS':
                // Trường hợp này Bot có thể trả lời luôn mà ko cần mở form
                setMessages(prev => [...prev, { sender: 'bot', text: '💡 Để lấy lại mật khẩu, bạn vui lòng đăng xuất và bấm vào nút "Quên mật khẩu" ở màn hình đăng nhập. Mã OTP sẽ được gửi về email của bạn.', type: 'text' }]);
                return;
            case 'URGENT_HACK':
            case 'URGENT_ACTION':
                newValues = { category: 'ACCOUNT', priority: 'URGENT', title: 'KHẨN CẤP: Yêu cầu hỗ trợ bảo mật', description: 'Mô tả vấn đề nghiêm trọng đang gặp phải: ...' };
                break;
            case 'OTHER_ADMIN':
                newValues = { category: 'OTHER', priority: 'MEDIUM', title: '', description: '' };
                break;
            default:
                newValues = { category: 'BUG', priority: 'MEDIUM', title: '', description: '' };
        }

        // Cập nhật Form
        setFormInitialValues(newValues);
        form.setFieldsValue(newValues);

        // Mở Drawer
        setDrawerVisible(true);

        setMessages(prev => [...prev, {
            sender: 'bot',
            text: `📝 Đã mở phiếu hỗ trợ "${newValues.title || 'mới'}". Thông tin liên hệ qua Email: ${userEmail} đã được tự động thêm vào.`,
            type: 'text'
        }]);
    };

    const handleSend = () => {
        if (!inputValue.trim()) return;
        setMessages(prev => [...prev, { sender: 'user', text: inputValue, type: 'text' }]);
        const textCache = inputValue;
        setInputValue("");
        processBotLogic(textCache);
    };

    // --- TẠO TICKET (PRO MAX) ---
    const handleCreateTicket = async (values) => {
        try {
            // Chuẩn bị payload
            const ticketData = {
                ...values,
                userAvatar: currentAvatar || "",
                // 🟢 QUAN TRỌNG: Sử dụng email thật của user
                userEmail: userEmail || values.emailFallback || "no-email@system.com"
            };

            await createTicket(ticketData);

            message.success({ content: "✅ Gửi thành công! Vui lòng kiểm tra Email xác nhận.", duration: 5 });
            setDrawerVisible(false);

            // Bot xác nhận lại
            setMessages(prev => [...prev, {
                sender: 'bot',
                text: `✅ Tôi đã gửi phiếu yêu cầu #${values.title} lên hệ thống.\n📧 Một email xác nhận đã được gửi tới: **${ticketData.userEmail}**.\nĐội ngũ Admin sẽ phản hồi trong thời gian sớm nhất.`,
                type: 'text'
            }]);

            fetchMyTickets();
        } catch (error) {
            message.error("Lỗi gửi yêu cầu. Vui lòng thử lại.");
        }
    };

    const handleUserReply = async () => {
        if (!replyText.trim()) return;
        try {
            await api.put(`/support/user/reply/${selectedTicket.id}`, { message: replyText });
            message.success("Đã gửi phản hồi!");
            setReplyText("");
            setSelectedTicket(null);
            fetchMyTickets();
        } catch (error) { message.error("Lỗi gửi tin"); }
    };

    // Component Chip Nút Bấm
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

                {/* --- CỘT TRÁI: KHUNG CHAT --- */}
                <Card style={{ ...glassStyle, flex: 2, display: 'flex', flexDirection: 'column', border: 'none' }} bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '20px 25px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Badge dot status="processing" offset={[-5, 35]}>
                                <Avatar size={48} src={BOT_AVATAR} style={{ background: '#fff', padding: 5, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                            </Badge>
                            <div>
                                <Title level={5} style={{ margin: 0, color: '#333' }}>Trợ lý AI ChatBox</Title>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {isLoadingProfile ? <><LoadingOutlined/> Đang tải dữ liệu...</> : "Sẵn sàng hỗ trợ 24/7"}
                                </Text>
                            </div>
                        </div>
                        <Button type="primary" shape="round" icon={<PlusCircleOutlined />} onClick={() => setDrawerVisible(true)} style={{ background: '#222', border: 'none' }}>
                            Tạo Ticket
                        </Button>
                    </div>

                    {/* Chat Area */}
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

                                        {/* Smart Options */}
                                        {msg.type === 'options_smart' && msg.options && (
                                            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap' }}>
                                                {msg.options.map((opt, idx) => (
                                                    <QuickChip
                                                        key={idx}
                                                        label={opt.label}
                                                        icon={opt.code.includes('PAYMENT') ? <DollarOutlined /> : (opt.code.includes('URGENT') ? <FireOutlined /> : (opt.code.includes('BUG') ? <BugOutlined /> : <CustomerServiceOutlined />))}
                                                        color={opt.code.includes('URGENT') ? 'red' : '#1890ff'}
                                                        bgColor={opt.code.includes('URGENT') ? '#fff1f0' : '#e6f7ff'}
                                                        onClick={() => handleSmartAction(opt.code)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {msg.sender === 'user' && (
                                        <Avatar
                                            size="small"
                                            src={getAvatarUrl(currentUser, currentFullName, currentAvatar)}
                                            style={{ marginLeft: 10, marginBottom: 5 }}
                                        />
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {isTyping && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 40 }}>
                                <div className="typing-dot" style={{width: 6, height: 6, background: '#aaa', borderRadius: '50%'}} />
                                <div className="typing-dot" style={{width: 6, height: 6, background: '#aaa', borderRadius: '50%'}} />
                                <div className="typing-dot" style={{width: 6, height: 6, background: '#aaa', borderRadius: '50%'}} />
                                <Text type="secondary" style={{fontSize: 12, marginLeft: 5}}>ChatBox đang suy nghĩ...</Text>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{ padding: 20, background: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ background: '#fff', borderRadius: 30, padding: '5px 10px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                            <Input
                                placeholder="Nhập vấn đề của bạn..."
                                bordered={false} size="large"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onPressEnter={handleSend}
                                disabled={isTyping}
                            />
                            <Button type="primary" shape="circle" size="large" icon={<SendOutlined />} onClick={handleSend} style={{ background: '#222', border: 'none' }} />
                        </div>
                    </div>
                </Card>

                {/* --- CỘT PHẢI: LỊCH SỬ --- */}
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
                                            hoverable bordered={false}
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
                                                <Text type="secondary" style={{fontSize: 12}}>{t.adminResponse ? "Admin đã phản hồi" : "Đang chờ xử lý"}</Text>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>

            {/* --- DRAWER TẠO TICKET (PRO MAX) --- */}
            <Drawer
                title={
                    <div style={{display:'flex', alignItems:'center', gap: 10}}>
                        <div style={{background: '#e6f7ff', padding: 8, borderRadius: 10}}><CustomerServiceOutlined style={{color: '#1890ff', fontSize: 20}}/></div>
                        <div>
                            <div style={{fontSize: 16, fontWeight: 700}}>Gửi yêu cầu hỗ trợ</div>
                            <div style={{fontSize: 12, fontWeight: 400, color: '#888'}}>Chúng tôi sẽ phản hồi qua Email</div>
                        </div>
                    </div>
                }
                width={550}
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
                headerStyle={{borderBottom: 'none'}}
            >
                <Form layout="vertical" form={form} onFinish={handleCreateTicket} requiredMark={false} initialValues={formInitialValues}>

                    {/* 🟢 KHU VỰC THÔNG TIN NGƯỜI DÙNG (AUTO-FILL) */}
                    <Card type="inner" size="small" style={{marginBottom: 20, background: '#f0f5ff', borderRadius: 12, border: '1px solid #adc6ff'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                            <Avatar src={getAvatarUrl(currentUser, currentFullName, currentAvatar)} />
                            <div>
                                <Text strong style={{display: 'block'}}>{currentFullName || currentUser}</Text>
                                {/* Hiển thị Email tự động */}
                                <Text type="secondary" style={{fontSize: 12}}><MailOutlined /> {userEmail || "Đang tải email..."}</Text>
                            </div>
                        </div>
                        {/* Nếu chưa có email, cho phép nhập thủ công */}
                        {!userEmail && !isLoadingProfile && (
                            <Form.Item name="emailFallback" label="Nhập Email liên hệ" style={{marginTop: 10, marginBottom: 0}} rules={[{required: true, type: 'email', message: 'Cần email để liên hệ'}]}>
                                <Input placeholder="name@example.com" prefix={<MailOutlined/>} />
                            </Form.Item>
                        )}
                    </Card>

                    <Card type="inner" title="1. Thông tin vấn đề" size="small" style={{marginBottom: 20, background: '#f9f9f9', borderRadius: 12}}>
                        <Form.Item name="title" label="Tiêu đề tóm tắt" rules={[{ required: true }]}>
                            <Input placeholder="VD: Nạp tiền bị lỗi..." size="large" />
                        </Form.Item>

                        <div style={{display: 'flex', gap: 15}}>
                            <Form.Item name="category" label="Loại vấn đề" style={{flex: 1}}>
                                <Select size="large">
                                    <Option value="BUG">🐛 Lỗi kỹ thuật</Option>
                                    <Option value="PAYMENT">💰 Thanh toán</Option>
                                    <Option value="ACCOUNT">🔒 Tài khoản</Option>
                                    <Option value="OTHER">📝 Khác</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="priority" label="Mức độ" style={{flex: 1}}>
                                <Select size="large">
                                    <Option value="MEDIUM">Bình thường</Option>
                                    <Option value="HIGH">Cao</Option>
                                    <Option value="URGENT">🔥 Khẩn cấp</Option>
                                </Select>
                            </Form.Item>
                        </div>
                    </Card>

                    <Card type="inner" title="2. Chi tiết" size="small" style={{background: '#f9f9f9', borderRadius: 12}}>
                        <Form.Item name="description" label="Mô tả" rules={[{ required: true }]}>
                            <TextArea rows={6} placeholder="Mô tả chi tiết..." showCount maxLength={2000} style={{borderRadius: 8}} />
                        </Form.Item>
                    </Card>

                    <div style={{marginTop: 30}}>
                        <Button type="primary" htmlType="submit" block size="large" shape="round" style={{height: 50, background: '#222', border: 'none', fontSize: 16}}>
                            Gửi yêu cầu ngay <SendOutlined />
                        </Button>
                    </div>
                </Form>
            </Drawer>

            {/* Modal Chi tiết */}
            {selectedTicket && (
                <Drawer
                    title="Chi tiết hội thoại"
                    width={500}
                    open={!!selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                >
                    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                        <div style={{marginBottom: 20}}>
                            <Title level={4}>{selectedTicket.title}</Title>
                            <div style={{display: 'flex', gap: 10, marginBottom: 10}}>
                                <Tag color={selectedTicket.priority === 'URGENT' ? 'red' : 'blue'}>{selectedTicket.priority}</Tag>
                                <Text type="secondary">{dayjs(selectedTicket.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                            </div>
                            <div style={{background: '#f5f5f5', padding: 15, borderRadius: 12, fontSize: 15, lineHeight: 1.6}}>
                                {selectedTicket.description}
                            </div>
                        </div>
                        <div style={{flex: 1, overflowY: 'auto'}}>
                            {selectedTicket.adminResponse ? (
                                <div style={{display: 'flex', gap: 10}}>
                                    <Avatar src="https://cdn-icons-png.flaticon.com/512/2345/2345338.png" />
                                    <div style={{background: '#f6ffed', border: '1px solid #b7eb8f', padding: 15, borderRadius: 12, width: '100%'}}>
                                        <Text strong style={{color: '#389e0d'}}>Admin Support:</Text>
                                        <div style={{marginTop: 5}}>{selectedTicket.adminResponse}</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{textAlign:'center', color:'#999', marginTop: 20}}>
                                    <SyncOutlined spin style={{fontSize: 24, marginBottom: 10}}/>
                                    <div>Đang chờ Admin phản hồi...</div>
                                </div>
                            )}
                        </div>
                        <div style={{marginTop: 20}}>
                            <Divider>Phản hồi lại</Divider>
                            <div style={{display: 'flex', gap: 10}}>
                                <TextArea autoSize={{minRows: 2}} placeholder="Nhập tin nhắn..." value={replyText} onChange={e => setReplyText(e.target.value)} style={{borderRadius: 15}} />
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