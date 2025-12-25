import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Input, Typography, Spin, Badge, Empty, Button, Tag, Avatar, Tooltip } from 'antd';
import {
    SearchOutlined, ShoppingCartOutlined, ShopOutlined,
    CheckCircleFilled, StarFilled, FireFilled, SafetyCertificateFilled
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { marketApi } from './MarketAPI';
import { useCart } from '../../context/CartContext';
import MarketLayout from './MarketLayout';
import PremiumCoinIcon from '../common/PremiumCoinIcon'; // 🟢 Import icon mới tạo

const { Meta } = Card;
const { Title, Text } = Typography;

const ProductList = () => {
    const [allProducts, setAllProducts] = useState([]);
    const [displayProducts, setDisplayProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [layoutFilters, setLayoutFilters] = useState({ category: [], priceRange: [0, 1000000000] });

    const navigate = useNavigate();
    const { addToCart } = useCart();

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await marketApi.getAllProducts();
            const products = res.data || [];

            const approvedProducts = products.filter(p => p.status === 'APPROVED');

            setAllProducts(approvedProducts.reverse());
            setDisplayProducts(approvedProducts);
        } catch (error) {
            console.error("Lỗi tải sản phẩm:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let result = allProducts;
        if (searchText) result = result.filter(p => p.name.toLowerCase().includes(searchText.toLowerCase()));
        if (layoutFilters.category?.length > 0) result = result.filter(p => layoutFilters.category.includes(p.category));
        if (layoutFilters.priceRange) {
            const [min, max] = layoutFilters.priceRange;
            result = result.filter(p => p.price >= min && p.price <= max);
        }
        result = result.filter(p => p.status === 'APPROVED');
        setDisplayProducts(result);
    }, [allProducts, searchText, layoutFilters]);

    const handleLayoutFilterChange = (newFilters) => setLayoutFilters(prev => ({ ...prev, ...newFilters }));

    const handleQuickAdd = (e, prod) => {
        e.stopPropagation();
        e.preventDefault();
        addToCart(prod, 1);
    };

    return (
        <MarketLayout onFilterChange={handleLayoutFilterChange}>
            {/* THANH TÌM KIẾM (Giữ nguyên theo ý bạn) */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: 12, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
                <Title level={4} style={{ margin: 0, minWidth: 100 }}>🛍️ Chợ Chat</Title>
                <Input size="middle" placeholder="Bạn tìm gì hôm nay?" prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} allowClear value={searchText} onChange={e => setSearchText(e.target.value)} style={{ borderRadius: 8, flex: 1 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                    <Button icon={<ShopOutlined />} onClick={() => navigate('/market/myshop')}>Shop của tôi</Button>
                    <Button type="primary" onClick={() => navigate('/market/create')}>+ Đăng tin</Button>
                </div>
            </div>

            {/* GRID SẢN PHẨM CAO CẤP */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" tip="Đang tải..." /></div>
            ) : displayProducts.length === 0 ? (
                <Empty description="Không có sản phẩm nào" style={{ marginTop: 50 }} />
            ) : (
                <Row gutter={[12, 12]}>
                    {displayProducts.map(prod => (
                        <Col key={prod.id} xs={12} sm={8} md={6} lg={4} xl={4}>
                            <div className="product-card-container">
                                <Card
                                    hoverable
                                    bordered={false}
                                    style={{ borderRadius: 12, overflow: 'hidden', height: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                    bodyStyle={{ padding: '10px' }}
                                    onClick={() => navigate(`/market/product/${prod.id}`)}
                                    cover={
                                        <div style={{ position: 'relative', paddingTop: '100%', overflow: 'hidden', background: '#f0f2f5' }}>
                                            <img
                                                alt={prod.name}
                                                src={prod.images?.[0] || "https://via.placeholder.com/300"}
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                                                className="prod-img"
                                            />
                                            {/* Badge Hot/New */}
                                            {(prod.sold > 20 || prod.quantity <= 0) && (
                                                <div style={{ position: 'absolute', top: 0, left: 0, background: prod.quantity <= 0 ? '#8c8c8c' : '#ff4d4f', color: '#fff', fontSize: 10, fontWeight: 'bold', padding: '2px 8px', borderBottomRightRadius: 10, zIndex: 1 }}>
                                                    {prod.quantity <= 0 ? "HẾT HÀNG" : "BÁN CHẠY"}
                                                </div>
                                            )}
                                            {/* Danh mục */}
                                            <Tag color="rgba(0,0,0,0.5)" style={{position: 'absolute', top: 5, right: 5, color: '#fff', border: 'none', backdropFilter: 'blur(4px)', fontSize: 10, margin: 0, borderRadius: 4}}>
                                                {prod.category}
                                            </Tag>
                                        </div>
                                    }
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                        {/* 1. Tên Sản phẩm */}
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#262626', lineHeight: '1.4', height: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 6 }}>
                                            {prod.name}
                                        </div>

                                        {/* 2. Giá & Trạng thái hàng */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <PremiumCoinIcon size={18} />
                                                <span style={{ fontSize: 15, fontWeight: 700, color: '#faad14' }}>
                                                    {prod.price >= 1000 ? (prod.price / 1000).toFixed(1) + 'k' : prod.price}
                                                </span>
                                            </div>
                                            {/* 🟢 Trạng thái hàng: Xanh (Còn) - Xám (Hết) */}
                                            {prod.quantity > 0 ? (
                                                <Tooltip title={`Còn ${prod.quantity} sản phẩm`}>
                                                    <Badge color="#52c41a" text={<span style={{fontSize: 10, color: '#52c41a'}}>Còn hàng</span>} />
                                                </Tooltip>
                                            ) : (
                                                <Badge color="#d9d9d9" text={<span style={{fontSize: 10, color: '#999'}}>Hết hàng</span>} />
                                            )}
                                        </div>

                                        {/* 3. Phân cách */}
                                        <div style={{ borderTop: '1px dashed #f0f0f0', margin: '0 0 8px 0' }}></div>

                                        {/* 4. Footer: Shop Info & Stats */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            {/* Shop */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
                                                <Avatar size={20} src={prod.shop?.avatarUrl || prod.seller?.avatar} icon={<ShopOutlined />} style={{border: '1px solid #f0f0f0', flexShrink: 0}} />
                                                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                    <div style={{display:'flex', alignItems:'center', gap: 2}}>
                                                        <Text ellipsis style={{ fontSize: 11, color: '#595959', fontWeight: 500 }}>
                                                            {prod.shop?.shopName || prod.seller?.username}
                                                        </Text>
                                                        {prod.shop && <CheckCircleFilled style={{ color: '#1890ff', fontSize: 10 }} />}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Rating & Sold */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <div style={{ fontSize: 10, color: '#faad14', display: 'flex', alignItems: 'center' }}>
                                                    {prod.shop?.rating || 5} <StarFilled style={{ fontSize: 9, marginLeft: 1 }} />
                                                </div>
                                                <div style={{ fontSize: 10, color: '#bfbfbf' }}>
                                                    Đã bán {prod.shop?.totalSold || 0}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Nút thêm giỏ hàng (Chỉ hiện khi hover qua CSS) */}
                                        {prod.quantity > 0 && (
                                            <Button
                                                type="primary" shape="circle" icon={<ShoppingCartOutlined />}
                                                className="add-cart-btn"
                                                onClick={(e) => handleQuickAdd(e, prod)}
                                            />
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </Col>
                    ))}
                </Row>
            )}

            {/* CSS Tùy chỉnh cho hiệu ứng */}
            <style jsx>{`
                .product-card-container .ant-card-cover img {
                    transition: transform 0.5s ease;
                }
                .product-card-container:hover .ant-card-cover img {
                    transform: scale(1.08);
                }
                .product-card-container:hover .ant-card {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
                    transition: all 0.3s ease;
                }
                .add-cart-btn {
                    position: absolute;
                    top: 50%;
                    right: 10px;
                    transform: translateY(-50%) scale(0);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 4px 10px rgba(24, 144, 255, 0.4);
                    z-index: 10;
                }
                /* Hiển thị nút khi hover vào Card */
                .product-card-container:hover .add-cart-btn {
                    top: 45%; /* Đẩy lên vị trí đẹp trên ảnh */
                    transform: translateY(-50%) scale(1);
                    opacity: 1;
                }
            `}</style>
        </MarketLayout>
    );
};

export default ProductList;