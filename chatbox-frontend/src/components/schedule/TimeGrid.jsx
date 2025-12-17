import React, { useEffect, useState, useRef } from 'react';
import { Typography, Popover, Button, Space } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 60;
const SNAP_MINUTES = 15;
const SNAP_PIXELS = SNAP_MINUTES;

const TimeGrid = ({ date, events, onCreate, onEdit, onDelete, onEventDrop }) => {
    const [currentTimePosition, setCurrentTimePosition] = useState(-1);
    const [hoveredSlot, setHoveredSlot] = useState(null);
    const scrollRef = useRef(null);

    // --- DRAG STATE ---
    const [draggingEventId, setDraggingEventId] = useState(null);
    const [dragOffset, setDragOffset] = useState(0);
    const [currentDragTop, setCurrentDragTop] = useState(null);

    // 🟢 THÊM STATE MỚI: Để phân biệt Click và Drag
    const [isDraggingMode, setIsDraggingMode] = useState(false); // Chỉ bật khi đã di chuyển chuột đủ xa
    const [startMouseY, setStartMouseY] = useState(null); // Lưu vị trí chuột lúc bắt đầu nhấn

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

    // 2. Xử lý Drag & Drop (LOGIC ĐÃ CẢI TIẾN)
    const handleMouseDown = (e, event) => {
        // Chỉ ngăn sự kiện nổi bọt, KHÔNG ngăn hành vi mặc định (để Popover vẫn hoạt động nếu là click)
        e.stopPropagation();

        const start = dayjs(event.startTime);
        const originalTop = start.hour() * 60 + start.minute();
        const containerTop = scrollRef.current.getBoundingClientRect().top;
        const mouseTopInContainer = e.clientY - containerTop + scrollRef.current.scrollTop;

        // Lưu các thông số ban đầu nhưng CHƯA kích hoạt chế độ kéo ngay
        setDragOffset(mouseTopInContainer - originalTop);
        setDraggingEventId(event.id);
        setStartMouseY(e.clientY); // Lưu tọa độ Y màn hình lúc nhấn
        setIsDraggingMode(false); // Mặc định là chưa kéo
    };

    const handleMouseMove = (e) => {
        if (!draggingEventId) return;

        // 🟢 LOGIC MỚI: Chỉ khi di chuyển chuột > 5px mới tính là KÉO
        if (!isDraggingMode) {
            const moveDistance = Math.abs(e.clientY - startMouseY);
            if (moveDistance < 5) return; // Chưa đủ ngưỡng -> Vẫn coi là Click -> Thoát

            // Nếu đã vượt ngưỡng -> Kích hoạt chế độ Kéo
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
            // Chỉ thực hiện Drop khi ĐANG Ở CHẾ ĐỘ KÉO
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

        // Reset toàn bộ state
        setDraggingEventId(null);
        setCurrentDragTop(null);
        setIsDraggingMode(false);
        setStartMouseY(null);
    };

    // Lắng nghe sự kiện toàn cục
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
    }, [draggingEventId, currentDragTop, isDraggingMode, startMouseY]); // Nhớ thêm dependency

    // 3. Render
    const renderEvents = () => {
        return events.map((event) => {
            const isDragging = draggingEventId === event.id && isDraggingMode; // Chỉ coi là đang kéo khi isDraggingMode = true

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
                backgroundColor: event.color || '#3788d8',
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#fff',
                fontSize: '12px',
                // 🟢 SỬA CURSOR: Khi đang kéo thì nắm tay, còn bình thường thì trỏ tay
                cursor: isDragging ? 'grabbing' : 'pointer',
                boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.15)',
                zIndex: isDragging ? 100 : 10,
                opacity: isDragging ? 0.9 : 1,
                transition: isDragging ? 'none' : 'top 0.2s, height 0.2s',
                overflow: 'hidden',
                userSelect: 'none'
            };

            const content = (
                <div
                    style={style}
                    onMouseDown={(e) => handleMouseDown(e, event)}
                    className="event-block"
                    // Thêm hover effect
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

            // 🟢 QUAN TRỌNG: Logic hiển thị Popover
            // Nếu đang KÉO THẬT (isDraggingMode = true) -> KHÔNG bọc Popover (để tránh popup hiện ra khi kéo)
            // Nếu chỉ nhấn nhẹ hoặc chưa kéo đủ xa -> VẪN bọc Popover -> Click sẽ hiện chi tiết
            if (isDragging) return <React.Fragment key={event.id}>{content}</React.Fragment>;

            const popoverContent = (
                <div style={{ width: 250 }}>
                    <div style={{display:'flex', gap: 10, alignItems:'center', marginBottom: 10}}>
                        <div style={{width: 12, height: 12, borderRadius: '50%', background: event.color}} />
                        <Text strong style={{fontSize: 16}}>{event.title}</Text>
                    </div>
                    <Space direction="vertical" style={{ width: '100%', fontSize: 13, color: '#666' }}>
                        <div><ClockCircleOutlined /> {start.format('HH:mm')} - {end.format('HH:mm')}</div>
                        {event.location && <div><EnvironmentOutlined /> {event.location}</div>}
                    </Space>
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 15, paddingTop: 10, borderTop: '1px solid #eee'}}>
                        <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(event)}>Sửa</Button>
                        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(event.id)}>Xóa</Button>
                    </div>
                </div>
            );

            return (
                <Popover key={event.id} content={popoverContent} trigger="click" placement="leftTop">
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
                background: '#fff',
                border: '1px solid #f0f0f0',
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
                        borderBottom: '1px solid #f0f0f0',
                        position: 'relative',
                        display: 'flex',
                        cursor: 'pointer',
                        backgroundColor: hoveredSlot === hour ? '#f0f7ff' : 'transparent',
                    }}
                >
                    <div style={{
                        width: '60px', textAlign: 'right', paddingRight: '15px',
                        fontSize: '12px', color: hoveredSlot === hour ? '#1890ff' : '#999',
                        transform: 'translateY(-8px)',
                    }}>
                        {hour}:00
                    </div>
                    <div style={{ flex: 1, borderLeft: '1px solid #f0f0f0' }}>
                        {hoveredSlot === hour && !draggingEventId && (
                            <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#1890ff', opacity: 0.7, fontSize: 12 }}>
                                + Thêm
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