import React from 'react';
import { Drawer, List, Avatar, Button, Typography, InputNumber, Divider, Empty } from 'antd';
import { DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';

const { Text, Title } = Typography;

const CartDrawer = ({ visible, onClose }) => {
    const { cart, removeFromCart, addToCart } = useCart(); // addToCart dùng để update số lượng (+/-)
    const navigate = useNavigate();

    const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    const handleCheckout = () => {
        onClose();
        navigate('/market/cart'); // Chuyển sang trang thanh toán chi tiết
    };

    return (
        <Drawer
            title={<span><ShoppingCartOutlined /> Giỏ hàng ({cart.length})</span>}
            placement="right"
            onClose={onClose}
            open={visible}
            width={400}
            footer={
                cart.length > 0 && (
                    <div style={{ padding: '10px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                            <Text strong>Tổng cộng:</Text>
                            <Text strong type="danger" style={{ fontSize: 18 }}>{totalAmount.toLocaleString()} T</Text>
                        </div>
                        <Button type="primary" block size="large" onClick={handleCheckout}>
                            THANH TOÁN NGAY
                        </Button>
                    </div>
                )
            }
        >
            {cart.length === 0 ? (
                <Empty description="Giỏ hàng trống trơn!" />
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={cart}
                    renderItem={item => (
                        <List.Item
                            actions={[
                                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeFromCart(item.product.id)} />
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<Avatar src={item.product.images?.[0]} shape="square" size={60} />}
                                title={<Text ellipsis style={{ width: 160 }}>{item.product.name}</Text>}
                                description={
                                    <div>
                                        <div style={{ color: '#faad14', fontWeight: 'bold' }}>{item.product.price.toLocaleString()} T</div>
                                        <div style={{ marginTop: 5 }}>
                                            {/* Logic tăng giảm số lượng hơi trick: thêm 1 hoặc thêm -1 */}
                                            <InputNumber
                                                min={1}
                                                max={item.product.quantity}
                                                value={item.quantity}
                                                onChange={(val) => {
                                                    // Đây là logic đơn giản, để chuẩn hơn nên có hàm updateQuantity trong Context
                                                    // Hiện tại ta dùng tạm addToCart để cộng dồn chênh lệch (logic này cần Context hỗ trợ update, nếu chưa có thì chỉ hiển thị readonly hoặc làm nút +/-)
                                                }}
                                                size="small"
                                                disabled // Tạm thời disable sửa số lượng ở đây cho đơn giản
                                            />
                                            <span style={{marginLeft: 5, fontSize: 12}}>x {item.quantity}</span>
                                        </div>
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            )}
        </Drawer>
    );
};

export default CartDrawer;