import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Empty, Avatar, Typography, Tooltip, Image } from 'antd';
import {
    SendOutlined,
    SmileOutlined,
    PaperClipOutlined,
    CloseCircleFilled,
    FileTextOutlined,
    FileExcelOutlined,
    FileUnknownOutlined
} from '@ant-design/icons';
import EmojiPicker from 'emoji-picker-react';
import { useChat } from '../../context/ChatContext';
import ChatHeader from './ChatHeader';

const { Text } = Typography;

const ChatWindow = () => {
    const { messages, sendMessage, recipient, currentUser, getUserAvatar, users } = useChat();
    const [inputValue, setInputValue] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const [showTimeIds, setShowTimeIds] = useState({});

    // --- STATE CHO FILE ---
    const [selectedFile, setSelectedFile] = useState(null); // Lưu file đang chọn
    const [previewUrl, setPreviewUrl] = useState(null); // Lưu URL ảnh preview
    const fileInputRef = useRef(null); // Ref để kích hoạt input file ẩn
    // ----------------------

    const messagesEndRef = useRef(null);

    const currentTarget = users.find(u => u.username === recipient);
    const displayRecipientName = currentTarget
        ? (currentTarget.displayName || currentTarget.fullName || currentTarget.username)
        : recipient;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => { scrollToBottom(); }, [messages, recipient, showEmoji, previewUrl]);

    // --- XỬ LÝ CHỌN FILE ---
    const handleIconClick = () => {
        fileInputRef.current.click(); // Kích hoạt input file ẩn
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Tạo URL preview nếu là ảnh
        if (file.type.startsWith('image/')) {
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        } else {
            setPreviewUrl(null);
        }
        setSelectedFile(file);
        e.target.value = null; // Reset input để chọn lại file giống nhau nếu muốn
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
    };
    // -----------------------

    const handleSend = () => {
        // Chỉ gửi nếu có text HOẶC có file
        if (!inputValue.trim() && !selectedFile) return;

        // Gửi tin nhắn kèm thông tin file
        // Lưu ý: Ở môi trường thực tế, bạn cần upload file lên server trước để lấy URL,
        // hoặc gửi file dạng FormData xuống backend.
        // Ở đây Coach giả lập bằng cách tạo URL local để hiển thị ngay.

        let fileData = null;
        if (selectedFile) {
            fileData = {
                name: selectedFile.name,
                type: selectedFile.type,
                // Trong thực tế, đây sẽ là URL từ server trả về (ví dụ: AWS S3, Cloudinary)
                url: URL.createObjectURL(selectedFile),
                fileObject: selectedFile // Giữ object gốc để gửi xuống Backend xử lý AI
            };
        }

        sendMessage(inputValue, fileData); // Hàm sendMessage cần nhận thêm tham số này

        setInputValue("");
        setShowEmoji(false);
        removeSelectedFile(); // Xóa file sau khi gửi
    };

    const onEmojiClick = (emojiObject) => {
        setInputValue(prev => prev + emojiObject.emoji);
    };

    const toggleTime = (index) => {
        setShowTimeIds(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const formatTime = (isoString) => {
        if (!isoString) return "Vừa xong";
        const date = new Date(isoString);
        return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')} • ${date.getDate()}/${date.getMonth() + 1}`;
    };

    // Hàm render nội dung tin nhắn (Text + File)
    const renderMessageContent = (msg) => {
        return (
            <div>
                {/* 1. Hiển thị Ảnh nếu có */}
                {msg.file && msg.file.type.startsWith('image/') && (
                    <div style={{ marginBottom: msg.content ? '8px' : '0' }}>
                        <Image
                            width={200}
                            src={msg.file.url}
                            style={{ borderRadius: '8px' }}
                        />
                    </div>
                )}

                {/* 2. Hiển thị File (Word/Excel...) nếu có */}
                {msg.file && !msg.file.type.startsWith('image/') && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(0,0,0,0.05)', padding: '8px', borderRadius: '8px', marginBottom: msg.content ? '8px' : '0'
                    }}>
                        {msg.file.name.endsWith('.xls') || msg.file.name.endsWith('.xlsx') ?
                            <FileExcelOutlined style={{ fontSize: '24px', color: '#217346' }} /> :
                            msg.file.name.endsWith('.doc') || msg.file.name.endsWith('.docx') ?
                                <FileTextOutlined style={{ fontSize: '24px', color: '#2b579a' }} /> :
                                <FileUnknownOutlined style={{ fontSize: '24px', color: '#666' }} />
                        }
                        <a href={msg.file.url} download={msg.file.name} style={{ color: 'inherit', textDecoration: 'underline', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {msg.file.name}
                        </a>
                    </div>
                )}

                {/* 3. Hiển thị Text */}
                {msg.content && <div>{msg.content}</div>}
            </div>
        );
    }

    const filteredMessages = messages.filter(msg => {
        if (currentTarget && currentTarget.isGroup) {
            return msg.recipientId == currentTarget.realGroupId;
        } else {
            return (msg.senderId === currentUser && msg.recipientId === recipient) ||
                (msg.senderId === recipient && msg.recipientId === currentUser);
        }
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
            <ChatHeader />

            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#eef2f5', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {filteredMessages.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: '50px', opacity: 0.5 }}>
                        <Empty description={`Bắt đầu trò chuyện với ${displayRecipientName}`} />
                    </div>
                )}

                {filteredMessages.map((msg, index) => {
                    const isMyMessage = msg.senderId === currentUser;
                    const avatarSrc = getUserAvatar(msg.senderId);

                    return (
                        <div key={index} style={{
                            display: 'flex',
                            justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                            alignItems: 'flex-end',
                            gap: '10px'
                        }}>
                            {!isMyMessage && (
                                <Tooltip title={msg.senderId}>
                                    <Avatar src={avatarSrc} size="large" />
                                </Tooltip>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMyMessage ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                {!isMyMessage && currentTarget?.isGroup && (
                                    <Text strong style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>{msg.senderId}</Text>
                                )}

                                <div
                                    onClick={() => toggleTime(index)}
                                    style={{
                                        backgroundColor: isMyMessage ? '#0084ff' : '#fff',
                                        color: isMyMessage ? '#fff' : '#000',
                                        padding: '12px 16px',
                                        borderRadius: '18px',
                                        borderBottomRightRadius: isMyMessage ? '4px' : '18px',
                                        borderBottomLeftRadius: !isMyMessage ? '4px' : '18px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                        fontSize: '15px',
                                        cursor: 'pointer'
                                    }}>
                                    {renderMessageContent(msg)}
                                </div>

                                {showTimeIds[index] && (
                                    <Text type="secondary" style={{ fontSize: '11px', marginTop: '4px' }}>
                                        {formatTime(msg.timestamp)}
                                    </Text>
                                )}
                            </div>

                            {isMyMessage && <Avatar src={avatarSrc} size="large" />}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* KHU VỰC NHẬP LIỆU */}
            <div style={{
                padding: '15px 20px',
                background: '#fff',
                borderTop: '1px solid #eee',
                position: 'relative'
            }}>
                {/* Input File Ẩn */}
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                    accept="image/*, .doc, .docx, .xls, .xlsx, .pdf" // Cho phép ảnh, word, excel, pdf
                />

                {/* Vùng hiển thị file đang chọn (Preview) */}
                {selectedFile && (
                    <div style={{
                        position: 'absolute', top: '-70px', left: '20px',
                        background: '#fff', padding: '10px', borderRadius: '10px',
                        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10
                    }}>
                        {previewUrl ? (
                            <img src={previewUrl} alt="Preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px' }} />
                        ) : (
                            <FileTextOutlined style={{ fontSize: '30px', color: '#555' }} />
                        )}

                        <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }}>
                            {selectedFile.name}
                        </div>

                        <Button
                            type="text" size="small"
                            icon={<CloseCircleFilled style={{ color: '#ff4d4f' }} />}
                            onClick={removeSelectedFile}
                        />
                    </div>
                )}

                {showEmoji && (
                    <div style={{ position: 'absolute', bottom: '70px', left: '20px', zIndex: 1000 }}>
                        <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} previewConfig={{ showPreview: false }} />
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* Nút đính kèm File */}
                    <Button
                        type="text" shape="circle"
                        icon={<PaperClipOutlined style={{ fontSize: '24px', color: '#666' }} />}
                        onClick={handleIconClick}
                    />

                    <Button
                        type="text" shape="circle"
                        icon={<SmileOutlined style={{ fontSize: '24px', color: '#fbc531' }} />}
                        onClick={() => setShowEmoji(!showEmoji)}
                    />

                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onPressEnter={handleSend}
                        onFocus={() => setShowEmoji(false)}
                        placeholder={`Nhắn tin tới ${displayRecipientName}...`}
                        size="large"
                        style={{ borderRadius: '25px', backgroundColor: '#f0f2f5', border: 'none' }}
                    />

                    <Button
                        type="text" shape="circle"
                        icon={<SendOutlined style={{ fontSize: '24px', color: '#0084ff' }} />}
                        onClick={handleSend}
                    />
                </div>
            </div>
        </div>
    );
};

export default ChatWindow;