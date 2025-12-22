import React, { useEffect, useState } from 'react';
import {
    Modal, Form, Input, DatePicker, InputNumber, Upload, Button,
    Row, Col, Typography, message, theme, Divider
} from 'antd';
import {
    InboxOutlined, EnvironmentOutlined, FileTextOutlined,
    TeamOutlined, ClockCircleOutlined, CompassFilled
} from '@ant-design/icons';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import dayjs from 'dayjs';
import { useSettings } from '../../context/SettingsContext';

const { Text, Title } = Typography;
const { Dragger } = Upload;
const { TextArea } = Input;
const LIBRARIES = ['places'];

const CreateEventModal = ({ visible, onClose, onCreate, loading, initialData }) => {
    const { t } = useSettings();
    const { token } = theme.useToken();
    const [form] = Form.useForm();

    const [selectedLocation, setSelectedLocation] = useState({ lat: 21.0285, lng: 105.8542 });

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES
    });

    useEffect(() => {
        if (visible) {
            if (initialData) {
                form.setFieldsValue({
                    ...initialData,
                    startTime: initialData.startTime ? dayjs(initialData.startTime) : null,
                    file: initialData.imageUrl ? [{ uid: '-1', name: 'image.png', status: 'done', url: initialData.imageUrl }] : []
                });
                if (initialData.latitude && initialData.longitude) {
                    setSelectedLocation({ lat: initialData.latitude, lng: initialData.longitude });
                }
            } else {
                form.resetFields();
                setSelectedLocation({ lat: 21.0285, lng: 105.8542 });
            }
        }
    }, [visible, initialData, form]);

    const onMapClick = (e) => {
        if (e.latLng) {
            setSelectedLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
    };

    const validateDate = (_, value) => {
        if (!value) return Promise.reject(new Error(t('required')));
        if (initialData) return Promise.resolve();
        const diffHours = value.diff(dayjs(), 'hour');
        if (diffHours < 12) {
            return Promise.reject(new Error(t('errorDate12h') || "Thời gian phải sau hiện tại ít nhất 12 tiếng"));
        }
        return Promise.resolve();
    };

    // --- VALIDATOR MỚI: Check số lượng người tối đa ---
    const validateMaxParticipants = (_, value) => {
        if (!value) return Promise.reject(new Error(t('required')));
        // Nếu đang sửa và có dữ liệu người tham gia
        if (initialData && initialData.participantCount && value < initialData.participantCount) {
            return Promise.reject(new Error(`Tối thiểu phải là ${initialData.participantCount} (Số người đang tham gia)`));
        }
        return Promise.resolve();
    };
    // ------------------------------------------------

    const normFile = (e) => {
        if (Array.isArray(e)) return e;
        return e?.fileList;
    };

    const handleFinish = (values) => {
        const formData = new FormData();

        const eventData = {
            id: initialData ? initialData.id : null,
            title: values.title,
            description: values.description,
            locationName: values.locationName,
            address: values.address,
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            maxParticipants: values.maxParticipants,
            startTime: values.startTime.toISOString(),
        };

        formData.append('event', JSON.stringify(eventData));

        if (values.file && values.file.length > 0) {
            if (values.file[0].originFileObj) {
                formData.append('file', values.file[0].originFileObj);
            }
        }

        onCreate(formData, !!initialData);
    };

    return (
        <Modal
            title={
                <Title level={3} style={{ margin: 0, textAlign: 'center', color: token.colorPrimary }}>
                    {initialData ? (t('editEvent') || "Cập nhật sự kiện") : (t('createEvent') || "Tạo sự kiện mới")}
                </Title>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            width={900}
            centered
            maskClosable={false}
            styles={{ body: { padding: '20px 10px' } }}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                requiredMark="optional"
            >
                <Row gutter={32}>
                    <Col xs={24} md={12}>
                        <Divider orientation="left" style={{borderColor: token.colorBorder}}>{t('generalInfo') || "Thông tin chung"}</Divider>

                        <Form.Item
                            name="title"
                            label={t('eventName') || "Tên sự kiện"}
                            rules={[{ required: true, message: t('requireTitle') || "Vui lòng nhập tên sự kiện" }]}
                        >
                            <Input size="large" prefix={<FileTextOutlined style={{color: token.colorTextDescription}}/>} placeholder="VD: Workshop ReactJS..." />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={14}>
                                <Form.Item
                                    name="startTime"
                                    label={t('startTime') || "Thời gian bắt đầu"}
                                    rules={[{ validator: validateDate }]}
                                >
                                    <DatePicker
                                        showTime
                                        format="DD/MM/YYYY HH:mm"
                                        style={{ width: '100%' }}
                                        size="large"
                                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={10}>
                                <Form.Item
                                    name="maxParticipants"
                                    label={t('maxParticipants') || "Số người"}
                                    rules={[{ validator: validateMaxParticipants }]} // <-- GẮN VALIDATOR MỚI VÀO ĐÂY
                                >
                                    <InputNumber min={1} style={{ width: '100%' }} size="large" prefix={<TeamOutlined />} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            name="locationName"
                            label={t('locationName') || "Tên địa điểm"}
                            rules={[{ required: true, message: t('requireLocName') || "Nhập tên địa điểm" }]}
                        >
                            <Input size="large" prefix={<EnvironmentOutlined style={{color: token.colorTextDescription}}/>} placeholder="VD: Tòa nhà Tech..." />
                        </Form.Item>

                        <Form.Item name="address" label={t('address') || "Địa chỉ chi tiết"}>
                            <Input prefix={<CompassFilled style={{color: token.colorTextDescription}}/>} placeholder="VD: 123 Đường ABC..." />
                        </Form.Item>

                        <Form.Item name="description" label={t('description') || "Mô tả chi tiết"}>
                            <TextArea
                                rows={6}
                                placeholder={t('descPlaceholder') || "Mô tả nội dung, lịch trình..."}
                                showCount
                                maxLength={2000}
                            />
                        </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                        <Divider orientation="left" style={{borderColor: token.colorBorder}}>{t('mediaLocation') || "Hình ảnh & Vị trí"}</Divider>

                        <div style={{ marginBottom: 20 }}>
                            <Text strong style={{marginBottom: 8, display: 'block'}}>{t('pickMap') || "Chọn vị trí trên bản đồ"}</Text>
                            <div style={{
                                height: 250,
                                borderRadius: 12,
                                overflow: 'hidden',
                                border: `2px solid ${token.colorBorderSecondary}`,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}>
                                {isLoaded ? (
                                    <GoogleMap
                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                        center={selectedLocation}
                                        zoom={15}
                                        onClick={onMapClick}
                                        options={{ disableDefaultUI: true, zoomControl: true }}
                                    >
                                        <Marker position={selectedLocation} />
                                    </GoogleMap>
                                ) : <div style={{ padding: 20, textAlign: 'center', color: token.colorText }}>Loading Map...</div>}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                * <EnvironmentOutlined /> {t('mapHint') || "Click vào bản đồ để ghim vị trí chính xác"}
                            </Text>
                        </div>

                        <Form.Item
                            name="file"
                            label={t('coverImage') || "Ảnh bìa sự kiện"}
                            valuePropName="fileList"
                            getValueFromEvent={normFile}
                            rules={[{ required: true, message: t('requireImage') || "Bắt buộc phải có ảnh bìa!" }]}
                        >
                            <Dragger
                                maxCount={1}
                                beforeUpload={() => false}
                                listType="picture"
                                style={{
                                    background: token.colorBgContainer,
                                    borderColor: token.colorPrimary,
                                    borderRadius: 12
                                }}
                            >
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined style={{ color: token.colorPrimary }} />
                                </p>
                                <p className="ant-upload-text" style={{color: token.colorText}}>
                                    {t('dragDrop') || "Kéo thả hoặc Click để tải ảnh lên"}
                                </p>
                                <p className="ant-upload-hint" style={{color: token.colorTextSecondary}}>
                                    Hỗ trợ JPG, PNG. Kích thước tốt nhất 16:9.
                                </p>
                            </Dragger>
                        </Form.Item>
                    </Col>
                </Row>

                <Divider />

                <div style={{ textAlign: 'right' }}>
                    <Button onClick={onClose} size="large" style={{ marginRight: 12, borderRadius: 8 }}>
                        {t('cancel') || "Hủy bỏ"}
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        size="large"
                        icon={<ClockCircleOutlined />}
                        style={{
                            borderRadius: 8,
                            paddingLeft: 30,
                            paddingRight: 30,
                            background: `linear-gradient(90deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
                            border: 'none',
                            boxShadow: '0 4px 15px rgba(24, 144, 255, 0.3)'
                        }}
                    >
                        {initialData ? (t('save') || "Lưu thay đổi") : (t('createEvent') || "Tạo sự kiện")}
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default CreateEventModal;