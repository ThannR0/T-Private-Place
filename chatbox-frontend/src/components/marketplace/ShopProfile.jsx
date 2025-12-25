import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Avatar, Typography, Button, Row, Col, Tabs, Tag, Rate, Spin, Empty, Badge } from 'antd';
import { ShopOutlined, MessageOutlined, CheckCircleOutlined, SettingOutlined, EnvironmentOutlined, UserOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { marketApi } from './MarketAPI';
import { useChat } from '../../context/ChatContext';
import { useCart } from '../../context/CartContext';

const { Title, Text, Paragraph } = Typography;
const { Meta } = Card;

const ShopProfile = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useChat();
    const { addToCart } = useCart();

    const [shop, setShop] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const isOwner = currentUser === username;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [resShop, resProds] = await Promise.all([
                    marketApi.getShopProfile(username),
                    marketApi.getShopProducts(username)
                ]);
                setShop(resShop.data);
                setProducts(resProds.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [username]);

    const handleChat = () => {
        if (!currentUser) return navigate('/login');
        navigate('/chat', { state: { targetUser: { username: shop?.owner?.username, avatar: shop?.avatarUrl } } });
    };

    if (loading) return <div style={{textAlign:'center', padding:50}}><Spin size="large"/></div>;
    if (!shop) return <Empty description="Shop không tồn tại" style={{marginTop:50}} />;

    return (
        <div style={{ maxWidth: 1200, margin: '20px auto', padding: '0 15px' }}>
            <Card bordered={false} style={{ borderRadius: 16, marginBottom: 24, background: 'linear-gradient(135deg, #fff 0%, #f0f2f5 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <Avatar shape="square" size={100} src={shop.avatarUrl} icon={<ShopOutlined />} style={{border: '1px solid #ddd'}} />
                        <Tag color="#f50" style={{position:'absolute', bottom:-10, left:'50%', transform:'translateX(-50%)'}}>Official</Tag>
                    </div>
                    <div style={{ flex: 1 }}>
                        <Title level={3} style={{ marginBottom: 5 }}>{shop.shopName}</Title>
                        <div style={{ display: 'flex', gap: 15, color: '#666', fontSize: 13, marginBottom: 10 }}>
                            <span><Rate disabled allowHalf value={shop.rating || 5} style={{fontSize: 13}} /> ({shop.rating})</span>
                            <span>|</span><span><UserOutlined /> Người theo dõi: 1.2k</span>
                            <span>|</span><span><ShopOutlined /> Sản phẩm: {products.length}</span>
                        </div>
                        <div style={{color: '#888'}}><EnvironmentOutlined /> {shop.address}</div>
                    </div>
                    <div>
                        {isOwner ? (
                            <Button type="primary" icon={<SettingOutlined />} onClick={() => navigate('/market/myshop')}>Quản Lý Shop</Button>
                        ) : (
                            <div style={{display:'flex', gap:10}}>
                                <Button icon={<MessageOutlined />} onClick={handleChat}>Chat Ngay</Button>
                                <Button type="primary" ghost icon={<CheckCircleOutlined />}>Theo Dõi</Button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <Tabs defaultActiveKey="1" items={[
                {
                    key: '1', label: `Sản phẩm (${products.length})`,
                    children: (
                        <Row gutter={[16, 16]}>
                            {products.map(prod => (
                                <Col key={prod.id} xs={12} sm={8} md={6} lg={4}>
                                    <Badge.Ribbon text="Hot" color="red" style={{display: prod.sold > 10 ? 'block':'none'}}>
                                        <Card hoverable cover={<img alt={prod.name} src={prod.images?.[0]} style={{height:150, objectFit:'cover'}} />} actions={[<ShoppingCartOutlined key="c" onClick={()=>addToCart(prod)}/>, <Button size="small" type="link" onClick={()=>navigate(`/market/product/${prod.id}`)}>Xem</Button>]}>
                                            <Meta title={prod.name} description={<span style={{color:'red', fontWeight:'bold'}}>{prod.price.toLocaleString()} T</span>} />
                                        </Card>
                                    </Badge.Ribbon>
                                </Col>
                            ))}
                        </Row>
                    )
                },
                { key: '2', label: 'Giới thiệu', children: <Card><Paragraph>{shop.description || "Chưa có mô tả."}</Paragraph></Card> }
            ]} />
        </div>
    );
};
export default ShopProfile;