import React, { useState, useEffect, useRef } from 'react';
import {
    Form, Input, InputNumber, Button, Upload, Card,
    Typography, message, Modal, Row, Col, Select, Avatar, Rate, Tooltip, Badge, Divider
} from 'antd';
import {
    PlusOutlined, ShopOutlined, CheckCircleOutlined,
    CloudUploadOutlined, InfoCircleOutlined, RocketOutlined, EnvironmentOutlined, CarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { marketApi } from './MarketAPI';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// 🟢 GIỮ NGUYÊN ICON ĐỒNG TIỀN CỦA BẠN
const PremiumCoinIcon = ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign: 'middle'}}>
        <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#FFA500" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
        <circle cx="50" cy="50" r="45" stroke="url(#goldGradient)" strokeWidth="4" fill="rgba(255, 215, 0, 0.1)" />
        <circle cx="50" cy="50" r="38" fill="url(#goldGradient)" filter="url(#glow)" />
        <path d="M30 35 H70 M50 35 V75" stroke="#8B4513" strokeWidth="8" strokeLinecap="round" />
        <path d="M50 10 L50 20 M50 80 L50 90 M10 50 L20 50 M80 50 L90 50" stroke="#FFF" strokeWidth="2" opacity="0.6"/>
    </svg>
);

