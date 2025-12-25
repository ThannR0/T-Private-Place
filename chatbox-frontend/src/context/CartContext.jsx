// src/context/CartContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { message } from 'antd';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);

    useEffect(() => {
        const savedCart = localStorage.getItem('chatterbox_cart');
        if (savedCart) setCart(JSON.parse(savedCart));
    }, []);

    useEffect(() => {
        localStorage.setItem('chatterbox_cart', JSON.stringify(cart));
    }, [cart]);

    // Thêm vào giỏ (Có kiểm tra tồn kho)
    const addToCart = (product, quantity = 1) => {
        setCart(prev => {
            const existItem = prev.find(item => item.product.id === product.id);
            const currentQtyInCart = existItem ? existItem.quantity : 0;

            // Kiểm tra tổng số lượng
            if (currentQtyInCart + quantity > product.quantity) {
                message.warning(`Kho chỉ còn ${product.quantity} sản phẩm. Bạn đã có ${currentQtyInCart} trong giỏ.`);
                // Nếu chưa có trong giỏ thì thêm tối đa, có rồi thì thôi hoặc cộng phần dư (ở đây chọn phương án báo lỗi để user tự chỉnh)
                return prev;
            }

            if (existItem) {
                message.success('Đã cập nhật số lượng!');
                return prev.map(item => item.product.id === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                );
            }

            message.success('Đã thêm vào giỏ hàng!');
            return [...prev, { product, quantity }];
        });
    };

    // Cập nhật số lượng (Dùng cho trang Checkout/CartDrawer)
    const updateQuantity = (productId, newQuantity) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                // Logic chặn vượt quá tồn kho
                if (newQuantity > item.product.quantity) {
                    message.warning(`Rất tiếc, shop chỉ còn ${item.product.quantity} sản phẩm này!`);
                    return { ...item, quantity: item.product.quantity }; // Trả về max kho
                }
                // Không cho nhập số âm hoặc 0
                if (newQuantity < 1) return item;

                return { ...item, quantity: newQuantity };
            }
            return item;
        }));
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
        message.info("Đã xóa sản phẩm");
    };

    const clearCart = () => setCart([]);

    return (
        <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);