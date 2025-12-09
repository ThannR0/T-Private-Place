import React, { useState, useRef } from 'react';
import { Card, Input, Button, message, Avatar } from 'antd';
import { FileImageOutlined, SendOutlined, CloseCircleOutlined, VideoCameraOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';
import { getAvatarUrl } from '../../utils/common';

const { TextArea } = Input;

const CreatePost = ({ onPostCreated }) => {
    const { currentUser, currentFullName, currentAvatar } = useChat();
    const [content, setContent] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fileType, setFileType] = useState(null); // 'image' hoặc 'video'
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef(null);
    const myAvatarSrc = getAvatarUrl(currentUser, currentFullName, currentAvatar);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Kiểm tra kích thước (ví dụ giới hạn 50MB)
            if (file.size > 50 * 1024 * 1024) {
                return message.error("File quá lớn! Vui lòng chọn dưới 50MB.");
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
            return message.warning("Hãy viết gì đó hoặc chọn file!");
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

            message.success("Đăng bài thành công!");
            setContent('');
            removeMedia();

            if (onPostCreated) onPostCreated(res.data);

        } catch (error) {
            console.error(error);
            message.error("Đăng bài thất bại: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card style={{ marginBottom: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', gap: 12 }}>
                <Avatar src={myAvatarSrc} size="large" />
                <div style={{ flex: 1 }}>
                    <TextArea
                        rows={2}
                        placeholder={`Bạn đang nghĩ gì thế, ${currentFullName || currentUser}?`}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        style={{ border: 'none', resize: 'none', background: '#f0f2f5', borderRadius: 8, padding: 10 }}
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
                                icon={<CloseCircleOutlined style={{ fontSize: 20, color: '#ff4d4f', background: '#fff', borderRadius: '50%' }} />}
                                onClick={removeMedia}
                                style={{ position: 'absolute', top: 5, right: 5 }}
                            />
                        </div>
                    )}

                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                            type="text"
                            icon={<FileImageOutlined style={{ color: '#4CAF50', fontSize: 18 }} />}
                            onClick={() => fileInputRef.current.click()}
                        >
                            Ảnh / Video
                        </Button>
                        <input
                            type="file" ref={fileInputRef} style={{ display: 'none' }}
                            accept="image/*,video/*" // Cho phép cả 2
                            onChange={handleFileSelect}
                        />

                        <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={handleSubmit} disabled={!content && !mediaFile} shape="round">
                            Đăng bài
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default CreatePost;