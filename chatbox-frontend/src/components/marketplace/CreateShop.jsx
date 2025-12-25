import React, { useState, useEffect } from 'react';
import {
    Form, Input, Button, Card, Typography, Row, Col, Steps,
    Result, message, Divider, Space, Spin
} from 'antd';
import {
    ShopOutlined, UserOutlined, EnvironmentOutlined,
    RocketOutlined, CheckCircleOutlined, SmileOutlined,
    SafetyCertificateOutlined, BarChartOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { marketApi } from './MarketAPI';
import { useChat } from '../../context/ChatContext';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CreateShop = () => {
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false); // Trạng thái tạo thành công
    const [checking, setChecking] = useState(true);
    const navigate = useNavigate();
    const { currentUser } = useChat();

    // 1. Kiểm tra xem đã có Shop chưa (Tránh tạo trùng)
    useEffect(() => {
        const checkExistingShop = async () => {
            try {
                const res = await marketApi.getMyShopInfo();
                if (res.data) {
                    message.info("Bạn đã có cửa hàng rồi! Đang chuyển hướng...");
                    navigate('/market/myshop');
                }
            } catch (error) {
                // Nếu lỗi 404 hoặc null nghĩa là chưa có shop -> Cho phép tạo
                console.log("Chưa có shop, cho phép tạo mới.");
            } finally {
                setChecking(false);
            }
        };
        if (currentUser) checkExistingShop();
    }, [currentUser, navigate]);

    // 2. Xử lý Submit Form
    const onFinish = async (values) => {
        setLoading(true);
        try {
            await marketApi.registerShop(values);
            // Thay vì redirect ngay, ta hiện màn hình Success cho đẹp
            setIsSuccess(true);

            // Tự động chuyển hướng sau 3 giây
            setTimeout(() => {
                navigate('/market/myshop');
            }, 3000);

        } catch (error) {
            message.error("Lỗi tạo cửa hàng: " + (error.response?.data || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (checking) return <div style={{height: '100vh', display:'flex', justifyContent:'center', alignItems:'center'}}><Spin size="large" tip="Đang kiểm tra hồ sơ..." /></div>;

    // 🟢 MÀN HÌNH THÀNH CÔNG (SUCCESS STATE)
    if (isSuccess) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f5ff' }}>
                <Card style={{ width: 600, textAlign: 'center', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                    <Result
                        status="success"
                        title="Chúc mừng! Cửa hàng của bạn đã sẵn sàng!"
                        subTitle="Hệ thống đang chuyển bạn đến trang quản lý để bắt đầu đăng bán sản phẩm đầu tiên."
                        extra={[
                            <Button type="primary" key="console" onClick={() => navigate('/market/myshop')}>
                                Đến trang quản lý ngay
                            </Button>,
                        ]}
                    />
                </Card>
            </div>
        );
    }

    // 🟢 MÀN HÌNH FORM ĐĂNG KÝ
    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f2f5 0%, #e6f7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

            <Card
                bordered={false}
                style={{
                    width: '100%', maxWidth: 1100, borderRadius: 20, overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                }}
                bodyStyle={{ padding: 0 }}
            >
                <Row>
                    {/* CỘT TRÁI: INTRO & LỢI ÍCH */}
                    <Col xs={0} md={10} style={{
                        background: 'linear-gradient(180deg, #1890ff 0%, #096dd9 100%)',
                        padding: '40px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                    }}>
                        <RocketOutlined style={{ fontSize: 60, marginBottom: 20, opacity: 0.8 }} />
                        <Title level={2} style={{ color: '#fff', marginBottom: 10 }}>Khởi nghiệp cùng T-Private Place</Title>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
                            Hàng ngàn người mua đang chờ đợi sản phẩm của bạn. Tạo gian hàng ngay hôm nay!
                        </Text>

                        <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <Space align="start">
                                <SafetyCertificateOutlined style={{ fontSize: 20, marginTop: 5 }} />
                                <div>
                                    <Text strong style={{ color: '#fff', fontSize: 16 }}>Uy tín được xác thực</Text>
                                    <div style={{ color: 'rgba(255,255,255,0.7)' }}>Gian hàng được gắn tích xanh Official</div>
                                </div>
                            </Space>
                            <Space align="start">
                                <BarChartOutlined style={{ fontSize: 20, marginTop: 5 }} />
                                <div>
                                    <Text strong style={{ color: '#fff', fontSize: 16 }}>Thống kê doanh thu</Text>
                                    <div style={{ color: 'rgba(255,255,255,0.7)' }}>Theo dõi dòng tiền và đơn hàng chi tiết</div>
                                </div>
                            </Space>
                            <Space align="start">
                                <SmileOutlined style={{ fontSize: 20, marginTop: 5 }} />
                                <div>
                                    <Text strong style={{ color: '#fff', fontSize: 16 }}>Tiếp cận khách hàng</Text>
                                    <div style={{ color: 'rgba(255,255,255,0.7)' }}>Hệ thống Chat trực tiếp với người mua</div>
                                </div>
                            </Space>
                        </div>
                    </Col>

                    {/* CỘT PHẢI: FORM ĐĂNG KÝ */}
                    <Col xs={24} md={14} style={{ padding: '40px 50px', background: '#fff' }}>
                        <div style={{marginBottom: 30}}>
                            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/market')} style={{paddingLeft: 0, color: '#888'}}>
                                Quay lại chợ
                            </Button>
                            <Title level={3} style={{ marginTop: 10 }}>Đăng ký Gian Hàng</Title>
                            <Text type="secondary">Vui lòng điền đầy đủ thông tin để chúng tôi xác thực.</Text>
                        </div>

                        <Form
                            layout="vertical"
                            size="large"
                            onFinish={onFinish}
                            requiredMark="optional"
                        >
                            <Form.Item
                                name="shopName"
                                label="Tên Gian Hàng"
                                rules={[{ required: true, message: 'Vui lòng nhập tên Shop!' }]}
                            >
                                <Input prefix={<ShopOutlined style={{color: '#bfbfbf'}} />} placeholder="VD: T-Store Official" />
                            </Form.Item>

                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item
                                        name="phoneNumber"
                                        label="Số điện thoại liên hệ"
                                        rules={[{ required: true, message: 'Nhập SĐT để khách liên hệ!' }]}
                                    >
                                        <Input prefix={<UserOutlined style={{color: '#bfbfbf'}} />} placeholder="VD: 0905..." />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="address"
                                label="Địa chỉ kho / Lấy hàng"
                                rules={[{ required: true, message: 'Shipper cần biết địa chỉ lấy hàng!' }]}
                            >
                                <Input prefix={<EnvironmentOutlined style={{color: '#bfbfbf'}} />} placeholder="Số nhà, đường, phường, quận..." />
                            </Form.Item>

                            <Form.Item
                                name="description"
                                label="Giới thiệu shop (Ngắn gọn)"
                            >
                                <TextArea rows={3} placeholder="Mô tả về sản phẩm bạn kinh doanh, cam kết..." />
                            </Form.Item>

                            <Divider />

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    block
                                    loading={loading}
                                    style={{
                                        height: 50, fontSize: 16, fontWeight: 'bold',
                                        background: 'linear-gradient(90deg, #1890ff 0%, #096dd9 100%)',
                                        border: 'none',
                                        boxShadow: '0 4px 15px rgba(24, 144, 255, 0.3)'
                                    }}
                                >
                                    HOÀN TẤT ĐĂNG KÝ
                                </Button>
                            </Form.Item>
                        </Form>
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default CreateShop;