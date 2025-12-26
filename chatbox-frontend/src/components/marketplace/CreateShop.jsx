import React, { useState, useEffect } from 'react';
import {
    Form, Input, Button, Card, Typography, Row, Col,
    message, Divider, Space, Spin, Upload, Tooltip
} from 'antd';
import {
    ShopOutlined, PhoneOutlined, EnvironmentOutlined,
    RocketOutlined, CheckCircleFilled, SmileOutlined,
    SafetyCertificateFilled, ThunderboltFilled, ArrowLeftOutlined,
    CloudUploadOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { marketApi } from './MarketAPI';
import { useChat } from '../../context/ChatContext';
import { motion } from 'framer-motion'; // Nếu chưa cài thì chạy: npm install framer-motion

const { Title, Text } = Typography;
const { TextArea } = Input;

// 🟢 STYLES & ANIMATION
const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const CreateShop = () => {
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [fileList, setFileList] = useState([]); // State lưu ảnh avatar shop
    const navigate = useNavigate();
    const { currentUser } = useChat();
    const [form] = Form.useForm();

    // 1. Kiểm tra Shop tồn tại
    useEffect(() => {
        const checkExistingShop = async () => {
            try {
                const res = await marketApi.getMyShopInfo();
                if (res.data) {
                    message.info("Bạn đã sở hữu một cửa hàng! Đang chuyển hướng...");
                    navigate('/market/myshop');
                }
            } catch (error) {
                // 404 nghĩa là chưa có shop -> OK
            } finally {
                setChecking(false);
            }
        };
        if (currentUser) checkExistingShop();
    }, [currentUser, navigate]);

    // 2. Xử lý Upload Ảnh
    const handleUploadChange = ({ fileList: newFileList }) => {
        // Giới hạn 1 ảnh duy nhất
        setFileList(newFileList.slice(-1));
    };

    const beforeUpload = (file) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) message.error('Chỉ chấp nhận file ảnh JPG/PNG!');
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) message.error('Ảnh phải nhỏ hơn 2MB!');
        return false; // Chặn auto upload, để gửi cùng form
    };

    // 3. Xử lý Submit
    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Tạo FormData để gửi cả Text và File
            const formData = new FormData();
            formData.append('shopName', values.shopName);
            formData.append('phoneNumber', values.phoneNumber);
            formData.append('address', values.address);
            formData.append('description', values.description || '');

            if (fileList.length > 0) {
                // 'avatar' phải khớp với tên tham số @RequestParam("avatar") ở Backend
                formData.append('avatar', fileList[0].originFileObj);
            }

            await marketApi.registerShop(formData);

            message.success({
                content: 'Khởi tạo gian hàng thành công! Chào mừng CEO mới!',
                style: { marginTop: '20vh' },
            });

            setTimeout(() => navigate('/market/myshop'), 1500);

        } catch (error) {
            message.error("Lỗi tạo shop: " + (error.response?.data || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (checking) return <div style={{height: '100vh', display:'flex', justifyContent:'center', alignItems:'center'}}><Spin size="large" tip="Đang kiểm tra hồ sơ..." /></div>;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)', // Màu nền tươi sáng
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            fontFamily: "'Poppins', sans-serif" // Font chữ hiện đại (cần import ở index.html hoặc css)
        }}>
            <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{width: '100%', maxWidth: 1100}}>
                <Card
                    bordered={false}
                    style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
                    bodyStyle={{ padding: 0 }}
                >
                    <Row>
                        {/* CỘT TRÁI: INTRO & LỢI ÍCH (Gradient Đẹp) */}
                        <Col xs={0} md={10} style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            padding: '50px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center',
                            position: 'relative', overflow: 'hidden'
                        }}>
                            {/* Họa tiết nền */}
                            <div style={{position:'absolute', top:-50, left:-50, width:150, height:150, background:'rgba(255,255,255,0.1)', borderRadius:'50%'}}></div>
                            <div style={{position:'absolute', bottom:-30, right:-30, width:200, height:200, background:'rgba(255,255,255,0.05)', borderRadius:'50%'}}></div>

                            <RocketOutlined style={{ fontSize: 60, marginBottom: 20 }} />
                            <Title level={2} style={{ color: '#fff', marginBottom: 10, fontWeight: 700 }}>
                                Bắt đầu hành trình kinh doanh
                            </Title>
                            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.6 }}>
                                Hàng triệu khách hàng tiềm năng đang chờ đón sản phẩm độc đáo của bạn trên T-Private Place.
                            </Text>

                            <div style={{ marginTop: 50, display: 'flex', flexDirection: 'column', gap: 25 }}>
                                <Space align="start">
                                    <div style={{background:'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8}}><SafetyCertificateFilled style={{ fontSize: 20, color:'#fff' }} /></div>
                                    <div>
                                        <Text strong style={{ color: '#fff', fontSize: 16 }}>Tích Xanh Chính Chủ</Text>
                                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Tăng độ uy tín với huy hiệu Official Store</div>
                                    </div>
                                </Space>
                                <Space align="start">
                                    <div style={{background:'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8}}><ThunderboltFilled style={{ fontSize: 20, color:'#fff' }} /></div>
                                    <div>
                                        <Text strong style={{ color: '#fff', fontSize: 16 }}>Tăng Tốc Doanh Thu</Text>
                                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Công cụ đẩy bài & Voucher thông minh</div>
                                    </div>
                                </Space>
                                <Space align="start">
                                    <div style={{background:'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8}}><SmileOutlined style={{ fontSize: 20, color:'#fff' }} /></div>
                                    <div>
                                        <Text strong style={{ color: '#fff', fontSize: 16 }}>Hỗ Trợ Tận Tâm</Text>
                                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Đội ngũ support 24/7</div>
                                    </div>
                                </Space>
                            </div>
                        </Col>

                        {/* CỘT PHẢI: FORM ĐĂNG KÝ (Hiện đại & Validate) */}
                        <Col xs={24} md={14} style={{ padding: '50px 60px', background: '#fff' }}>
                            <div style={{marginBottom: 30}}>
                                <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/market')} style={{paddingLeft: 0, color: '#888', marginBottom: 10}}>
                                    Về trang chủ
                                </Button>
                                <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#333' }}>Đăng ký Gian Hàng</Title>
                                <Text type="secondary">Điền thông tin bên dưới để kích hoạt shop ngay lập tức.</Text>
                            </div>

                            <Form
                                form={form}
                                layout="vertical"
                                size="large"
                                onFinish={onFinish}
                                requiredMark="optional"
                            >
                                {/* UPLOAD AVATAR SHOP */}
                                <Form.Item label={<span style={{fontWeight: 600}}>Logo / Ảnh đại diện Shop</span>}>
                                    <div style={{display:'flex', alignItems:'center', gap: 20}}>
                                        <Upload
                                            listType="picture-card"
                                            fileList={fileList}
                                            onChange={handleUploadChange}
                                            beforeUpload={beforeUpload}
                                            showUploadList={{ showPreviewIcon: false }}
                                            maxCount={1}
                                        >
                                            {fileList.length < 1 && (
                                                <div style={{color:'#666'}}>
                                                    <CloudUploadOutlined style={{fontSize: 24}} />
                                                    <div style={{marginTop: 8, fontSize: 12}}>Tải ảnh</div>
                                                </div>
                                            )}
                                        </Upload>
                                        <div style={{flex: 1}}>
                                            <Text type="secondary" style={{fontSize: 12}}>
                                                <InfoCircleOutlined /> Kích thước khuyến nghị: 500x500px.<br/>
                                                Dung lượng tối đa 2MB. Định dạng JPG/PNG.
                                            </Text>
                                        </div>
                                    </div>
                                </Form.Item>

                                <Form.Item
                                    name="shopName"
                                    label={<span style={{fontWeight: 600}}>Tên Gian Hàng</span>}
                                    rules={[
                                        { required: true, message: 'Tên Shop không được để trống!' },
                                        { min: 3, message: 'Tên Shop phải từ 3 ký tự trở lên' },
                                        { pattern: /^[a-zA-Z0-9\s\u00C0-\u1EF9]+$/, message: 'Tên Shop không chứa ký tự đặc biệt quá dị!' }
                                    ]}
                                >
                                    <Input prefix={<ShopOutlined style={{color: '#999'}} />} placeholder="VD: T-Store Official" style={{borderRadius: 8}} />
                                </Form.Item>

                                <Row gutter={16}>
                                    <Col span={24}>
                                        <Form.Item
                                            name="phoneNumber"
                                            label={<span style={{fontWeight: 600}}>Số điện thoại liên hệ</span>}
                                            rules={[
                                                { required: true, message: 'Vui lòng nhập số điện thoại!' },
                                                { pattern: /^(0?)(3[2-9]|5[6|8|9]|7[0|6-9]|8[0-6|8|9]|9[0-4|6-9])[0-9]{7}$/, message: 'Số điện thoại không hợp lệ (VN)' }
                                            ]}
                                        >
                                            <Input prefix={<PhoneOutlined style={{color: '#999'}} />} placeholder="09xx..." style={{borderRadius: 8}} />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item
                                    name="address"
                                    label={<span style={{fontWeight: 600}}>Địa chỉ kho hàng</span>}
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập địa chỉ lấy hàng!' },
                                        { min: 10, message: 'Địa chỉ quá ngắn, hãy ghi rõ số nhà, đường, quận/huyện...' }
                                    ]}
                                >
                                    <Input prefix={<EnvironmentOutlined style={{color: '#999'}} />} placeholder="Số nhà, đường, phường, quận..." style={{borderRadius: 8}} />
                                </Form.Item>

                                <Form.Item
                                    name="description"
                                    label={<span style={{fontWeight: 600}}>Giới thiệu (Bio)</span>}
                                >
                                    <TextArea
                                        rows={3}
                                        placeholder="Mô tả ngắn gọn về sản phẩm bạn kinh doanh, cam kết chất lượng..."
                                        style={{borderRadius: 8, resize: 'none'}}
                                        maxLength={200}
                                        showCount
                                    />
                                </Form.Item>

                                <Divider style={{margin: '20px 0'}} />

                                <Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        block
                                        loading={loading}
                                        icon={<CheckCircleFilled />}
                                        style={{
                                            height: 50, fontSize: 16, fontWeight: 'bold',
                                            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                            border: 'none', borderRadius: 12,
                                            boxShadow: '0 8px 20px rgba(118, 75, 162, 0.3)',
                                            transition: 'transform 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        HOÀN TẤT ĐĂNG KÝ
                                    </Button>
                                    <Text type="secondary" style={{fontSize: 12, display: 'block', textAlign: 'center', marginTop: 15}}>
                                        Bằng việc đăng ký, bạn đồng ý với <a href="#">Điều khoản dịch vụ</a> của chúng tôi.
                                    </Text>
                                </Form.Item>
                            </Form>
                        </Col>
                    </Row>
                </Card>
            </motion.div>
        </div>
    );
};

export default CreateShop;