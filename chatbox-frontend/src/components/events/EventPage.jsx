import React, { useEffect, useState } from 'react';
import { Row, Col, Button, Typography, Empty, message, Spin, FloatButton, Input, Select, DatePicker } from 'antd';
import { PlusOutlined, CalendarOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';
import EventCard from '../../components/events/EventCard';
import CreateEventModal from '../../components/events/CreateEventModal';
import { useSettings } from '../../context/SettingsContext';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

const { Title } = Typography;

const EventsPage = () => {
    const { currentUser } = useChat();
    const { t } = useSettings();

    // Data State
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter State (Thêm mới)
    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'mine', 'joined'

    const [dateRange, setDateRange] = useState(null);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);

    // 1. Fetch
    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/events');
            setEvents(res.data);
        } catch (error) {
            console.error("Lỗi tải danh sách:", error);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchEvents(); }, []);

    // --- LOGIC LỌC
    const filteredEvents = events.filter(event => {
        // 1. Lọc theo Tìm kiếm (Tên, Địa điểm)
        const lowerSearch = searchText.toLowerCase();
        const matchText =
            (event.title || "").toLowerCase().includes(lowerSearch) ||
            (event.locationName || "").toLowerCase().includes(lowerSearch);

        if (!matchText) return false;

        // 2. Lọc theo Loại (Của tôi, Đã tham gia)
        if (filterType === 'mine' && event.creatorUsername !== currentUser) return false;
        if (filterType === 'joined' && !event.isJoined) return false;

        // 🟢 3. LỌC THEO NGÀY THÁNG (Mới thêm)
        if (dateRange) {
            const eventDate = dayjs(event.startTime);
            const startDate = dateRange[0].startOf('day'); // Bắt đầu từ 00:00 của ngày chọn
            const endDate = dateRange[1].endOf('day');     // Kết thúc lúc 23:59 của ngày chọn

            // Nếu ngày sự kiện nằm ngoài khoảng chọn -> Loại
            if (eventDate.isBefore(startDate) || eventDate.isAfter(endDate)) {
                return false;
            }
        }

        return true;
    });
    // -----------------------------

    // 2. Logic Modal
    const openCreateModal = () => {
        setEditingEvent(null);
        setModalVisible(true);
    };

    const openEditModal = (event) => {
        setEditingEvent(event);
        setModalVisible(true);
    };

    // 3. XỬ LÝ LƯU
    const handleSaveEvent = async (formData, isEditMode) => {
        setModalLoading(true);
        try {
            const config = {
                headers: { 'Content-Type': 'multipart/form-data' }
            };
            if (isEditMode) {
                await api.put(`/events/update`, formData, config);
                message.success("Cập nhật thành công!");
            } else {
                await api.post('/events/create', formData, config);
                message.success("Tạo sự kiện thành công!");
            }
            setModalVisible(false);
            fetchEvents();
        } catch (error) {
            message.error("Lỗi: " + (error.response?.data?.message || "Không thể lưu"));
        } finally {
            setModalLoading(false);
        }
    };

    // 4. Join / Leave
    const handleJoinEvent = async (eventId) => {
        try {
            const targetEvent = events.find(e => e.id === eventId);
            if (!targetEvent) return;

            if (!targetEvent.isJoined && targetEvent.participantCount >= targetEvent.maxParticipants) {
                message.error("Sự kiện đã hết chỗ!");
                return;
            }

            await api.post(`/events/${eventId}/join`);

            setEvents(prev => prev.map(ev => {
                if (ev.id === eventId) {
                    const isJoining = !ev.isJoined;
                    return {
                        ...ev,
                        isJoined: isJoining,
                        participantCount: isJoining ? ev.participantCount + 1 : ev.participantCount - 1
                    };
                }
                return ev;
            }));
            message.success(targetEvent.isJoined ? "Đã hủy tham gia" : "Tham gia thành công!");
        } catch (error) {
            message.error("Lỗi kết nối");
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm("Bạn chắc chắn muốn xóa?")) return;
        try {
            await api.delete(`/events/${eventId}`);
            message.success("Đã xóa!");
            setEvents(prev => prev.filter(e => e.id !== eventId));
        } catch (error) { message.error("Lỗi xóa"); }
    };

    return (
        <div style={{padding: '20px 0', maxWidth: 1200, margin: '0 auto'}}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
                padding: '0 20px'
            }}>
                <div>
                    <Title level={2} style={{margin: 0, color: 'var(--text-color)'}}>
                        <CalendarOutlined style={{marginRight: 10}}/> Sự kiện
                    </Title>
                    <Typography.Text type="secondary">Hoạt động sắp diễn ra</Typography.Text>
                </div>
                <Button type="primary" size="large" icon={<PlusOutlined/>} onClick={openCreateModal} shape="round">
                    Tạo sự kiện
                </Button>
            </div>

            {/* --- THANH TÌM KIẾM & LỌC --- */}
            <div style={{marginBottom: 24, padding: '0 20px'}}>
                <Row gutter={[16, 16]}>
                    {/* Ô Tìm kiếm: Chiếm 10 phần */}
                    <Col xs={24} md={10}>
                        <Input
                            placeholder="Tìm tên, địa điểm..."
                            prefix={<SearchOutlined style={{color: '#bfbfbf'}}/>}
                            size="large"
                            allowClear
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            style={{borderRadius: 8}}
                        />
                    </Col>

                    {/* 🟢 Ô Chọn Ngày: Chiếm 8 phần (Mới thêm) */}
                    <Col xs={24} md={8}>
                        <DatePicker.RangePicker
                            placeholder={['Từ ngày', 'Đến ngày']}
                            size="large"
                            style={{width: '100%', borderRadius: 8}}
                            format="DD/MM/YYYY"
                            onChange={(dates) => setDateRange(dates)}
                        />
                    </Col>

                    {/* Ô Chọn Loại: Chiếm 6 phần */}
                    <Col xs={24} md={6}>
                        <Select
                            defaultValue="all"
                            size="large"
                            style={{width: '100%'}}
                            onChange={val => setFilterType(val)}
                            options={[
                                {value: 'all', label: 'Tất cả'},
                                {value: 'mine', label: 'Của tôi'},
                                {value: 'joined', label: 'Đã tham gia'},
                            ]}
                        />
                    </Col>
                </Row>
            </div>

            {loading ? <div style={{textAlign: 'center', padding: 50}}><Spin size="large"/></div> : (
                // SỬA TẠI ĐÂY: Dùng filteredEvents thay vì events
                filteredEvents.length === 0 ? <Empty description="Không tìm thấy sự kiện phù hợp"/> : (
                    <Row gutter={[24, 24]} style={{padding: '0 10px'}}>
                        {filteredEvents.map(event => (
                            <Col xs={24} sm={12} lg={8} xl={6} key={event.id}>
                                <EventCard
                                    event={event}
                                    currentUser={currentUser}
                                    onJoin={handleJoinEvent}
                                    onDelete={handleDeleteEvent}
                                    onEdit={openEditModal}
                                />
                            </Col>
                        ))}
                    </Row>
                )
            )}

            <CreateEventModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onCreate={handleSaveEvent}
                loading={modalLoading}
                initialData={editingEvent}
            />

            <FloatButton icon={<PlusOutlined/>} type="primary" onClick={openCreateModal} tooltip="Tạo mới"/>
        </div>
    );
};

export default EventsPage;