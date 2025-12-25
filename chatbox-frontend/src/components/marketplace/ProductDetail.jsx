import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Row, Col, Image, Typography, Button, Card, Rate, Avatar,
    Tag, Space, InputNumber, message, Divider, Spin, Breadcrumb, Tabs, List, Form, Input
} from 'antd';
import {
    ShoppingCartOutlined, MessageOutlined, ShopOutlined,
    CheckCircleOutlined, SafetyCertificateFilled, HomeOutlined, UserOutlined, CarOutlined
} from '@ant-design/icons';
import { marketApi } from './MarketAPI';
import { useCart } from '../../context/CartContext';
import { useChat } from '../../context/ChatContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { currentUser } = useChat();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [previewImage, setPreviewImage] = useState('');

    const [reviews, setReviews] = useState([]);
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        fetchDetail();
        fetchReviews();
    }, [id]);

    const fetchDetail = async () => {
        try {
            const res = await marketApi.getProductDetail(id);
            setProduct(res.data);
            if(res.data.images?.length > 0) setPreviewImage(res.data.images[0]);
        } catch (error) {
            message.error("Không tìm thấy sản phẩm");
            navigate('/market');
        } finally { setLoading(false); }
    };

    const fetchReviews = async () => {
        try {
            const res = await marketApi.getProductReviews(id);
            setReviews(res.data || []);
        } catch (e) { console.error("Lỗi tải review", e); }
    };

    const handleQuantityChange = (val) => {
        if (!product) return;
        if (val > product.quantity) {
            message.warning(`Kho chỉ còn ${product.quantity} sản phẩm!`);
            setQuantity(product.quantity);
        } else {
            setQuantity(val || 1);
        }
    };

    // 🟢 ĐÃ SỬA: Bỏ message.success ở đây để tránh lặp (Vì Context đã có)
    const handleAddToCart = () => {
        addToCart(product, quantity);
    };

    const handleSubmitReview = async (values) => {
        if (!currentUser) return message.warning("Đăng nhập để đánh giá");
        setSubmittingReview(true);
        try {
            await marketApi.createReview({
                productId: id,
                rating: values.rating,
                comment: values.comment
            });
            message.success("Cảm ơn đánh giá của bạn!");
            fetchReviews();
        } catch (e) {
            message.error("Lỗi gửi đánh giá: " + e.response?.data);
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleChat = () => {
        if (!currentUser) return message.warning("Vui lòng đăng nhập!");
        navigate('/chat', {
            state: { targetUser: { username: product.seller.username, avatar: product.seller.avatar || product.shop?.avatarUrl } }
        });
    };

    const handleViewShop = () => {
        navigate(`/market/shop/${product.seller.username}`);
    };

    if (loading) return <div style={{textAlign: 'center', marginTop: 100}}><Spin size="large"/></div>;
    if (!product) return null;

    const isOwner = currentUser && product.seller?.username === currentUser;

    return (
        <div style={{ maxWidth: 1200, margin: '20px auto', padding: '0 20px' }}>
            <Breadcrumb style={{ marginBottom: 20 }}>
                <Breadcrumb.Item href="/market"><HomeOutlined /> Chợ</Breadcrumb.Item>
                <Breadcrumb.Item>{product.category}</Breadcrumb.Item>
                <Breadcrumb.Item>{product.name}</Breadcrumb.Item>
            </Breadcrumb>

            <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Row gutter={[40, 40]}>
                    <Col xs={24} md={10}>
                        <div style={{ border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: '#fafafa', aspectRatio: '1/1', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Image.PreviewGroup items={product.images}>
                                <Image src={previewImage || "https://via.placeholder.com/500"} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </Image.PreviewGroup>
                        </div>
                        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 5 }}>
                            {product.images?.map((img, idx) => (
                                <div key={idx} onMouseEnter={() => setPreviewImage(img)} onClick={() => setPreviewImage(img)} style={{ width: 70, height: 70, flexShrink: 0, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', border: previewImage === img ? '2px solid #1890ff' : '1px solid #d9d9d9', padding: 2 }}>
                                    <img src={img} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                                </div>
                            ))}
                        </div>
                    </Col>

                    <Col xs={24} md={14}>
                        <Title level={2} style={{ marginBottom: 5 }}>{product.name}</Title>

                        <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 15}}>
                            <Rate disabled allowHalf defaultValue={4.5} style={{fontSize: 14, color: '#fadb14'}} />
                            <Text type="secondary" style={{fontSize: 14, borderLeft:'1px solid #ddd', paddingLeft: 10}}>Đã bán: {product.shop?.totalSold || 0}+</Text>
                        </div>

                        <div style={{ background: '#fafafa', padding: '15px 20px', borderRadius: 8, marginBottom: 25 }}>
                            <Text style={{ fontSize: 30, color: '#ff4d4f', fontWeight: 'bold' }}>{product.price?.toLocaleString()} Than</Text>

                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, color: '#555' }}>
                                <CarOutlined />
                                <Text>Vận chuyển:</Text>
                                {product.shippingFee > 0 ? (
                                    <Text strong>{product.shippingFee.toLocaleString()} Than</Text>
                                ) : (
                                    <Tag color="green">Miễn phí vận chuyển</Tag>
                                )}
                            </div>
                        </div>

                        <Card size="small" style={{borderRadius: 8, marginBottom: 25, borderColor: '#d9d9d9'}}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                <Avatar size={54} src={product.shop?.avatarUrl || product.seller?.avatar} icon={<ShopOutlined />} />
                                <div style={{ flex: 1 }}>
                                    <Text strong style={{ fontSize: 16 }}>{product.shop?.shopName || product.seller?.username}</Text>
                                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{product.shop?.address}</div>
                                </div>
                                <Space>
                                    {!isOwner && <Button size="small" icon={<MessageOutlined />} onClick={handleChat}>Chat ngay</Button>}
                                    <Button size="small" onClick={handleViewShop}>Xem Shop</Button>
                                </Space>
                            </div>
                        </Card>

                        <div style={{ marginBottom: 30 }}>
                            <div style={{ marginBottom: 8 }}><Text type="secondary">Số lượng</Text></div>
                            <Space>
                                <InputNumber min={1} max={product.quantity} value={quantity} onChange={handleQuantityChange} />
                                <Text type="secondary" style={{fontSize: 12}}>({product.quantity} có sẵn)</Text>
                            </Space>
                        </div>

                        <Space size={16}>
                            {/* Nút Thêm vào giỏ gọi hàm đã sửa */}
                            <Button type="primary" ghost size="large" icon={<ShoppingCartOutlined />} style={{ height: 48, minWidth: 160, fontSize: 16, borderColor: '#ff4d4f', color: '#ff4d4f' }} onClick={handleAddToCart} disabled={product.quantity <= 0 || isOwner}>Thêm vào giỏ</Button>

                            <Button type="primary" size="large" style={{ height: 48, minWidth: 160, fontSize: 16, background: '#ff4d4f', borderColor: '#ff4d4f' }} onClick={() => { if(quantity <= product.quantity && !isOwner){ handleAddToCart(); navigate('/market/cart'); } }} disabled={product.quantity <= 0 || isOwner}>Mua ngay</Button>
                        </Space>

                        <Divider />
                        <div style={{ display: 'flex', gap: 20, color: '#666', fontSize: 13 }}>
                            <span><SafetyCertificateFilled style={{color: '#52c41a'}} /> Đảm bảo hoàn tiền</span>
                            <span><CheckCircleOutlined style={{color: '#1890ff'}} /> Được kiểm tra hàng</span>
                        </div>
                    </Col>
                </Row>

                <div style={{ marginTop: 40 }}>
                    <Tabs defaultActiveKey="1" type="card" items={[
                        { key: '1', label: 'Mô tả sản phẩm', children: <div style={{ padding: 20, background: '#fafafa', borderRadius: 8, whiteSpace: 'pre-line', fontSize: 15, lineHeight: 1.6 }}>{product.description}</div> },
                        { key: '2', label: `Đánh giá (${reviews.length})`, children: (
                                <div style={{padding: 20}}>
                                    {!isOwner && (
                                        <div style={{marginBottom: 30, background: '#f6ffed', padding: 20, borderRadius: 8, border: '1px solid #b7eb8f'}}>
                                            <Text strong>Viết đánh giá của bạn</Text>
                                            <Form layout="vertical" onFinish={handleSubmitReview} style={{marginTop: 10}}>
                                                <Form.Item name="rating" initialValue={5}><Rate /></Form.Item>
                                                <Form.Item name="comment" rules={[{required: true, message: 'Hãy viết gì đó...'}]}><Input.TextArea rows={3} placeholder="Sản phẩm thế nào? Giao hàng nhanh không?" /></Form.Item>
                                                <Button type="primary" htmlType="submit" loading={submittingReview}>Gửi đánh giá</Button>
                                            </Form>
                                        </div>
                                    )}
                                    <List itemLayout="horizontal" dataSource={reviews} renderItem={item => (
                                        <List.Item><List.Item.Meta avatar={<Avatar icon={<UserOutlined />} src={item.user?.avatar} />} title={<div style={{display:'flex', gap: 10}}><Text strong>{item.user?.username}</Text><Rate disabled defaultValue={item.rating} style={{fontSize: 12}} /><Text type="secondary" style={{fontSize: 12}}>{dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}</Text></div>} description={item.comment} /></List.Item>
                                    )} locale={{emptyText: 'Chưa có đánh giá nào. Hãy là người đầu tiên!'}} />
                                </div>
                            )}
                    ]} />
                </div>
            </Card>
        </div>
    );
};
export default ProductDetail;