const CreateProduct = () => {
    const [form] = Form.useForm();
    const { currentUser, user } = useChat();
    const navigate = useNavigate();

    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');

    // State Shop
    const [hasShop, setHasShop] = useState(false);
    const [shopInfo, setShopInfo] = useState(null);

    // Check shop 1 lần duy nhất
    const hasCheckedShop = useRef(false);

    useEffect(() => {
        const checkShopStatus = async () => {
            if (hasCheckedShop.current) return;
            hasCheckedShop.current = true;

            try {
                const res = await marketApi.getMyShopInfo();
                if (res.data) {
                    setHasShop(true);
                    setShopInfo(res.data);
                } else {
                    redirectToCreateShop();
                }
            } catch (error) {
                redirectToCreateShop();
            }
        };

        if (currentUser) checkShopStatus();
    }, [currentUser, navigate]);

    const redirectToCreateShop = () => {
        Modal.confirm({
            title: "Khởi tạo Gian Hàng",
            icon: <RocketOutlined style={{ color: '#1890ff' }} />,
            content: "Bạn cần có hồ sơ Shop trước khi đăng bán. Quá trình này hoàn toàn miễn phí!",
            okText: "Tạo Shop Ngay",
            cancelText: "Quay lại",
            centered: true,
            onOk: () => navigate('/market/register-shop'),
            onCancel: () => navigate('/market'),
        });
    };

    const onFinish = async (values) => {
        if (fileList.length === 0) return message.error("Một hình ảnh đáng giá ngàn lời nói! Hãy thêm ít nhất 1 ảnh.");

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', values.name.trim());
            formData.append('price', values.price);
            formData.append('quantity', values.quantity);
            formData.append('category', values.category);
            formData.append('description', values.description.trim());

            // 🟢 THÊM: Phí vận chuyển
            formData.append('shippingFee', values.shippingFee || 0);

            fileList.forEach(file => {
                if (file.originFileObj) formData.append('images', file.originFileObj);
            });

            await marketApi.createProduct(formData);

            Modal.success({
                title: 'Đăng bán thành công!',
                content: (
                    <div>
                        <Paragraph>Sản phẩm <b>{values.name}</b> đang chờ duyệt.</Paragraph>
                        <Text type="secondary">Admin sẽ kiểm tra sớm nhất có thể.</Text>
                    </div>
                ),
                okText: 'Về Quản lý Shop',
                onOk: () => navigate('/market/myshop'),
                centered: true
            });
            form.resetFields();
            setFileList([]);
        } catch (error) {
            console.error(error);
            message.error("Lỗi đăng bán: " + (error.response?.data || "Vui lòng thử lại sau"));
        } finally {
            setLoading(false);
        }
    };

    // Upload & Preview
    const handleUploadChange = ({ fileList: newFileList }) => setFileList(newFileList);
    const handlePreview = async (file) => {
        if (!file.url && !file.preview) file.preview = await getBase64(file.originFileObj);
        setPreviewImage(file.url || file.preview);
        setPreviewOpen(true);
    };
    const getBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

    return (
        <div style={{ padding: '40px 20px', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                {/* HEADER */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <Title level={2} style={{ margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <ShopOutlined style={{ color: '#1890ff' }} /> Đăng Bán Sản Phẩm
                    </Title>
                    <Text type="secondary" style={{ fontSize: 16 }}>Biến ý tưởng kinh doanh của bạn thành hiện thực</Text>
                </div>

                <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ quantity: 1, category: 'Điện tử', shippingFee: 0 }}>
                    <Row gutter={[32, 32]}>

                        {/* CỘT TRÁI: FORM NHẬP LIỆU */}
                        <Col xs={24} lg={16}>
                            <Card
                                bordered={false}
                                style={{ borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                                title={<span style={{fontSize: 18, fontWeight: 600}}>📦 Chi tiết sản phẩm</span>}
                            >
                                <Form.Item
                                    name="name"
                                    label="Tên sản phẩm"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập tên sản phẩm' },
                                        { min: 5, message: 'Tên quá ngắn (tối thiểu 5 ký tự)' },
                                        { max: 120, message: 'Tên quá dài (tối đa 120 ký tự)' }
                                    ]}
                                >
                                    <Input placeholder="VD: iPhone 15 Pro Max 256GB..." size="large" showCount maxLength={120} />
                                </Form.Item>

                                <Row gutter={24}>
                                    <Col span={12}>
                                        <Form.Item
                                            name="price"
                                            label="Giá bán"
                                            rules={[
                                                { required: true, message: 'Vui lòng nhập giá' },
                                                { type: 'number', min: 1000, message: 'Giá tối thiểu là 1,000 Than' }
                                            ]}
                                            tooltip="Giá bán bằng đơn vị Than (Tối thiểu 1,000)"
                                        >
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                size="large"
                                                placeholder="Nhập giá..."
                                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                parser={v => v.replace(/\$\s?|(,*)/g, '')}
                                                // 🟢 ICON TIỀN TỆ CUSTOM
                                                addonAfter={<div style={{display:'flex', alignItems:'center', gap:5}}><PremiumCoinIcon size={20}/> <span style={{fontWeight:'bold', color: '#d48806'}}>THAN</span></div>}
                                            />
                                        </Form.Item>
                                    </Col>

                                    {/* 🟢 THÊM CỘT PHÍ SHIP */}
                                    <Col span={12}>
                                        <Form.Item
                                            name="shippingFee"
                                            label="Phí vận chuyển"
                                            tooltip="Nhập 0 để Freeship"
                                            rules={[{ type: 'number', min: 0, message: 'Không được âm' }]}
                                        >
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                size="large"
                                                min={0}
                                                placeholder="0 = Freeship"
                                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                parser={v => v.replace(/\$\s?|(,*)/g, '')}
                                                prefix={<CarOutlined style={{color: '#888'}} />}
                                                addonAfter="Than"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Row gutter={24}>
                                    <Col span={12}>
                                        <Form.Item
                                            name="quantity"
                                            label="Số lượng kho"
                                            rules={[
                                                { required: true, message: 'Nhập số lượng' },
                                                { type: 'number', min: 1, message: 'Phải có ít nhất 1 sản phẩm' }
                                            ]}
                                        >
                                            <InputNumber style={{ width: '100%' }} size="large" min={1} placeholder="1" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="category" label="Danh mục sản phẩm">
                                            <Select size="large">
                                                <Option value="Điện tử">🖥️ Điện tử & Công nghệ</Option>
                                                <Option value="Thời trang">👕 Thời trang & Phụ kiện</Option>
                                                <Option value="Nhà cửa">🏠 Nhà cửa & Đời sống</Option>
                                                <Option value="Sách">📚 Sách & Văn phòng phẩm</Option>
                                                <Option value="Khác">✨ Khác</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item
                                    name="description"
                                    label="Mô tả chi tiết"
                                    rules={[
                                        { required: true, message: 'Mô tả chi tiết giúp bán nhanh hơn' },
                                        { min: 20, message: 'Mô tả quá ngắn (tối thiểu 20 ký tự)' }
                                    ]}
                                >
                                    <Input.TextArea
                                        rows={6}
                                        placeholder="Mô tả tình trạng, xuất xứ, chính sách bảo hành, điểm nổi bật..."
                                        showCount
                                        maxLength={3000}
                                        style={{resize: 'none'}}
                                    />
                                </Form.Item>
                            </Card>

                            {/* UPLOAD AREA */}
                            <Card
                                bordered={false}
                                style={{ marginTop: 20, borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                                title={<span style={{fontSize: 18, fontWeight: 600}}>📷 Hình ảnh (Tối đa 5 ảnh)</span>}
                            >
                                <div style={{background: '#fafafa', padding: 20, borderRadius: 12, border: '2px dashed #d9d9d9', textAlign: 'center'}}>
                                    <Upload
                                        listType="picture-card"
                                        fileList={fileList}
                                        onPreview={handlePreview}
                                        onChange={handleUploadChange}
                                        beforeUpload={() => false}
                                        maxCount={5}
                                        accept="image/*"
                                        style={{width: '100%'}}
                                    >
                                        {fileList.length < 5 && (
                                            <div>
                                                <CloudUploadOutlined style={{fontSize: 24, color: '#1890ff'}} />
                                                <div style={{ marginTop: 8, fontWeight: 500 }}>Tải ảnh lên</div>
                                            </div>
                                        )}
                                    </Upload>
                                    <Text type="secondary" style={{fontSize: 12}}>Hỗ trợ JPG, PNG. Ảnh đầu tiên sẽ là ảnh bìa.</Text>
                                </div>
                            </Card>
                        </Col>

                        {/* CỘT PHẢI: THÔNG TIN NGƯỜI BÁN */}
                        <Col xs={24} lg={8}>
                            <Card
                                bordered={false}
                                hoverable
                                style={{ borderRadius: 20, marginBottom: 20, background: '#fff', border: '1px solid #f0f0f0', position: 'sticky', top: 20 }}
                                bodyStyle={{padding: 24}}
                            >
                                <div style={{ textAlign: 'center' }}>
                                    <Text type="secondary" style={{textTransform: 'uppercase', letterSpacing: 1, fontSize: 12}}>Đăng bán bởi</Text>
                                    <Divider style={{margin: '12px 0'}} />

                                    {hasShop ? (
                                        <>
                                            <Badge count={<CheckCircleOutlined style={{ color: '#1890ff' }} />} offset={[-10, 50]}>
                                                <Avatar size={80} src={shopInfo?.avatarUrl || user?.avatarUrl} icon={<ShopOutlined />} style={{boxShadow: '0 4px 12px rgba(0,0,0,0.15)'}} />
                                            </Badge>

                                            <Title level={4} style={{ marginTop: 15, marginBottom: 5 }}>{shopInfo?.shopName}</Title>
                                            <Rate disabled allowHalf defaultValue={shopInfo?.rating || 5} style={{fontSize: 14, color: '#fadb14'}} />

                                            <div style={{textAlign: 'left', marginTop: 20, background: '#f6ffed', padding: 15, borderRadius: 12, border: '1px solid #b7eb8f'}}>
                                                <div style={{marginBottom: 8}}><EnvironmentOutlined style={{color:'#52c41a'}} /> <b>Kho:</b> {shopInfo?.address}</div>
                                                <div style={{marginBottom: 8}}><ShopOutlined style={{color:'#52c41a'}} /> <b>Đã bán:</b> {shopInfo?.totalSold || 0} đơn</div>
                                                <div><InfoCircleOutlined style={{color:'#52c41a'}} /> <b>Trạng thái:</b> <span style={{color: '#52c41a', fontWeight: 'bold'}}>Hoạt động</span></div>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{padding: '20px 0'}}>
                                            <ShopOutlined style={{fontSize: 40, color: '#d9d9d9'}} />
                                            <p style={{color: '#999', marginTop: 10}}>Đang tải thông tin shop...</p>
                                        </div>
                                    )}
                                </div>

                                <Divider />

                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    block
                                    size="large"
                                    loading={loading}
                                    icon={<RocketOutlined />}
                                    style={{
                                        height: 54, fontSize: 18, fontWeight: 'bold',
                                        background: 'linear-gradient(90deg, #1890ff 0%, #096dd9 100%)',
                                        border: 'none',
                                        borderRadius: 12,
                                        boxShadow: '0 8px 20px rgba(24, 144, 255, 0.4)'
                                    }}
                                >
                                    ĐĂNG BÁN NGAY
                                </Button>
                                <div style={{textAlign: 'center', marginTop: 15, fontSize: 12, color: '#888'}}>
                                    Bằng việc đăng bán, bạn đồng ý với <a href="#">chính sách</a> của chúng tôi.
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </Form>
            </div>

            <Modal open={previewOpen} title="Xem trước ảnh" footer={null} onCancel={() => setPreviewOpen(false)}>
                <img alt="example" style={{ width: '100%' }} src={previewImage} />
            </Modal>
        </div>
    );
};

export default CreateProduct;