import React, { useState, useRef } from 'react';
import { Card, Input, Button, message, Avatar, Tooltip, Modal, Radio, Space, Typography, Spin, Divider, Popover, Image } from 'antd';
import {
    FileImageOutlined, SendOutlined, CloseCircleOutlined, RobotOutlined,
    LoadingOutlined, SmileOutlined, BoldOutlined, ItalicOutlined, StrikethroughOutlined, BgColorsOutlined,
} from '@ant-design/icons';
import EmojiPicker from 'emoji-picker-react';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';
import { useSettings } from '../../context/SettingsContext';
import { getAvatarUrl } from '../../utils/common';

const { TextArea } = Input;
const { Text } = Typography;

const POST_THEMES = [
    { id: 'default', style: { background: 'transparent', color: 'var(--text-color)' }, icon: 'fa-pen' },

    // 🌊 Nature & Mood
    { id: 'ocean',   style: { background: 'linear-gradient(to right, #00c6ff, #0072ff)', color: '#fff' }, icon: 'fa-water' },
    { id: 'sunset',  style: { background: 'linear-gradient(to right, #f12711, #f5af19)', color: '#fff' }, icon: 'fa-sun' },
    { id: 'love',    style: { background: 'linear-gradient(to right, #fc466b, #3f5efb)', color: '#fff' }, icon: 'fa-heart' },
    { id: 'forest',  style: { background: 'linear-gradient(to right, #11998e, #38ef7d)', color: '#fff' }, icon: 'fa-tree' },
    { id: 'dark',    style: { background: 'linear-gradient(to right, #232526, #414345)', color: '#fff' }, icon: 'fa-moon' },
    { id: 'gold',    style: { background: 'linear-gradient(to right, #CAC531, #F3F9A7)', color: '#333' }, icon: 'fa-crown' },

    // 📘 Social Media Style
    { id: 'facebook', style: { background: 'linear-gradient(to right, #1877F2, #42A5F5)', color: '#fff' }, icon: 'fa-facebook' },
    { id: 'instagram', style: { background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)', color: '#fff' }, icon: 'fa-instagram' },
    { id: 'messenger', style: { background: 'linear-gradient(to right, #00B2FF, #006AFF)', color: '#fff' }, icon: 'fa-facebook-messenger' },
    { id: 'twitter', style: { background: 'linear-gradient(to right, #1DA1F2, #0d8ddb)', color: '#fff' }, icon: 'fa-twitter' },
    { id: 'tiktok', style: { background: 'linear-gradient(to right, #000000, #25F4EE, #FE2C55)', color: '#fff' }, icon: 'fa-music' },

    // 💎 Modern UI
    { id: 'neon', style: { background: 'linear-gradient(to right, #12c2e9, #c471ed, #f64f59)', color: '#fff' }, icon: 'fa-bolt' }
];

// --- HÀM HELPER: CHUYỂN ĐỔI FONT UNICODE (ĐÃ SỬA LỖI LOGIC) ---
const textConverter = {
    // 1. IN ĐẬM (Bold)
    toBold: (text) => text.split('').map(char => {
        const n = char.charCodeAt(0);
        // A-Z (Offset: 119743)
        if (n >= 65 && n <= 90) return String.fromCodePoint(n + 119743);
        // a-z (Offset: 119737)
        if (n >= 97 && n <= 122) return String.fromCodePoint(n + 119737);
        // 0-9 (Offset: 120734)
        if (n >= 48 && n <= 57) return String.fromCodePoint(n + 120734);
        return char; // Ký tự khác giữ nguyên
    }).join(''),

    // 2. IN NGHIÊNG (Italic)
    toItalic: (text) => text.split('').map(char => {
        const n = char.charCodeAt(0);
        // A-Z (Offset: 119795)
        if (n >= 65 && n <= 90) return String.fromCodePoint(n + 119795);
        // a-z (Offset: 119789)
        if (n >= 97 && n <= 122) return String.fromCodePoint(n + 119789);
        return char;
    }).join(''),

    // 3. GẠCH NGANG (Strike) - Fix lỗi hiển thị ??
    toStrike: (text) => text.split('').map(char => char + '\u0336').join('')
};

const CreatePost = ({ onPostCreated }) => {
    const { currentUser, currentFullName, currentAvatar } = useChat();
    const { t } = useSettings(); // Lấy hàm dịch

    // --- STATE ---
    const [content, setContent] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [fileType, setFileType] = useState(null);
    const [loading, setLoading] = useState(false);

    // State Emoji & AI
    const [showEmoji, setShowEmoji] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiTone, setAiTone] = useState('funny');
    const [customPrompt, setCustomPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const fileInputRef = useRef(null);
    const textAreaRef = useRef(null);
    const myAvatarSrc = getAvatarUrl(currentUser, currentFullName, currentAvatar);

    const [selectedTheme, setSelectedTheme] = useState('default');
    const [showThemePicker, setShowThemePicker] = useState(false);

    // (File & Submit) ---
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 50 * 1024 * 1024) return message.error(t('fileTooLarge'));
            setMediaFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setFileType(file.type.startsWith('video') ? 'video' : 'image');
        }
    };

    const removeMedia = () => {
        setMediaFile(null); setPreviewUrl(null); setFileType(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSelectTheme = (themeId) => {
        setSelectedTheme(themeId);
        // Nếu chọn màu -> Phải bỏ ảnh (Facebook logic)
        if (themeId !== 'default') {
            removeMedia();
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() && !mediaFile) return message.warning(t('emptyPostWarning'));
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('content', content);

            formData.append('backgroundTheme', selectedTheme);
            if (mediaFile) formData.append('file', mediaFile);

            const res = await api.post('/posts', formData);
            message.success(t('postSuccess'));
            setContent(''); removeMedia();
            if (onPostCreated) onPostCreated(res.data);
        } catch (error) {
            message.error(t('postError').replace('{{error}}', error.response?.data?.message || error.message));
        } finally { setLoading(false); }
    };

    // --- LOGIC TEXT FORMATTING (ĐÃ SỬA) ---
    const applyFormat = (type) => {
        // Lấy đối tượng input thực sự từ Antd TextArea
        const textarea = textAreaRef.current?.resizableTextArea?.textArea;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);

        if (!selectedText) return message.info(t('fmtWarn')); // Dùng t()

        let formattedText = selectedText;
        if (type === 'bold') formattedText = textConverter.toBold(selectedText);
        else if (type === 'italic') formattedText = textConverter.toItalic(selectedText);
        else if (type === 'strike') formattedText = textConverter.toStrike(selectedText);

        const newContent = content.substring(0, start) + formattedText + content.substring(end);
        setContent(newContent);
    };

    const onEmojiClick = (emojiObj) => {
        setContent(prev => prev + emojiObj.emoji);
        setShowEmoji(false);
    };

    // --- LOGIC AI (Giữ nguyên) ---
    const handleAIGenerate = async () => {
        setIsGenerating(true);
        try {
            let finalPrompt = "";
            const tonePrompts = {
                funny: t('promptFunny'),
                serious: t('promptSerious'),
                professional: t('promptProfessional'),
                custom: customPrompt
            };
            finalPrompt = tonePrompts[aiTone];

            if (aiTone === 'custom' && !finalPrompt.trim()) {
                message.warning(t('msgAIEmpty'));
                setIsGenerating(false);
                return;
            }

            // Gọi API (Đã fix đường dẫn)
            const res = await api.post('/ai/generate', { prompt: finalPrompt, tone: aiTone });

            if (res.data && res.data.content) {
                setContent(res.data.content);
                message.success(t('msgAISuccess'));
                setIsAIModalOpen(false);
                setCustomPrompt('');
            }
        } catch (error) {
            console.error("AI Error:", error);
            message.error(t('msgAIError'));
        } finally { setIsGenerating(false); }
    };

    // Lấy style hiện tại
    const currentThemeStyle = POST_THEMES.find(t => t.id === selectedTheme)?.style || POST_THEMES[0].style;
    const isStyled = selectedTheme !== 'default';

    // --- MODAL AI UI ---
    const renderAIModal = () => (
        <Modal
            title={<Space><RobotOutlined style={{ color: '#1890ff', fontSize: 20 }} /> <span style={{ fontSize: 16 }}>{t('aiTitle')}</span></Space>}
            open={isAIModalOpen}
            onCancel={() => !isGenerating && setIsAIModalOpen(false)}
            footer={null} centered width={500}
            styles={{ body: { padding: '20px 0 0 0' } }}
        >
            <div>
                {isGenerating ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} />
                        <div style={{ marginTop: 20, fontSize: 16, color: 'var(--text-color)', fontWeight: 500 }}>{t('aiGenerating')}</div>
                        <div style={{ marginTop: 5, color: 'var(--text-secondary)', fontSize: 13 }}>{t('aiWait')}</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 10, color: 'var(--text-color)' }}>{t('aiSelectStyle')}</Text>
                            <Radio.Group onChange={(e) => setAiTone(e.target.value)} value={aiTone} style={{ width: '100%' }}>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <RadioCard value="funny" icon="🤣" label={t('styleFunny')} desc={t('descFunny')} />
                                    <RadioCard value="serious" icon="🤔" label={t('styleSerious')} desc={t('descSerious')} />
                                    <RadioCard value="professional" icon="💼" label={t('styleProfessional')} desc={t('descProfessional')} />
                                    <RadioCard value="custom" icon="✨" label={t('styleCustom')} desc={t('descCustom')} />
                                </Space>
                            </Radio.Group>
                        </div>
                        {aiTone === 'custom' && (
                            <div>
                                <Text strong style={{ color: 'var(--text-color)' }}>{t('customLabel')}</Text>
                                <TextArea rows={3} placeholder={t('customPlaceholder')} value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} style={{ marginTop: 8, background: 'var(--input-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }} />
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                            <Button onClick={() => setIsAIModalOpen(false)}>{t('cancel')}</Button>
                            <Button type="primary" icon={<RobotOutlined />} onClick={handleAIGenerate} size="large" style={{ background: 'linear-gradient(90deg, #1890ff, #722ed1)', border: 'none' }}>{t('btnGenerate')}</Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );

    return (
        <>
            <Card
                style={{
                    marginBottom: 20, borderRadius: 16,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    background: 'var(--bg-color)', border: '1px solid var(--border-color)'
                }}
                styles={{ body: { padding: '16px' } }}
            >
                <div style={{ display: 'flex', gap: 15 }}>
                    <Avatar src={myAvatarSrc} size={48} style={{ border: '1px solid var(--border-color)' }} />

                    <div style={{ flex: 1 }}>
                        <div style={{ position: 'relative' }}>
                            <TextArea
                                ref={textAreaRef}
                                rows={isStyled ? 6 : 3} // Nếu có màu thì ô to hơn
                                placeholder={t('whatsOnYourMind').replace('{{name}}', currentFullName || currentUser)}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                style={{
                                    border: 'none', resize: 'none',
                                    padding: isStyled ? '40px 20px' : '5px 0',
                                    minHeight: '80px',
                                    borderRadius: '8px',
                                    // Áp dụng Style từ Theme
                                    ...currentThemeStyle,
                                    fontSize: isStyled ? '22px' : '16px', // Chữ to nếu có nền
                                    fontWeight: isStyled ? 'bold' : 'normal',
                                    textAlign: isStyled ? 'center' : 'left',
                                    lineHeight: isStyled ? '1.4' : '1.5',
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.ctrlKey) {
                                        e.preventDefault();
                                        if (content.trim() || mediaFile) handleSubmit();
                                    }
                                }}
                            />

                            {/* Nút đóng Theme (X) nằm góc phải nếu đang chọn màu */}
                            {isStyled && (
                                <Button
                                    shape="circle" size="small" icon={<CloseCircleOutlined />}
                                    onClick={() => handleSelectTheme('default')}
                                    style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                                />
                            )}
                        </div>

                        {/* Theme Picker Area (Hiện ra khi bấm nút) */}
                        {showThemePicker && (
                            <div style={{ display: 'flex', gap: 8, padding: '10px 0', overflowX: 'auto' }}>
                                <Tooltip title="Mặc định">
                                    <div
                                        onClick={() => handleSelectTheme('default')}
                                        style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <CloseCircleOutlined style={{fontSize: 12, color: 'var(--text-secondary)'}} />
                                    </div>
                                </Tooltip>
                                {POST_THEMES.filter(t => t.id !== 'default').map(theme => (
                                    <div
                                        key={theme.id}
                                        onClick={() => handleSelectTheme(theme.id)}
                                        style={{
                                            minWidth: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                                            ...theme.style,
                                            border: selectedTheme === theme.id ? '2px solid var(--text-color)' : 'none',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {previewUrl && (
                            <div style={{ marginTop: 10, position: 'relative', display: 'inline-block', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                {fileType === 'video' ? <video controls src={previewUrl} style={{ maxWidth: '100%', maxHeight: 300, display: 'block' }} /> : <Image src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 300, display: 'block' }} />}
                                <Button type="text" shape="circle" icon={<CloseCircleOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />} onClick={removeMedia} style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(255,255,255,0.8)' }} />
                            </div>
                        )}

                        <Divider style={{ margin: '8px 0', borderColor: 'var(--border-color)' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                {/* Nút Ảnh */}
                                <Tooltip title={t('photoVideo')}>
                                    <Button
                                        type="text" icon={<FileImageOutlined style={{ color: '#4CAF50', fontSize: 20 }} />}
                                        onClick={() => fileInputRef.current.click()}
                                        disabled={isStyled} // Không cho chọn ảnh nếu đang dùng Theme
                                        style={{ color: isStyled ? 'var(--text-secondary)' : 'var(--text-color)', opacity: isStyled ? 0.5 : 1 }}
                                    />
                                </Tooltip>

                                {/* Nút Theme (MỚI) */}
                                <Tooltip title={t('bgTheme')}>
                                    <Button
                                        type="text"
                                        icon={<BgColorsOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />}
                                        onClick={() => setShowThemePicker(!showThemePicker)}
                                        style={{ color: 'var(--text-secondary)' }}
                                    />
                                </Tooltip>

                                {/* Nút AI */}
                                <Tooltip title={t('aiTooltip')}>
                                    <Button type="text" icon={<RobotOutlined style={{ color: '#722ed1', fontSize: 20 }} />} onClick={() => setIsAIModalOpen(true)} style={{ color: 'var(--text-secondary)' }} />
                                </Tooltip>

                                <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 5px' }}></div>

                                {/* Emoji & Format (Giữ nguyên) */}
                                <Popover content={<EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} theme="auto" />} trigger="click" open={showEmoji} onOpenChange={setShowEmoji} placement="bottom">
                                    <Tooltip title={t('fmtEmoji')}><Button type="text" icon={<SmileOutlined style={{fontSize: 20, color: '#faad14'}} />} style={{ color: 'var(--text-secondary)' }} /></Tooltip>
                                </Popover>
                                <Tooltip title={t('fmtBold')}><Button type="text" icon={<BoldOutlined />} onClick={() => applyFormat('bold')} style={{ color: 'var(--text-secondary)' }} /></Tooltip>
                                <Tooltip title={t('fmtItalic')}><Button type="text" icon={<ItalicOutlined />} onClick={() => applyFormat('italic')} style={{ color: 'var(--text-secondary)' }} /></Tooltip>
                                <Tooltip title={t('fmtStrike')}><Button type="text" icon={<StrikethroughOutlined />} onClick={() => applyFormat('strike')} style={{ color: 'var(--text-secondary)' }} /></Tooltip>
                            </div>

                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,video/*" onChange={handleFileSelect} />

                            <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={handleSubmit} disabled={!content.trim() && !mediaFile} shape="round" style={{ padding: '0 25px', fontWeight: 600 }}>
                                {t('post')}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {renderAIModal()}
        </>
    );
};

const RadioCard = ({ value, icon, label, desc }) => (
    <Radio value={value} style={{ width: '100%', marginBottom: 8 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 8 }}>
            <span style={{ fontSize: 24, marginRight: 12 }}>{icon}</span>
            <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-color)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
            </div>
        </div>
    </Radio>
);

export default CreatePost;