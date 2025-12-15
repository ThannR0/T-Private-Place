import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Empty, Avatar, Typography, Tooltip, Image, Dropdown, Modal, Select, message } from 'antd';
import {
    SendOutlined, SmileOutlined, PaperClipOutlined, CloseCircleFilled,
    FileTextOutlined, FileExcelOutlined, FileUnknownOutlined,
    MoreOutlined, EditOutlined, DeleteOutlined, PushpinOutlined, ShareAltOutlined, CloseOutlined, CheckOutlined, PushpinFilled
} from '@ant-design/icons';
import EmojiPicker from 'emoji-picker-react';
import { useChat } from '../../context/ChatContext';
import ChatHeader from './ChatHeader';
import MessageContent from "./MessageContent.jsx";
import api from '../../services/api';
import { useSettings } from "../../context/SettingsContext.jsx";
import MessageReactions from "./MessageReactions.jsx"; // 1. Import Component hiển thị reaction

const { Text } = Typography;
const { Option } = Select;

// Danh sách các icon cảm xúc
const REACTIONS = ["👍", "❤️", "😆", "😮", "😢", "😡"];

const ChatWindow = () => {
    const { messages, sendMessage, recipient, currentUser, getUserAvatar, users } = useChat();
    const { t } = useSettings();

    // State cơ bản
    const [inputValue, setInputValue] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const [showTimeIds, setShowTimeIds] = useState({});
    const [isTyping, setIsTyping] = useState(false);

    // State File
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    // State Menu 3 chấm
    const [editingMsgId, setEditingMsgId] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
    const [msgToForward, setMsgToForward] = useState(null);
    const [forwardTarget, setForwardTarget] = useState([]);

    const messagesEndRef = useRef(null);
    const messageRefs = useRef({});


    const currentTarget = users.find(u => u.username === recipient);
    const displayRecipientName = currentTarget
        ? (currentTarget.displayName || currentTarget.fullName || currentTarget.username)
        : recipient;

    // --- LOGIC LỌC TIN NHẮN ---
    const filteredMessages = messages.filter(msg => {
        if (currentTarget && currentTarget.isGroup) {
            return msg.recipientId == currentTarget.realGroupId;
        } else {
            return (msg.senderId === currentUser && msg.recipientId === recipient) ||
                (msg.senderId === recipient && msg.recipientId === currentUser);
        }
    });

    // --- TÌM TIN NHẮN ĐANG GHIM ---
    const pinnedMessage = filteredMessages.find(m => m.pinned === true);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

    useEffect(() => { scrollToBottom();
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            // Nếu tin nhắn cuối cùng KHÔNG PHẢI của mình (tức là của Bot hoặc người kia)
            if (lastMsg.senderId !== currentUser) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setIsTyping(false); // Tắt loading
            }
        }
        }, [messages.length, recipient, showEmoji, previewUrl]);

    const scrollToMessage = (msgId) => {
        const element = messageRefs.current[msgId];
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.style.backgroundColor = 'var(--msg-highlight)';
            element.style.transition = 'background-color 1s ease';
            setTimeout(() => { element.style.backgroundColor = 'transparent'; }, 1000);
        } else {
            message.info("Tin nhắn ghim ở quá xa, vui lòng lướt tìm.");
        }
    };

    // --- HANDLERS ---
    const handleIconClick = () => fileInputRef.current.click();
    const handleFileSelect = (e) => { const file = e.target.files[0]; if(!file)return; if(file.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(file)); else setPreviewUrl(null); setSelectedFile(file); e.target.value=null; };
    const removeSelectedFile = () => { setSelectedFile(null); setPreviewUrl(null); };
    const onEmojiClick = (obj) => setInputValue(prev => prev + obj.emoji);
    const toggleTime = (index) => setShowTimeIds(prev => ({ ...prev, [index]: !prev[index] }));
    const formatTime = (iso) => { if(!iso)return""; const d=new Date(iso); return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')} • ${d.getDate()}/${d.getMonth()+1}`; };

    const handleSend = () => {
        if (!inputValue.trim() && !selectedFile) return;
        let fileData = null;
        if (selectedFile) {
            fileData = { name: selectedFile.name, type: selectedFile.type, url: URL.createObjectURL(selectedFile), fileObject: selectedFile };
        }
        sendMessage(inputValue, fileData);
        if (recipient === 'bot') {
            setIsTyping(true);
        }
        setInputValue(""); setShowEmoji(false); removeSelectedFile();
    };

    // --- ACTIONS ---
    const handleRevoke = async (msgId) => { try { await api.post(`/chat/${msgId}/revoke`); message.success("Đã thu hồi"); } catch (e) {} };
    const handlePin = async (msgId) => { try { await api.post(`/chat/${msgId}/pin`); } catch (e) {} };
    const startEdit = (msg) => { setEditingMsgId(msg.id); setEditContent(msg.content); };
    const saveEdit = async (msgId) => { try { await api.put(`/chat/${msgId}`, { content: editContent }); setEditingMsgId(null); } catch (e) {} };

    const handleForward = () => {
        if (forwardTarget.length === 0) return message.warning("Chọn người");
        forwardTarget.forEach(target => { api.post('/chat/forward', { originalMsgId: msgToForward.id, targetUsername: target }); });
        message.success("Đã chuyển tiếp"); setIsForwardModalOpen(false); setForwardTarget([]);
    };

    // 2. HÀM GỌI API THẢ TIM
    const handleReact = async (msgId, emoji) => {
        try {
            await api.post(`/chat/${msgId}/react`, { emoji });
        } catch (e) {
            message.error("Lỗi thả cảm xúc");
        }
    };

    // --- MENU 3 CHẤM ---
    const getMenuItems = (msg, isMyMessage) => {
        const items = [];
        if (msg.revoked) return { items: [] };

        // 3. THÊM THANH CHỌN EMOJI VÀO MENU
        items.push({
            key: 'react',
            label: (
                <div style={{ display: 'flex', gap: 8, padding: '4px 0', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                    {REACTIONS.map(emoji => (
                        <span
                            key={emoji}
                            style={{ fontSize: '20px', cursor: 'pointer', transition: 'transform 0.2s' }}
                            className="emoji-hover" //{ transform: scale(1.2) } vào index.css
                            onClick={() => { handleReact(msg.id, emoji); }}
                            title="Thả cảm xúc"
                        >
                            {emoji}
                        </span>
                    ))}
                </div>
            ),
        });

        items.push({ type: 'divider' });

        items.push(
            { key: 'pin', icon: <PushpinOutlined />, label: msg.pinned ? t('unpin') : t('pin'), onClick: () => handlePin(msg.id) },
            { key: 'forward', icon: <ShareAltOutlined />, label: t('forward'), onClick: () => { setMsgToForward(msg); setIsForwardModalOpen(true); } }
        );

        if (isMyMessage) {
            items.push(
                { type: 'divider' },
                { key: 'edit', icon: <EditOutlined />, label: t('edit'), onClick: () => startEdit(msg) },
                { key: 'revoke', icon: <DeleteOutlined />, label: t('revoke'), danger: true, onClick: () => handleRevoke(msg.id) }
            );
        }
        return { items };
    };

    const renderMessageContent = (msg) => {
        if (msg.revoked) return <Text type="secondary" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Tin nhắn đã bị thu hồi</Text>;

        return (
            <div>
                {/* File/Ảnh */}
                {msg.file && msg.file.type && msg.file.type.startsWith('image/') && (
                    <div style={{ marginBottom: msg.content ? '8px' : '0' }}>
                        <Image width={200} src={msg.file.url} style={{ borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                    </div>
                )}
                {/* File khác */}
                {msg.file && msg.file.type && !msg.file.type.startsWith('image/') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.1)', padding: '8px', borderRadius: '8px', marginBottom: '5px' }}>
                        <FileUnknownOutlined style={{ fontSize: '24px', color: 'var(--text-color)' }} />
                        <a href={msg.file.url} download={msg.file.name} style={{ color: 'var(--text-color)', textDecoration: 'underline', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.file.name || 'Tải xuống'}</a>
                    </div>
                )}

                {/* Text/Edit */}
                {editingMsgId === msg.id ? (
                    <div style={{ minWidth: 200 }}>
                        <Input.TextArea
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            value={editContent} onChange={e => setEditContent(e.target.value)}
                            style={{ marginBottom: 5, backgroundColor: 'var(--input-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5 }}>
                            <Button size="small" type="text" icon={<CloseOutlined style={{color: 'var(--text-color)'}} />} onClick={() => setEditingMsgId(null)} />
                            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => saveEdit(msg.id)} />
                        </div>
                    </div>
                ) : (
                    <>
                        {msg.content && <MessageContent content={msg.content} />}
                        {msg.edited && <Text type="secondary" style={{ fontSize: 10, display: 'block', textAlign: 'right', color: 'var(--text-secondary)' }}>(đã chỉnh sửa)</Text>}
                    </>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)', position: 'relative' }}>
            <ChatHeader />

            {/* --- STICKY HEADER --- */}
            {pinnedMessage && !pinnedMessage.revoked && (
                <div style={{
                    position: 'absolute', top: 64, left: 0, right: 0, zIndex: 99,
                    background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)',
                    padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer'
                }} onClick={() => scrollToMessage(pinnedMessage.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <PushpinFilled style={{ color: '#fbc531', fontSize: 18 }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <Text strong style={{ fontSize: 12, color: '#fbc531' }}>Tin nhắn được ghim</Text>
                            <Text type="secondary" ellipsis style={{ maxWidth: '300px', fontSize: 13, color: 'var(--text-secondary)' }}>
                                {pinnedMessage.content || (pinnedMessage.file ? '[File đính kèm]' : '')}
                            </Text>
                        </div>
                    </div>
                    <Button type="text" size="small" icon={<CloseOutlined style={{color: 'var(--text-secondary)'}} />} onClick={(e) => { e.stopPropagation(); handlePin(pinnedMessage.id); }} />
                </div>
            )}

            {/* --- DANH SÁCH TIN NHẮN --- */}
            <div style={{ flex: 1, padding: '20px', paddingTop: pinnedMessage ? '80px' : '20px', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {filteredMessages.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: '50px', opacity: 0.5 }}>
                        <Empty description={<span style={{color: 'var(--text-secondary)'}}>Bắt đầu trò chuyện với {displayRecipientName}</span>} />
                    </div>
                )}

                {filteredMessages.map((msg, index) => {
                    const isMyMessage = msg.senderId === currentUser;
                    const avatarSrc = getUserAvatar(msg.senderId);

                    const senderObj = users.find(u => u.username === msg.senderId);
                    const senderName = senderObj ? (senderObj.displayName || senderObj.fullName) : msg.senderId;

                    return (
                        <div key={index} ref={el => messageRefs.current[msg.id] = el} className="message-row" style={{ display: 'flex', justifyContent: isMyMessage ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: '10px' }}>
                            {!isMyMessage && <Tooltip title={msg.senderId}><Avatar src={avatarSrc} size="large" /></Tooltip>}

                            {/* Menu Trái */}
                            {!isMyMessage && !msg.revoked && (
                                <Dropdown menu={getMenuItems(msg, false)} trigger={['click']}>
                                    <Button type="text" shape="circle" icon={<MoreOutlined style={{color: 'var(--text-secondary)'}} />} size="small" style={{ opacity: 0.5, marginTop: 10 }} />
                                </Dropdown>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMyMessage ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                {!isMyMessage && currentTarget?.isGroup && (
                                    <Text strong style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px', marginBottom: '2px', display: 'block' }}>
                                        {senderName}
                                    </Text>
                                )}

                                <div onClick={() => toggleTime(index)}
                                     style={{
                                         backgroundColor: msg.revoked
                                             ? 'var(--input-bg)'
                                             : (isMyMessage ? 'var(--msg-sent-bg)' : 'var(--msg-received-bg)'),
                                         color: msg.revoked
                                             ? 'var(--text-secondary)'
                                             : (isMyMessage ? 'var(--msg-sent-text)' : 'var(--msg-received-text)'),
                                         padding: '12px 16px', borderRadius: '18px',
                                         borderBottomRightRadius: isMyMessage ? '4px' : '18px', borderBottomLeftRadius: !isMyMessage ? '4px' : '18px',
                                         boxShadow: '0 1px 2px rgba(0,0,0,0.1)', fontSize: '15px', position: 'relative', cursor: 'pointer', minWidth: '60px'
                                     }}>
                                    {msg.pinned && !msg.revoked && <PushpinFilled style={{ position: 'absolute', top: -8, right: -8, color: '#fbc531', fontSize: 14, background: 'var(--bg-color)', padding:2, borderRadius:'50%', border:'1px solid var(--border-color)' }} />}
                                    {renderMessageContent(msg)}
                                </div>

                                {/* 4. HIỂN THỊ REACTION BÊN DƯỚI BONG BÓNG */}
                                <MessageReactions
                                    reactions={msg.reactions}
                                    isMyMessage={isMyMessage}
                                />
                                {/* ---------------------------------------- */}

                                {showTimeIds[index] && <Text type="secondary" style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-secondary)' }}>{formatTime(msg.timestamp)}</Text>}
                            </div>

                            {/* Menu Phải */}
                            {isMyMessage && !msg.revoked && (
                                <Dropdown menu={getMenuItems(msg, true)} trigger={['click']}>
                                    <Button type="text" shape="circle" icon={<MoreOutlined style={{color: 'var(--text-secondary)'}} />} size="small" style={{ opacity: 0.5, marginTop: 10 }} />
                                </Dropdown>
                            )}

                            {isMyMessage && <Avatar src={avatarSrc} size="large" />}
                        </div>
                    );
                })}
                {isTyping && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        {/* Avatar của người đang chat / Bot */}
                        <Avatar src={getUserAvatar(recipient)} size="large" />

                        <div style={{
                            backgroundColor: 'var(--msg-received-bg)', // Màu nền giống tin nhắn người khác
                            padding: '10px 15px',
                            borderRadius: '18px',
                            borderBottomLeftRadius: '4px', // Bo góc nhọn giống chat bubble
                            display: 'inline-block'
                        }}>
                            <div className="typing-indicator">
                                <div className="typing-dot"></div>
                                <div className="typing-dot"></div>
                                <div className="typing-dot"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* --- INPUT AREA --- */}
            <div style={{ padding: '15px 20px', background: 'var(--bg-color)', borderTop: '1px solid var(--border-color)', position: 'relative' }}>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} accept="image/*, .doc, .docx, .xls, .xlsx, .pdf" />

                {selectedFile && (
                    <div style={{
                        position: 'absolute', top: '-70px', left: '20px',
                        background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                        padding: '10px', borderRadius: '10px', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
                        display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10
                    }}>
                        {previewUrl ? <img src={previewUrl} alt="Preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px' }} /> : <FileTextOutlined style={{ fontSize: '30px', color: 'var(--text-secondary)' }} />}
                        <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-color)' }}>{selectedFile.name}</div>
                        <Button type="text" size="small" icon={<CloseCircleFilled style={{ color: '#ff4d4f' }} />} onClick={removeSelectedFile} />
                    </div>
                )}

                {showEmoji && <div style={{ position: 'absolute', bottom: '70px', left: '20px', zIndex: 1000 }}><EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} theme="auto" /></div>}

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Button type="text" shape="circle" icon={<PaperClipOutlined style={{ fontSize: '24px', color: 'var(--text-secondary)' }} />} onClick={handleIconClick} />
                    <Button type="text" shape="circle" icon={<SmileOutlined style={{ fontSize: '24px', color: '#fbc531' }} />} onClick={() => setShowEmoji(!showEmoji)} />
                    <Input
                        value={inputValue} onChange={(e) => setInputValue(e.target.value)} onPressEnter={handleSend} onFocus={() => setShowEmoji(false)}
                        placeholder={`Nhắn tin tới ${displayRecipientName}...`} size="large"
                        style={{ borderRadius: '25px', backgroundColor: 'var(--input-bg)', border: 'none', color: 'var(--text-color)' }}
                    />
                    <Button type="text" shape="circle" icon={<SendOutlined style={{ fontSize: '24px', color: '#0084ff' }} />} onClick={handleSend} />
                </div>
            </div>

            {/* MODAL FORWARD */}
            <Modal title="Chuyển tiếp tin nhắn" open={isForwardModalOpen} onCancel={() => setIsForwardModalOpen(false)} onOk={handleForward} okText="Gửi" cancelText="Hủy">
                <Select mode="multiple" style={{ width: '100%' }} placeholder="Chọn người/nhóm để chuyển tiếp" onChange={setForwardTarget} value={forwardTarget} optionLabelProp="label">
                    {users.filter(u => u.username !== currentUser && u.username !== 'bot').map(u => (
                        <Option key={u.username} value={u.username} label={u.displayName}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar src={u.avatar} size="small" /> {u.displayName}</div>
                        </Option>
                    ))}
                </Select>
                <div style={{ marginTop: 15, padding: 10, background: 'var(--input-bg)', borderRadius: 6, borderLeft: '3px solid var(--border-color)' }}>
                    <Text type="secondary" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Nội dung:</Text>
                    <div style={{maxHeight: 100, overflowY: 'auto', color: 'var(--text-color)'}}>{msgToForward?.content || '[File đính kèm]'}</div>
                </div>
            </Modal>
        </div>
    );
};

export default ChatWindow;