import React, { useEffect, useState, useRef } from 'react';
import { Typography, Popover, Button, Space } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSettings } from '../../context/SettingsContext';

const { Text } = Typography;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 60;
const SNAP_MINUTES = 15;
const SNAP_PIXELS = SNAP_MINUTES;

const TimeGrid = ({ date, events, onCreate, onEdit, onDelete, onEventDrop }) => {
    const { t } = useSettings();
    const [currentTimePosition, setCurrentTimePosition] = useState(-1);
    const [hoveredSlot, setHoveredSlot] = useState(null);
    const scrollRef = useRef(null);

    // --- DRAG STATE ---
    const [draggingEventId, setDraggingEventId] = useState(null);
    const [dragOffset, setDragOffset] = useState(0);
    const [currentDragTop, setCurrentDragTop] = useState(null);

    const [isDraggingMode, setIsDraggingMode] = useState(false);
    const [startMouseY, setStartMouseY] = useState(null);

    // 1. Logic giờ hiện tại & Scroll
    useEffect(() => {
        const updatePosition = () => {
            const now = dayjs();
            if (now.isSame(date, 'day')) {
                setCurrentTimePosition(now.hour() * 60 + now.minute());
            } else {
                setCurrentTimePosition(-1);
            }
        };
        updatePosition();
        const timer = setInterval(updatePosition, 60000);
        if (scrollRef.current && dayjs().isSame(date, 'day')) {
            const scrollPos = (dayjs().hour() * 60) - 100;
            scrollRef.current.scrollTop = scrollPos > 0 ? scrollPos : 0;
        }
        return () => clearInterval(timer);
    }, [date]);

    // 2. Drag & Drop Handlers (Giữ nguyên logic của bạn)
    const handleMouseDown = (e, event) => {
        e.stopPropagation();
        const start = dayjs(event.startTime);
        const originalTop = start.hour() * 60 + start.minute();
        const containerTop = scrollRef.current.getBoundingClientRect().top;
        const mouseTopInContainer = e.clientY - containerTop + scrollRef.current.scrollTop;

        setDragOffset(mouseTopInContainer - originalTop);
        setDraggingEventId(event.id);
        setStartMouseY(e.clientY);
        setIsDraggingMode(false);
    };

    const handleMouseMove = (e) => {
        if (!draggingEventId) return;
        if (!isDraggingMode) {
            const moveDistance = Math.abs(e.clientY - startMouseY);
            if (moveDistance < 5) return;
            setIsDraggingMode(true);
        }

        const containerTop = scrollRef.current.getBoundingClientRect().top;
        const rawY = e.clientY - containerTop + scrollRef.current.scrollTop;

        let newTop = rawY - dragOffset;
        const maxTop = 24 * 60 - 30;
        if (newTop < 0) newTop = 0;
        if (newTop > maxTop) newTop = maxTop;

        const snappedTop = Math.round(newTop / SNAP_PIXELS) * SNAP_PIXELS;
        setCurrentDragTop(snappedTop);
    };

    const handleMouseUp = () => {
        if (isDraggingMode && draggingEventId) {
            const event = events.find(e => e.id === draggingEventId);
            if (event && currentDragTop !== null) {
                const newStart = date.clone().startOf('day').add(currentDragTop, 'minute');
                const duration = dayjs(event.endTime).diff(dayjs(event.startTime), 'minute');
                const newEnd = newStart.clone().add(duration, 'minute');

                if (!newStart.isSame(dayjs(event.startTime))) {
                    onEventDrop(event, newStart, newEnd);
                }
            }
        }
        setDraggingEventId(null);
        setCurrentDragTop(null);
        setIsDraggingMode(false);
        setStartMouseY(null);
    };

    useEffect(() => {
        if (draggingEventId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingEventId, currentDragTop, isDraggingMode, startMouseY]);

    // 3. Render
    const renderEvents = () => {
        return events.map((event) => {
            const isDragging = draggingEventId === event.id && isDraggingMode;

            const start = dayjs(event.startTime);
            const end = dayjs(event.endTime);
            const durationMinutes = end.diff(start, 'minute');

            const top = isDragging && currentDragTop !== null
                ? currentDragTop
                : (start.hour() * 60 + start.minute());

            const style = {
                top: `${top}px`,
                height: `${Math.max(durationMinutes, 25)}px`,
                left: '60px',
                right: '10px',
                position: 'absolute',
                backgroundColor: event.color || 'var(--bg-color)',
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#fff',
                fontSize: '12px',
                cursor: isDragging ? 'grabbing' : 'pointer',
                boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.15)',
                zIndex: isDragging ? 100 : 10,
                opacity: isDragging ? 0.9 : 1,
                transition: isDragging ? 'none' : 'top 0.2s, height 0.2s',
                overflow: 'hidden',
                userSelect: 'none',
            };

            const content = (
                <div
                    style={style}
                    onMouseDown={(e) => handleMouseDown(e, event)}
                    className="event-block"
                    onMouseEnter={(e) => {
                        if (!isDragging) {
                            e.currentTarget.style.zIndex = 20;
                            e.currentTarget.style.transform = 'scale(1.01)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isDragging) {
                            e.currentTarget.style.zIndex = 10;
                            e.currentTarget.style.transform = 'scale(1)';
                        }
                    }}
                >
                    <div style={{ fontWeight: 600, lineHeight: 1.2 }}>
                        {event.title}
                        {isDragging && " ⏱️"}
                    </div>
                    {durationMinutes > 40 && (
                        <div style={{ fontSize: 11, opacity: 0.9 }}>
                            {isDragging
                                ? `${Math.floor(top/60)}:${(top%60).toString().padStart(2, '0')}`
                                : (event.location || start.format('HH:mm'))
                            }
                        </div>
                    )}
                </div>
            );

            if (isDragging) return <React.Fragment key={event.id}>{content}</React.Fragment>;

            const popoverContent = (
                <div style={{ width: 250 }}>
                    <div style={{display:'flex', gap: 10, alignItems:'center', marginBottom: 10}}>
                        <div style={{width: 12, height: 12, borderRadius: '50%', background: event.color}} />
                        <Text strong style={{fontSize: 16, color: 'var(--text-color)'}}>{event.title}</Text>
                    </div>
                    <Space direction="vertical" style={{ width: '100%', fontSize: 13, color: 'var(--text-secondary)' }}>
                        <div><ClockCircleOutlined /> {start.format('HH:mm')} - {end.format('HH:mm')}</div>
                        {event.location && <div><EnvironmentOutlined /> {event.location}</div>}
                    </Space>
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 15, paddingTop: 10, borderTop: '1px solid var(--border-color)'}}>
                        <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(event)}>
                            {t('editSchedule') || "Sửa"}
                        </Button>
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(event.id)}>
                            {t('deleteSchedule') || "Xóa"}
                        </Button>
                    </div>
                </div>
            );

            return (
                <Popover
                    key={event.id}
                    content={popoverContent}
                    trigger="click"
                    placement="leftTop"
                    // Override background popover
                    overlayInnerStyle={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
                >
                    {content}
                </Popover>
            );
        });
    };

    return (
        <div
            ref={scrollRef}
            style={{
                height: '700px',
                overflowY: 'auto',
                position: 'relative',
                background: 'var(--card-bg)', // Đổi màu nền theo theme
                border: '1px solid var(--border-color)',
                borderRadius: '0 0 12px 12px',
                scrollBehavior: 'smooth',
                userSelect: 'none'
            }}
        >
            {HOURS.map((hour) => (
                <div
                    key={hour}
                    onMouseEnter={() => setHoveredSlot(hour)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    onClick={() => !draggingEventId && onCreate(date.clone().hour(hour).minute(0))}
                    style={{
                        height: `${SLOT_HEIGHT}px`,
                        borderBottom: '1px solid var(--border-color)', // Viền theo theme
                        position: 'relative',
                        display: 'flex',
                        cursor: 'pointer',
                        // Hover màu nhạt theo theme (dùng biến hover hoặc màu cứng trong suốt)
                        backgroundColor: hoveredSlot === hour ? 'var(--bg-hover)' : 'transparent',
                    }}
                >
                    <div style={{
                        width: '60px', textAlign: 'right', paddingRight: '15px',
                        fontSize: '12px',
                        color: hoveredSlot === hour ? '#1890ff' : 'var(--text-secondary)', // Chữ giờ theo theme
                        transform: 'translateY(-8px)',
                    }}>
                        {hour}:00
                    </div>
                    <div style={{ flex: 1, borderLeft: '1px solid var(--border-color)' }}>
                        {hoveredSlot === hour && !draggingEventId && (
                            <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1890ff', opacity: 0.7, fontSize: 12 }}>
                                {t('addSchedule') || "+ Thêm"}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {renderEvents()}
            {currentTimePosition !== -1 && (
                <div style={{ position: 'absolute', top: `${currentTimePosition}px`, left: '60px', right: 0, borderTop: '2px solid #ff4d4f', zIndex: 20, pointerEvents: 'none' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff4d4f', position: 'absolute', top: -6, left: -5 }} />
                </div>
            )}
        </div>
    );
};

export default TimeGrid;