import React, { useState, useMemo } from 'react';
import {
    Card, Button, Input, Divider, message, Avatar, Typography,
    Steps, Row, Col, Form, Radio, InputNumber, Space, Statistic, Tag, Modal, Result
} from 'antd';
import {
    UserOutlined, PhoneOutlined, EnvironmentOutlined, CreditCardOutlined,
    DeleteOutlined, ShopOutlined, CheckCircleOutlined, RocketOutlined,
    TagOutlined, ArrowLeftOutlined, CarOutlined, SmileOutlined
} from '@ant-design/icons';
import { useCart } from '../../context/CartContext';
import { marketApi } from './MarketAPI';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Checkout = () => {
    const { cart, updateQuantity, removeFromCart, clearCart } = useCart();
    const [loading, setLoading] = useState(false);
    const [voucherCode, setVoucherCode] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [checkingVoucher, setCheckingVoucher] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('WALLET');
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const groupedItems = useMemo(() => {
        return cart.reduce((acc, item) => {
            const sellerName = item.product.seller?.username || 'Unknown Shop';
            if (!acc[sellerName]) acc[sellerName] = [];
            acc[sellerName].push(item);
            return acc;
        }, {});
    }, [cart]);

    // 🟢 LOGIC TÍNH TIỀN MỚI
    const merchandiseSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    // Tổng phí ship (nếu không có thì = 0)
    const totalShippingFee = cart.reduce((sum, item) => sum + ((item.product.shippingFee || 0) * item.quantity), 0);

    const discountAmount = appliedVoucher ? (merchandiseSubtotal * appliedVoucher.discountPercent) : 0;

    // Tổng thanh toán = Tiền hàng + Tiền ship - Giảm giá
    const totalPayment = merchandiseSubtotal + totalShippingFee - discountAmount;

    // Hàm gọi API check voucher (Giữ nguyên)
    const handleApplyVoucher = async () => {
        if (!voucherCode.trim()) return message.warning("Bạn chưa nhập mã voucher!");
        setCheckingVoucher(true);
        try {
            const res = await marketApi.checkVoucher(voucherCode);
            setAppliedVoucher({
                code: res.data.code,
                discountPercent: res.data.discountPercent
            });
            message.success(`Áp dụng thành công! Giảm ${(res.data.discountPercent * 100).toFixed(0)}%`);
        } catch (error) {
            setAppliedVoucher(null);
            message.error(error.response?.data || "Mã voucher không hợp lệ!");
        } finally {
            setCheckingVoucher(false);
        }
    };

    const onFinish = async (values) => {
        if (cart.length === 0) return message.error("Giỏ hàng trống!");
        setLoading(true);
        try {
            const fullAddress = `${values.fullName} (${values.phone}) | ${values.address}, ${values.ward}, ${values.district}, ${values.city}. Note: ${values.note || ''}`;
            const promises = cart.map(item =>
                marketApi.createOrder({
                    productId: item.product.id,
                    quantity: item.quantity,
                    voucherCode: appliedVoucher ? appliedVoucher.code : null,
                    address: fullAddress
                })
            );
            await Promise.all(promises);
            clearCart();

            // Hiện Modal thông báo thành công
            Modal.success({
                title: 'Đặt hàng thành công!',
                width: 500,
                icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                content: (
                    <div style={{marginTop: 10}}>
                        <p>Đơn hàng của bạn đã được gửi đến người bán.</p>
                        <div style={{background: '#f6ffed', padding: '10px 15px', borderRadius: 8, border: '1px solid #b7eb8f', color: '#52c41a', display: 'flex', alignItems: 'center', gap: 10}}>
                            <SmileOutlined />
                            <span>Vui lòng chờ Shop duyệt và giao hàng.</span>
                        </div>
                    </div>
                ),
                okText: 'Xem đơn hàng của tôi',
                onOk: () => {
                    // Chuyển sang trang "Đơn mua" (Không phải MyShop)
                    navigate('/market/orders');
                },
                centered: true
            });

        } catch (error) {
            message.error("Lỗi: " + (error.response?.data || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Nút quay lại
    const renderBackButton = () => (
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/market')} style={{ marginBottom: 20 }}>
            Quay lại Chợ
        </Button>
    );

    if (cart.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#f5f5f5', minHeight: '100vh' }}>
                {renderBackButton()}
                <Card style={{ maxWidth: 500, margin: '0 auto', borderRadius: 12 }}>
                    <RocketOutlined style={{ fontSize: 60, color: '#ddd' }} />
                    <Title level={3} style={{ color: '#999', marginTop: 20 }}>Giỏ hàng trống</Title>
                    <Button type="primary" onClick={() => navigate('/market')}>Dạo chợ ngay</Button>
                </Card>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>{renderBackButton()}</div>

            <div style={{ maxWidth: 1200, margin: '0 auto 24px' }}>
                <Steps current={1} items={[{ title: 'Giỏ hàng', icon: <ShopOutlined /> }, { title: 'Thanh toán', icon: <CreditCardOutlined /> }, { title: 'Hoàn tất', icon: <CheckCircleOutlined /> }]} style={{ background: '#fff', padding: 20, borderRadius: 12 }} />
            </div>

            <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ city: 'Hà Nội' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ flex: 2, minWidth: '350px' }}>
                        <Card title={<span><EnvironmentOutlined /> Địa chỉ nhận hàng</span>} style={{ marginBottom: 24, borderRadius: 12 }}>
                            <Row gutter={16}>
                                <Col span={12}><Form.Item name="fullName" label="Họ tên" rules={[{required:true}]}><Input prefix={<UserOutlined/>} placeholder="Nguyễn Văn A"/></Form.Item></Col>
                                <Col span={12}><Form.Item name="phone" label="Số điện thoại" rules={[{required:true}]}><Input prefix={<PhoneOutlined/>} placeholder="09xx..."/></Form.Item></Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={8}><Form.Item name="city" label="Tỉnh/Thành phố" rules={[{required:true}]}><Input/></Form.Item></Col>
                                <Col span={8}><Form.Item name="district" label="Quận/Huyện" rules={[{required:true}]}><Input/></Form.Item></Col>
                                <Col span={8}><Form.Item name="ward" label="Phường/Xã" rules={[{required:true}]}><Input/></Form.Item></Col>
                            </Row>
                            <Form.Item name="address" label="Địa chỉ cụ thể" rules={[{required:true}]}><Input placeholder="Số nhà, ngõ..."/></Form.Item>
                            <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2}/></Form.Item>
                        </Card>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {Object.keys(groupedItems).map(seller => (
                                <Card key={seller} title={<span><ShopOutlined /> Shop: {seller}</span>} style={{ borderRadius: 12 }}>
                                    {groupedItems[seller].map((item, idx) => (
                                        <div key={item.product.id}>
                                            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0' }}>
                                                <Avatar shape="square" size={64} src={item.product.images?.[0]} style={{border:'1px solid #f0f0f0'}} />
                                                <div style={{ flex: 1, marginLeft: 15 }}>
                                                    <Text strong>{item.product.name}</Text>
                                                    <div style={{display:'flex', gap: 10, fontSize: 13}}>
                                                        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{item.product.price.toLocaleString()} T</span>
                                                        {/* 🟢 HIỂN THỊ SHIP TỪNG MÓN */}
                                                        <span style={{ color: '#888' }}><CarOutlined /> Ship: {item.product.shippingFee > 0 ? item.product.shippingFee.toLocaleString() : 'Free'}</span>
                                                    </div>
                                                </div>
                                                <Space>
                                                    <InputNumber
                                                        min={1}
                                                        max={item.product.quantity}
                                                        value={item.quantity}
                                                        onChange={(v) => updateQuantity(item.product.id, v)}
                                                        status={item.quantity >= item.product.quantity ? "warning" : ""}
                                                    />
                                                    <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeFromCart(item.product.id)} />
                                                </Space>
                                            </div>
                                            {idx < groupedItems[seller].length - 1 && <Divider style={{ margin: '10px 0' }} />}
                                        </div>
                                    ))}
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <Card title={<span><TagOutlined /> Thanh toán & Voucher</span>} style={{ position: 'sticky', top: 20, borderRadius: 12 }}>
                            <div style={{marginBottom: 20}}>
                                <Text strong>Mã giảm giá</Text>
                                <Space.Compact style={{ width: '100%', marginTop: 5 }}>
                                    <Input prefix={<TagOutlined style={{color:'#bfbfbf'}} />} placeholder="Nhập mã voucher" value={voucherCode} onChange={e => setVoucherCode(e.target.value)} disabled={!!appliedVoucher} />
                                    {appliedVoucher ? (
                                        <Button danger onClick={() => { setAppliedVoucher(null); setVoucherCode(''); }}>Hủy</Button>
                                    ) : (
                                        <Button type="primary" onClick={handleApplyVoucher} loading={checkingVoucher}>Áp dụng</Button>
                                    )}
                                </Space.Compact>
                                {appliedVoucher && <Text type="success" style={{fontSize: 12}}>Đã áp dụng: {appliedVoucher.code}</Text>}
                            </div>
                            <Divider />

                            {/* 🟢 CẬP NHẬT CHI TIẾT THANH TOÁN */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><Text type="secondary">Tạm tính:</Text><Text>{merchandiseSubtotal.toLocaleString()} T</Text></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                <Text type="secondary">Phí vận chuyển:</Text>
                                <Text>{totalShippingFee > 0 ? totalShippingFee.toLocaleString() : '0'} T</Text>
                            </div>
                            {appliedVoucher && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <Text type="success">Voucher ({(appliedVoucher.discountPercent * 100).toFixed(0)}%):</Text>
                                    <Text type="success">- {discountAmount.toLocaleString()} T</Text>
                                </div>
                            )}

                            <Divider dashed />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
                                <Text strong style={{ fontSize: 16 }}>Tổng thanh toán:</Text>
                                <Statistic value={totalPayment} suffix="T" valueStyle={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: 24 }} />
                            </div>
                            <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ height: 50, background: 'linear-gradient(90deg, #ff4d4f 0%, #ff7875 100%)', border: 'none', fontWeight: 'bold', fontSize: 16 }}>
                                ĐẶT HÀNG ({cart.length})
                            </Button>
                        </Card>
                    </div>
                </div>
            </Form>
        </div>
    );
};

export default Checkout;