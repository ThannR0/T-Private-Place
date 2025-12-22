import React, { useEffect, useState } from 'react';
import {
    Calendar, Row, Col, Card, Typography, Button,
    message, Spin, Modal, Divider, Tag, Avatar
} from 'antd';
import {
    PlusOutlined, RobotOutlined,
    ClockCircleOutlined, EnvironmentOutlined, BulbFilled,
    FireFilled, CoffeeOutlined, ReadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import scheduleApi from '../services/scheduleApi';
import ScheduleModal from '../components/schedule/ScheduleModal';
import TimeGrid from '../components/schedule/TimeGrid';
import { useSettings } from '../context/SettingsContext'; // Import hook ngôn ngữ

// Thiết lập locale cho dayjs tùy theo ngôn ngữ (ở đây tạm để vi hoặc en theo logic app của bạn)
// dayjs.locale('vi');

const { Title, Text } = Typography;

const AiSummaryRenderer = ({ rawText }) => {
    const { t } = useSettings(); // Dùng t() trong component con
    if (!rawText) return null;

    // Xử lý trường hợp rỗng
    if (rawText.startsWith("EMPTY_STATE")) {
        const parts = rawText.split("|");
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Avatar size={100} icon={<CoffeeOutlined />} style={{ background: 'var(--bg-secondary)', color: '#52c41a', marginBottom: 20 }} />
                <Title level={3} style={{ color: '#52c41a' }}>{parts[1]}</Title>
                <Text style={{ fontSize: 16, color: 'var(--text-secondary)' }}>{parts[2]}</Text>
            </div>
        );
    }

    const lines = rawText.split('\n');

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            {lines.map((line, index) => {
                const parts = line.split('|');
                const type = parts[0];

                // 1. HEADER
                if (type === "HEADER") {
                    return (
                        <div key={index} style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            margin: '-24px -24px 20px -24px',
                            padding: '30px 24px',
                            color: '#fff',
                            textAlign: 'center'
                        }}>
                            <div style={{ textTransform: 'uppercase', letterSpacing: 2, fontSize: 12, opacity: 0.8 }}>{t('aiReportHeader') || "AI Assistant Report"}</div>
                            <Title level={2} style={{ color: '#fff', margin: '5px 0 0 0' }}>{parts[1]}</Title>
                            <div style={{ fontSize: 16, opacity: 0.9 }}>{parts[2]}</div>
                        </div>
                    );
                }

                // 2. SECTION TITLE
                if (type === "SECTION_TITLE") {
                    return (
                        <Divider key={index} orientation="left" style={{ borderColor: 'var(--border-color)' }}>
                            <span style={{ color: '#764ba2', fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>
                                {parts[1]}
                            </span>
                        </Divider>
                    );
                }

                // 3. EVENT CARD
                if (type === "EVENT") {
                    // Format: EVENT|TimeOfDay|TimeRange|Title|Location|Desc|Color
                    const timeOfDay = parts[1];
                    const timeRange = parts[2];
                    const title = parts[3];
                    const location = parts[4];
                    const desc = parts[5];
                    const color = parts[6];

                    let icon = <ClockCircleOutlined />;
                    if (timeOfDay === 'MORNING') icon = <ReadOutlined />;
                    if (timeOfDay === 'AFTERNOON') icon = <FireFilled />;
                    if (timeOfDay === 'EVENING') icon = <CoffeeOutlined />;

                    return (
                        <div key={index} style={{
                            display: 'flex',
                            marginBottom: 15,
                            background: 'var(--card-bg)', // Đổi thành biến CSS
                            borderRadius: 12,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                            border: '1px solid var(--border-color)', // Đổi thành biến CSS
                            overflow: 'hidden'
                        }}>
                            {/* Dải màu bên trái */}
                            <div style={{ width: 6, background: color }} />

                            <div style={{ padding: '12px 16px', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text strong style={{ fontSize: 16, color: 'var(--text-color)' }}>{title}</Text>
                                    <Tag color={timeOfDay === 'MORNING' ? 'orange' : (timeOfDay === 'AFTERNOON' ? 'blue' : 'purple')} style={{ borderRadius: 10, border: 'none', margin: 0 }}>
                                        {timeRange}
                                    </Tag>
                                </div>

                                {location && (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>
                                        <EnvironmentOutlined style={{ marginRight: 5 }} /> {location}
                                    </div>
                                )}
                                {desc && (
                                    <div style={{ background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, fontStyle: 'italic' }}>
                                        "{desc}"
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }

                // 4. STATS
                if (type === "STATS") {
                    return (
                        <Row gutter={16} key={index} style={{ marginBottom: 20 }}>
                            {[parts[1], parts[2], parts[3]].map((stat, i) => {
                                const [label, count] = stat.split(':');
                                return (
                                    <Col span={8} key={i}>
                                        <div style={{
                                            textAlign: 'center', background: 'var(--bg-secondary)',
                                            borderRadius: 12, padding: '10px 0'
                                        }}>
                                            <div style={{ fontSize: 24, fontWeight: 800, color: '#764ba2' }}>{count}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
                                        </div>
                                    </Col>
                                );
                            })}
                        </Row>
                    );
                }

                // 5. ADVICE
                if (type === "ADVICE") {
                    return (
                        <div key={index} style={{
                            background: 'linear-gradient(to right, #fff1eb 0%, #ace0f9 100%)', // Gradient này khá sáng, có thể giữ nguyên làm điểm nhấn
                            padding: 20, borderRadius: 12, display: 'flex', gap: 15, alignItems: 'center',
                            border: '1px solid var(--border-color)'
                        }}>
                            <BulbFilled style={{ fontSize: 24, color: '#faad14' }} />
                            <div>
                                <div style={{ fontWeight: 700, color: '#333', marginBottom: 2 }}>{t('advice') || "Lời khuyên"}</div>
                                <div style={{ color: '#555', lineHeight: 1.4 }}>{parts[1]}</div>
                            </div>
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
};
// ---------------------------------------------


const SchedulePage = () => {
    const { t } = useSettings();

    // --- STATE ---
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [viewMonth, setViewMonth] = useState(dayjs());

    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [selectedSlotTime, setSelectedSlotTime] = useState(null);

    // AI State
    const [aiSummary, setAiSummary] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiModalVisible, setAiModalVisible] = useState(false);

    // --- FETCH DATA ---
    const fetchSchedules = async (monthDate) => {
        setLoading(true);
        try {
            const start = monthDate.startOf('month').toISOString();
            const end = monthDate.endOf('month').toISOString();
            const res = await scheduleApi.getSchedules(start, end);
            setSchedules(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSchedules(viewMonth); }, [viewMonth]);

    // --- HANDLERS ---
    const dateCellRender = (value) => {
        const hasEvent = schedules.some(s => dayjs(s.startTime).isSame(value, 'day'));
        return hasEvent ? <div style={{width: 6, height: 6, background: '#1890ff', borderRadius: '50%', margin: '0 auto'}}></div> : null;
    };

    const onSelectDate = (newValue) => {
        setCurrentDate(newValue);
        if (!newValue.isSame(viewMonth, 'month')) setViewMonth(newValue);
    };

    const openCreateModal = (time = null) => {
        setEditingSchedule(null);
        setSelectedSlotTime(time || currentDate);
        setModalVisible(true);
    };

    const handleSave = async (payload) => {
        setSaveLoading(true);
        try {
            if (payload.id) {
                await scheduleApi.update(payload);
                message.success(t('updateScheduleSuccess') || "Cập nhật thành công!");
            } else {
                await scheduleApi.create(payload);
                message.success(t('createScheduleSuccess') || "Tạo lịch thành công!");
            }
            setModalVisible(false);
            fetchSchedules(viewMonth);
        } catch (error) {
            message.error("Error: " + (error.response?.data?.message || "Error"));
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDelete = async (id) => {
        Modal.confirm({
            title: t('deleteScheduleTitle') || 'Xóa lịch trình?',
            content: t('deletePostDesc') || 'Hành động này không thể hoàn tác.',
            okType: 'danger',
            // Sử dụng class overrides trong index.css để style Modal
            onOk: async () => {
                try {
                    await scheduleApi.delete(id);
                    message.success(t('deleteSuccess') || "Đã xóa!");
                    fetchSchedules(viewMonth);
                } catch (e) { message.error("Lỗi xóa"); }
            }
        });
    };

    const handleEventDrop = async (event, newStart, newEnd) => {
        try {
            setSchedules(prev => prev.map(s => {
                if (s.id === event.id) {
                    return {
                        ...s,
                        startTime: newStart.toISOString(),
                        endTime: newEnd.toISOString()
                    };
                }
                return s;
            }));
            await scheduleApi.update({
                id: event.id,
                title: event.title,
                description: event.description,
                location: event.location,
                color: event.color,
                isAllDay: event.isAllDay,
                startTime: newStart.format('YYYY-MM-DDTHH:mm:ss'),
                endTime: newEnd.format('YYYY-MM-DDTHH:mm:ss'),
            });
            message.success(t('moveScheduleSuccess') || "Đã di chuyển lịch trình!");
        } catch (error) {
            message.error("Lỗi di chuyển: " + error.message);
            fetchSchedules(viewMonth);
        }
    };

    // AI Logic
    const handleAiSummary = async () => {
        setAiLoading(true);
        setAiModalVisible(true);
        setAiSummary('');
        try {
            const dateStr = currentDate.format('YYYY-MM-DD');
            const res = await scheduleApi.getAiSummary(dateStr);
            setAiSummary(res.data);
        } catch (error) {
            setAiSummary("⚠️ AI không phản hồi.");
        } finally {
            setAiLoading(false);
        }
    };

    const dailyEvents = schedules.filter(s => dayjs(s.startTime).isSame(currentDate, 'day'));

    return (
        <div style={{ maxWidth: 1400, margin: '20px auto', padding: '0 20px' }}>
            <Row gutter={24}>
                {/* CỘT TRÁI */}
                <Col xs={24} lg={6}>
                    <Card style={{ borderRadius: 16, marginBottom: 20 }}>
                        <div style={{textAlign: 'center', marginBottom: 20}}>
                            <Button type="primary" size="large" icon={<PlusOutlined />} block onClick={() => openCreateModal()}
                                    style={{borderRadius: 8, height: 45, fontSize: 16, fontWeight: 600}}>
                                {t('createSchedule') || "Tạo kế hoạch"}
                            </Button>
                        </div>
                        <Calendar fullscreen={false} value={currentDate} onSelect={onSelectDate} cellRender={dateCellRender} />
                        <Divider />
                        <div style={{textAlign: 'center'}}>
                            <Text style={{color: 'var(--text-secondary)'}}>{t('viewingDate') || "Bạn đang xem lịch ngày"}:</Text>
                            <Title level={4} style={{margin: '5px 0', color: '#1890ff'}}>
                                {currentDate.format('DD/MM/YYYY')}
                            </Title>
                        </div>
                    </Card>
                </Col>

                {/* CỘT PHẢI */}
                <Col xs={24} lg={18}>
                    {/* Thêm style để Card bung chiều cao và đổi nền theo theme */}
                    <Card
                        style={{ borderRadius: 16, height: '100%', display: 'flex', flexDirection: 'column' }}
                        bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
                    >
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Title level={4} style={{ margin: 0, color: 'var(--text-color)' }}>
                                    {currentDate.format('dddd')}, {currentDate.format('D')} / {currentDate.format('M')}
                                </Title>
                                <Text style={{color: 'var(--text-secondary)'}}>
                                    {t('eventsToday')?.replace('{{count}}', dailyEvents.length) || `Có ${dailyEvents.length} sự kiện`}
                                </Text>
                            </div>
                            <Button type="dashed" icon={<RobotOutlined />} onClick={handleAiSummary} style={{ color: '#722ed1', borderColor: '#722ed1', background: 'var(--bg-secondary)' }}>
                                {t('aiSummaryBtn') || "AI Tóm tắt"}
                            </Button>
                        </div>

                        {loading ? <div style={{padding: 50, textAlign: 'center'}}><Spin /></div> : (
                            <TimeGrid
                                date={currentDate}
                                events={dailyEvents}
                                onCreate={openCreateModal}
                                onEdit={(evt) => { setEditingSchedule(evt); setModalVisible(true); }}
                                onDelete={handleDelete}
                                onEventDrop={handleEventDrop}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            <ScheduleModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleSave}
                loading={saveLoading}
                initialData={editingSchedule}
                selectedDate={selectedSlotTime}
            />

            {/* MODAL AI PRO MAX */}
            <Modal
                open={aiModalVisible}
                onCancel={() => setAiModalVisible(false)}
                footer={null}
                centered
                width={600}
                styles={{ content: { borderRadius: 16, overflow: 'hidden', padding: 0 }, body: { padding: '24px' } }}
            >
                {aiLoading ? (
                    <div style={{textAlign: 'center', padding: '60px 20px'}}>
                        <Spin size="large" />
                        <div style={{marginTop: 20, color: '#667eea', fontWeight: 600}}>
                            {t('aiAnalyzing') || "AI đang phân tích dữ liệu..."}
                        </div>
                    </div>
                ) : (
                    <AiSummaryRenderer rawText={aiSummary} />
                )}
            </Modal>
        </div>
    );
};

export default SchedulePage;