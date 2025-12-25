import React, { useEffect, useState } from 'react';
import { Modal, List, Tag, Typography, Button, Empty, Skeleton, message } from 'antd';
import { GiftOutlined, CopyOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../../services/api'; // Đường dẫn api của bạn
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const VoucherWalletModal = ({ visible, onClose }) => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchMyVouchers();
        }
    }, [visible]);

    const fetchMyVouchers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/vouchers/my-vouchers');
            setVouchers(res.data);
        } catch (error) {
            console.error(error);
            message.error("Lỗi tải danh sách voucher");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code);
        message.success("Đã sao chép mã: " + code);
    };

    return (
        <Modal
            title={<div style={{display:'flex', alignItems:'center', gap: 8}}><GiftOutlined style={{color: '#cf1322'}}/> Kho Voucher Của Tôi</div>}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
        >
            {loading ? <Skeleton active /> : (
                <List
                    dataSource={vouchers}
                    locale={{ emptyText: <Empty description="Bạn chưa có voucher nào. Hãy nạp thêm để thăng hạng!" /> }}
                    renderItem={item => (
                        <List.Item>
                            <div style={{
                                display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center',
                                background: '#fff', padding: '15px', borderRadius: 12,
                                border: '1px dashed #1890ff', position: 'relative', overflow: 'hidden'
                            }}>
                                {/* Trang trí */}
                                <div style={{position:'absolute', left: 0, top: 0, bottom: 0, width: 6, background: '#1890ff'}}></div>

                                <div style={{flex: 1, paddingLeft: 10}}>
                                    <div style={{display:'flex', gap: 10, alignItems:'center', marginBottom: 5}}>
                                        <Tag color="blue" style={{fontWeight:'bold', fontSize: 14}}>{item.code}</Tag>
                                        {item.discountPercent > 0 && <Tag color="red">-{item.discountPercent * 100}%</Tag>}
                                        {item.discountAmount > 0 && <Tag color="red">-{item.discountAmount.toLocaleString()}đ</Tag>}
                                    </div>
                                    <Text strong>{item.description || "Voucher khuyến mãi"}</Text>
                                    <div style={{marginTop: 5, fontSize: 12, color: '#888'}}>
                                        <ClockCircleOutlined /> Hết hạn: {dayjs(item.expirationDate).format('DD/MM/YYYY')}
                                    </div>
                                </div>

                                <Button
                                    type="primary"
                                    ghost
                                    icon={<CopyOutlined />}
                                    onClick={() => handleCopy(item.code)}
                                >
                                    Sao chép
                                </Button>
                            </div>
                        </List.Item>
                    )}
                />
            )}
        </Modal>
    );
};

export default VoucherWalletModal;