import React, { useState, useRef } from 'react';
import { Card, Input, Button, message, Avatar } from 'antd';
import { FileImageOutlined, SendOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext'; // 1. Import Settings
import { getAvatarUrl } from '../../utils/common';

const { TextArea } = Input;

const CreatePost = ({ onPostCreated }) => {
    const { currentUser, currentFullName, currentAvatar } = useChat();
    const { t } = useSettings(); // 2. Lấy hàm dịch t()

    const [content, setContent] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fileType, setFileType] = useState(null);
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef(null);
    const myAvatarSrc = getAvatarUrl(currentUser, currentFullName, currentAvatar);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 50 * 1024 * 1024) {
                return message.error(t('fileTooLarge'));
            }
            setMediaFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setFileType(file.type.startsWith('video') ? 'video' : 'image');
        }
    };

    const removeMedia = () => {
        setMediaFile(null);
        setPreviewUrl(null);
        setFileType(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async () => {
        if (!content.trim() && !mediaFile) {
            return message.warning(t('emptyPostWarning'));
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('content', content);
            if (mediaFile) {
                formData.append('file', mediaFile);
            }

            const res = await api.post('/posts', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            message.success(t('postSuccess'));
            setContent('');
            removeMedia();

            if (onPostCreated) onPostCreated(res.data);

        } catch (error) {
            console.error(error);
            message.error(t('postError').replace('{{error}}', error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card
            style={{
                marginBottom: 20,
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                // SỬA MÀU NỀN VÀ VIỀN CHO DARK MODE
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)'
            }}
        >
            <div style={{ display: 'flex', gap: 12 }}>
                <Avatar src={myAvatarSrc} size="large" />
                <div style={{ flex: 1 }}>
                    <TextArea
                        rows={2}
                        placeholder={t('whatsOnYourMind').replace('{{name}}', currentFullName || currentUser)}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        style={{
                            border: 'none',
                            resize: 'none',
                            // SỬA MÀU Ô NHẬP LIỆU
                            background: 'var(--input-bg)', // Dùng màu nền input (xám/tối)
                            borderRadius: 8,
                            padding: 10,
                            color: 'var(--text-color)' // Màu chữ trắng/đen
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.ctrlKey){
                                e.preventDefault();
                                if (content.trim() || mediaFile){
                                    handleSubmit();
                                }
                            }
                        }}
                    />

                    {/* PREVIEW */}
                    {previewUrl && (
                        <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
                            {fileType === 'video' ? (
                                <video controls src={previewUrl} style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} />
                            ) : (
                                <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} />
                            )}
                            <Button
                                type="text" shape="circle"
                                icon={<CloseCircleOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />}
                                onClick={removeMedia}
                                style={{
                                    position: 'absolute', top: 5, right: 5,
                                    // Sửa nền nút xóa
                                    background: 'var(--bg-color)',
                                    borderRadius: '50%'
                                }}
                            />
                        </div>
                    )}

                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                            type="text"
                            icon={<FileImageOutlined style={{ color: '#4CAF50', fontSize: 18 }} />}
                            onClick={() => fileInputRef.current.click()}
                            // Sửa màu chữ nút chọn ảnh
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {t('photoVideo')}
                        </Button>
                        <input
                            type="file" ref={fileInputRef} style={{ display: 'none' }}
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                        />

                        <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={handleSubmit} disabled={!content && !mediaFile} shape="round">
                            {t('post')}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default CreatePost;