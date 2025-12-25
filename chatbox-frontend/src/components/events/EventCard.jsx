import React from 'react';
import { Card, Button, Typography, Tag, Space, Avatar, Tooltip } from 'antd';
import {
    CalendarOutlined, EnvironmentOutlined, UsergroupAddOutlined,
    CheckCircleOutlined, DeleteOutlined, EditOutlined, CrownOutlined,
    CompassFilled, TeamOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const EventCard = ({ event, currentUser, onJoin, onDelete, onEdit }) => {
    const { t } = useSettings();
    const navigate = useNavigate();

    // Xử lý ngày tháng
    const dateObj = dayjs(event.startTime);
    const day = dateObj.format('DD');
    const month = dateObj.format('MMM');
    const time = dateObj.format('HH:mm');

    // Check Logic
    const isOwner = currentUser && event.creatorUsername && (event.creatorUsername === currentUser);
    const isFull = event.maxParticipants && event.participantCount >= event.maxParticipants;

    // Hàm mở Map
    const openGoogleMaps = (e) => {
        e.stopPropagation();
        const query = (event.latitude && event.longitude)
            ? `${event.latitude},${event.longitude}`
            : encodeURIComponent(event.address);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    // --- ACTION BAR ---
    const renderPrimaryAction = () => {
        if (isOwner) {
            return (
                <Button type="text" icon={<EditOutlined style={{color: '#faad14'}} />} onClick={(e) => {e.stopPropagation(); onEdit(event)}}>
                    {t('edit') || "Chỉnh sửa"}
                </Button>
            );
        }

        if (event.isJoined) {
            return (
                <Button
                    type="text"
                    danger
                    icon={<UsergroupAddOutlined />}
                    onClick={(e) => { e.stopPropagation(); onJoin(event.id); }}
                >
                    {t('cancelJoin') || "Hủy tham gia"}
                </Button>
            );
        }

        if (isFull) {
            return (
                <Button type="text" disabled style={{color: 'var(--text-secondary)'}}>
                    🚫 {t('fullSlot') || "Hết chỗ"}
                </Button>
            );
        }

        return (
            <Button
                type="text"
                style={{color: '#1890ff', fontWeight: 600}}
                icon={<CheckCircleOutlined />}
                onClick={(e) => { e.stopPropagation(); onJoin(event.id); }}
            >
                {t('join') || "Tham gia"}
            </Button>
        );
    };

    return (
        <Card
            hoverable
            onClick={() => navigate(`/events/${event.id}`)}
            cover={
                <div style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                    <img alt="cover" src={event.imageUrl || "https://via.placeholder.com/400x200"} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} className="hover-zoom" />

                    {/* Badge Ngày tháng (Giữ nguyên vì nằm trên ảnh) */}
                    <div style={{
                        position: 'absolute', top: 12, left: 12,
                        background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(4px)',
                        borderRadius: 10, padding: '4px 10px',
                        textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                        minWidth: 50
                    }}>
                        <div style={{ fontSize: 18, fontWeight: '800', color: '#ff4d4f', lineHeight: 1 }}>{day}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#333' }}>{month}</div>
                    </div>

                    {/* Badge Host */}
                    {isOwner && (
                        <Tag color="#f50" style={{ position: 'absolute', top: 12, right: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                            <CrownOutlined /> {t('youAreHost') || "Bạn là BTC"}
                        </Tag>
                    )}
                </div>
            }
            actions={[
                <Tooltip title={t('mapBtn') || "Xem bản đồ"}>
                    <Button type="text" icon={<CompassFilled style={{color: '#52c41a', fontSize: 20}} />} onClick={openGoogleMaps} />
                </Tooltip>,
                renderPrimaryAction()
            ]}
            style={{
                borderRadius: 16,
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-color)',      // Sáng: Trắng / Tối: Xám Đậm
                border: '1px solid var(--border-color)', // Viền tự đổi màu
                backgroundColor: 'var(--bg-color)'
            }}
            styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', position: 'relative' } }}
        >
            {isOwner && (
                <Tooltip title={t('delete') || "Xóa sự kiện"}>
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={(e) => {e.stopPropagation(); onDelete(event.id)}}
                        style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}
                    />
                </Tooltip>
            )}

            {/* Tiêu đề: Màu chữ tự động đổi */}
            <Title level={5} ellipsis={{rows: 2}} style={{ margin: '0 25px 12px 0', color: 'var(--text-color)', minHeight: 44, fontSize: 16 }}>
                {event.title}
            </Title>

            {/* Thông tin chi tiết */}
            <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 15, flex: 1}}>
                <Space align="center" style={{color: 'var(--text-secondary)'}}>
                    <ClockCircleOutlined style={{color: '#1890ff', fontSize: 16}}/>
                    <Text style={{fontSize: 13, color: 'var(--text-color)'}}>{t('eventTime')}: <strong>{time}</strong></Text>
                </Space>

                <Space align="start" style={{color: 'var(--text-secondary)'}}>
                    <EnvironmentOutlined style={{color: '#ff4d4f', fontSize: 16, marginTop: 2}}/>
                    <Text ellipsis style={{maxWidth: 220, fontSize: 13, color: 'var(--text-secondary)'}}>{event.locationName}</Text>
                </Space>

                <Space align="center" style={{color: 'var(--text-secondary)'}}>
                    <TeamOutlined style={{color: '#52c41a', fontSize: 16}}/>
                    <Text style={{fontSize: 13, color: 'var(--text-secondary)'}}>
                        {t('participants')}: <span style={{color: isFull ? '#ff4d4f' : 'var(--text-color)'}}><strong>{event.participantCount}</strong> / {event.maxParticipants}</span>
                    </Text>
                </Space>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar src={event.creatorAvatar} size="small" />
                <div style={{display:'flex', flexDirection:'column', lineHeight: 1.2}}>
                    <Text style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('organizer')}</Text>
                    <Text strong style={{ fontSize: 12, color: 'var(--text-color)' }} ellipsis>{event.creatorName}</Text>
                </div>
            </div>
        </Card>
    );
};

export default EventCard;