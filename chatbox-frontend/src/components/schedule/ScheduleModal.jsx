import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, DatePicker, Switch, Radio, Row, Col, Button, Typography, message } from 'antd';
import {
    ClockCircleOutlined, EnvironmentOutlined, AlignLeftOutlined,
    CheckOutlined, CloseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Text } = Typography;

const COLORS = [
    '#039BE5', '#33B679', '#D50000', '#F4511E',
    '#E67C73', '#8E24AA', '#7986CB', '#616161',
];

const ScheduleModal = ({ visible, onClose, onSave, loading, initialData, selectedDate }) => {
    const [form] = Form.useForm();
    const [selectedColor, setSelectedColor] = useState('#039BE5');

    useEffect(() => {
        if (visible) {
            form.resetFields();

            if (initialData) {
                form.setFieldsValue({
                    ...initialData,
                    timeRange: [dayjs(initialData.startTime), dayjs(initialData.endTime)],
                });
                setSelectedColor(initialData.color || '#039BE5');
            } else {
                const defaultStart = selectedDate ? selectedDate : dayjs().startOf('hour').add(1, 'hour');
                const defaultEnd = defaultStart.add(1, 'hour');

                form.setFieldsValue({
                    timeRange: [defaultStart, defaultEnd],
                    color: '#039BE5',
                    isAllDay: false
                });
                setSelectedColor('#039BE5');
            }
        }
    }, [visible, initialData, selectedDate, form]);

    const handleFinish = (values) => {
        const [start, end] = values.timeRange;
        const payload = {
            id: initialData?.id,
            title: values.title,
            description: values.description,
            location: values.location,
            color: values.color,
            isAllDay: values.isAllDay,
            startTime: start.format('YYYY-MM-DDTHH:mm:ss'),
            endTime: end.format('YYYY-MM-DDTHH:mm:ss'),
        };
        onSave(payload);
    };

    // 🟢 SỬA LỖI 1: Thêm hàm này để báo lỗi khi người dùng chưa nhập đủ
    const onFinishFailed = () => {
        message.error("Vui lòng nhập Tiêu đề và chọn Thời gian!");
    };

    const ColorRadio = ({ color, isSelected }) => (
        <div style={{
            width: 24, height: 24, borderRadius: '50%', background: color,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 0 4px ${color}` : 'none',
            transition: 'all 0.2s', margin: '0 6px'
        }}>
            {isSelected && <CheckOutlined style={{ color: '#fff', fontSize: 12 }} />}
        </div>
    );

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            footer={null}
            centered
            width={550}
            closable={false}
            styles={{
                content: { padding: 0, borderRadius: 16, overflow: 'hidden' },
                body: { padding: 0 }
            }}
            maskClosable={false}
        >
            {/* Thêm onFinishFailed vào Form để bắt lỗi */}
            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                onFinishFailed={onFinishFailed}
            >
                {/* --- HERO HEADER --- */}
                <div style={{
                    background: selectedColor,
                    padding: '24px 24px 20px 24px',
                    color: '#fff',
                    transition: 'background 0.3s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <Form.Item name="title" noStyle rules={[{ required: true, message: '' }]}>
                                {/* 🟢 SỬA LỖI 2: Đổi bordered={false} -> variant="borderless" */}
                                <Input
                                    placeholder="Thêm tiêu đề và thời gian"
                                    variant="borderless"
                                    style={{
                                        fontSize: 22, fontWeight: 600, color: '#fff',
                                        padding: 0, boxShadow: 'none'
                                    }}
                                    className="custom-title-input"
                                    autoComplete="off"
                                />
                            </Form.Item>
                        </div>
                        <Button
                            type="text"
                            icon={<CloseOutlined style={{color: '#fff', fontSize: 18}} />}
                            onClick={onClose}
                            style={{ marginLeft: 10, background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}
                        />
                    </div>
                </div>

                {/* --- BODY --- */}
                <div style={{ padding: '24px' }}>

                    {/* 1. Thời Gian */}
                    <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                        <div style={{ marginTop: 8 }}><ClockCircleOutlined style={{ fontSize: 20, color: '#757575' }} /></div>
                        <div style={{ flex: 1 }}>
                            <Row gutter={12} align="middle" style={{marginBottom: 5}}>
                                <Col flex="auto">
                                    <Form.Item name="timeRange" noStyle rules={[{ required: true, message: '' }]}>
                                        {/* 🟢 SỬA LỖI 2: Đổi bordered={false} -> variant="borderless" */}
                                        <RangePicker
                                            showTime={{ format: 'HH:mm' }}
                                            format="DD/MM/YYYY HH:mm"
                                            style={{ width: '100%' }}
                                            variant="borderless"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Item name="isAllDay" valuePropName="checked" noStyle>
                                        <Switch size="small" />
                                    </Form.Item>
                                    <Text type="secondary" style={{marginLeft: 8, fontSize: 13}}>Cả ngày</Text>
                                </Col>
                            </Row>
                        </div>
                    </div>

                    {/* 2. Địa điểm */}
                    <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                        <div style={{ marginTop: 5 }}><EnvironmentOutlined style={{ fontSize: 20, color: '#757575' }} /></div>
                        <div style={{ flex: 1 }}>
                            <Form.Item name="location" noStyle>
                                {/* 🟢 SỬA LỖI 2: Đổi bordered={false} -> variant="borderless" */}
                                <Input
                                    placeholder="Thêm địa điểm"
                                    variant="borderless"
                                    style={{ paddingLeft: 0, borderBottom: '1px solid #eee', borderRadius: 0 }}
                                />
                            </Form.Item>
                        </div>
                    </div>

                    {/* 3. Mô tả */}
                    <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                        <div style={{ marginTop: 5 }}><AlignLeftOutlined style={{ fontSize: 20, color: '#757575' }} /></div>
                        <div style={{ flex: 1 }}>
                            <Form.Item name="description" noStyle>
                                {/* 🟢 SỬA LỖI 2: Đổi bordered={false} -> variant="borderless" */}
                                <TextArea
                                    placeholder="Thêm mô tả, ghi chú..."
                                    autoSize={{ minRows: 3, maxRows: 6 }}
                                    variant="borderless"
                                    style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: 8 }}
                                />
                            </Form.Item>
                        </div>
                    </div>

                    {/* 4. Chọn Màu */}
                    <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                        <div style={{ width: 20 }}></div>
                        <Form.Item name="color" noStyle>
                            <Radio.Group onChange={(e) => setSelectedColor(e.target.value)}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {COLORS.map(c => (
                                        <Radio key={c} value={c} style={{display:'none'}}></Radio>
                                    ))}
                                    {COLORS.map(c => (
                                        <div key={c} onClick={() => {
                                            form.setFieldsValue({ color: c });
                                            setSelectedColor(c);
                                        }}>
                                            <ColorRadio color={c} isSelected={selectedColor === c} />
                                        </div>
                                    ))}
                                </div>
                            </Radio.Group>
                        </Form.Item>
                    </div>
                </div>

                {/* --- FOOTER --- */}
                <div style={{
                    padding: '15px 24px',
                    background: '#fff',
                    display: 'flex', justifyContent: 'flex-end',
                    borderTop: '1px solid #f0f0f0'
                }}>
                    <Button onClick={onClose} size="large" style={{ marginRight: 12, border: 'none', background: '#f5f5f5', color: '#666' }}>
                        Hủy
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        size="large"
                        style={{
                            background: selectedColor, borderColor: selectedColor,
                            borderRadius: 8, fontWeight: 600, padding: '0 30px',
                            boxShadow: `0 4px 10px ${selectedColor}66`
                        }}
                    >
                        Lưu
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default ScheduleModal;