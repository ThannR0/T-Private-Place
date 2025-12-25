import React, { useState } from 'react';
import { Modal, Steps, Typography, Card, Tag, Button, Progress, Row, Col, Divider, Tooltip } from 'antd';
import {
    GiftOutlined, CheckCircleFilled, SketchOutlined,
    ThunderboltFilled, StarFilled, ClockCircleOutlined,
    WalletOutlined // 🟢 Import icon ví
} from '@ant-design/icons';

// 🟢 Import Modal Kho Voucher (Đảm bảo bạn đã tạo file này cùng thư mục)
import VoucherWalletModal from "./VoucherWallerModal.jsx";

const { Title, Text } = Typography;

// CẤU HÌNH CẤP ĐỘ & PHẦN THƯỞNG % (MỚI)
const VIP_LEVELS_DATA = [
    { name: 'MEMBER', min: 0, color: '#595959', percent: 0, reward: 'Tính năng cơ bản', icon: '👤' },
    { name: 'BRONZE', min: 500000, color: '#CD7F32', percent: 3, reward: 'Voucher giảm 3%', icon: '🥉' },
    { name: 'SILVER', min: 5000000, color: '#757575', percent: 5, reward: 'Voucher giảm 5%', icon: '🛡️' },
    { name: 'GOLD', min: 15000000, color: '#DAA520', percent: 10, reward: 'Voucher giảm 10%', icon: '👑' },
    { name: 'PLATINUM', min: 80000000, color: '#2F4F4F', percent: 15, reward: 'Voucher giảm 15%', icon: '💠' },
    { name: 'DIAMOND', min: 250000000, color: '#00BFFF', percent: 25, reward: 'Voucher giảm 25%', icon: '💎' },
    { name: 'TITANIUM', min: 1000000000, color: '#722ed1', percent: 35, reward: 'Voucher giảm 35%', icon: '⚛️' }
];

const VipDetailModal = ({ visible, onClose, currentTotalDeposit, onDepositClick }) => {

    // State quản lý hiển thị Kho Voucher
    const [walletVisible, setWalletVisible] = useState(false);

    // Tìm Level hiện tại
    const currentLevelIndex = VIP_LEVELS_DATA.findLastIndex(l => currentTotalDeposit >= l.min);
    const currentLevel = VIP_LEVELS_DATA[currentLevelIndex] || VIP_LEVELS_DATA[0];
    const nextLevel = VIP_LEVELS_DATA[currentLevelIndex + 1];

    // 1. Tính % tiến độ đến cấp tiếp theo (Cho Card Overview)
    let percentNext = 100;
    if (nextLevel) {
        const gap = nextLevel.min - currentLevel.min;
        const achieved = currentTotalDeposit - currentLevel.min;
        percentNext = Math.floor((achieved / gap) * 100);
    }

    // 2. Tính % tiến độ tổng thể cả hành trình (Cho Thanh trên cùng)
    const MAX_AMOUNT = VIP_LEVELS_DATA[VIP_LEVELS_DATA.length - 1].min;
    let percentTotal = Math.floor((currentTotalDeposit / MAX_AMOUNT) * 100);
    if(percentTotal > 100) percentTotal = 100;

    return (
        <>
            <Modal
                open={visible}
                onCancel={onClose}
                footer={null}
                width={750}
                centered
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <SketchOutlined style={{ color: '#faad14', fontSize: 24 }} />
                        <span style={{ fontSize: 20, fontWeight: 700 }}>Đặc Quyền Hội Viên VIP</span>
                    </div>
                }
                bodyStyle={{ padding: '20px 24px' }}
            >
                {/* --- THANH TIẾN ĐỘ TỔNG THỂ --- */}
                <div style={{ marginBottom: 25 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text strong style={{fontSize: 12, color: '#888'}}>HÀNH TRÌNH VIP</Text>
                        <Text strong style={{fontSize: 12, color: '#888'}}>{percentTotal}% CHINH PHỤC</Text>
                    </div>
                    <Progress
                        percent={percentTotal}
                        strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                        strokeWidth={12}
                        showInfo={false}
                        trailColor="#f0f0f0"
                    />
                </div>

                {/* 1. HEADER: CARD TỔNG QUAN */}
                <Card
                    style={{
                        background: `linear-gradient(135deg, ${currentLevel.color}15, #ffffff)`,
                        border: `1px solid ${currentLevel.color}40`,
                        marginBottom: 24,
                        borderRadius: 16,
                        boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                    }}
                    bodyStyle={{ padding: '24px' }}
                >
                    <Row align="middle" gutter={[24, 24]}>
                        {/* Cột Trái: Thông tin Level */}
                        <Col xs={24} sm={14}>
                            <Tag color={currentLevel.color} style={{ marginBottom: 10, border: 'none', px: 10 }}>Cấp độ hiện tại</Tag>
                            <Title level={2} style={{ margin: '5px 0', color: currentLevel.color, display:'flex', alignItems:'center', gap: 10 }}>
                                <span style={{fontSize: 36}}>{currentLevel.icon}</span> {currentLevel.name}
                            </Title>
                            <div style={{ marginTop: 10 }}>
                                <Text type="secondary">Tổng nạp tích lũy: </Text>
                                <Text style={{ fontSize: 20, color: '#cf1322', fontWeight: 700, fontFamily: 'monospace' }}>
                                    {currentTotalDeposit.toLocaleString()} đ
                                </Text>
                            </div>
                        </Col>

                        {/* Cột Phải: Mục tiêu tiếp theo */}
                        <Col xs={24} sm={10} style={{ textAlign: 'right', borderLeft: '1px dashed #e8e8e8', paddingLeft: 20 }}>
                            {nextLevel ? (
                                <div style={{textAlign: 'left'}}>
                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom: 5}}>
                                        <Text strong style={{ fontSize: 13 }}>Mục tiêu: {nextLevel.name}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{percentNext}%</Text>
                                    </div>
                                    <Progress
                                        percent={percentNext}
                                        strokeColor={{ '0%': currentLevel.color, '100%': nextLevel.color }}
                                        status="active"
                                        showInfo={false}
                                        strokeWidth={10}
                                    />
                                    <div style={{ marginTop: 12, marginBottom: 12 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Nạp thêm <span style={{ color: '#cf1322', fontWeight: 'bold', fontSize: 14 }}>{(nextLevel.min - currentTotalDeposit).toLocaleString()}đ</span>
                                        </Text>
                                    </div>
                                    <Button
                                        type="primary"
                                        shape="round"
                                        block
                                        icon={<ThunderboltFilled />}
                                        size="large"
                                        style={{ background: 'linear-gradient(90deg, #ff4d4f, #ff7875)', border: 'none', boxShadow: '0 4px 10px rgba(255, 77, 79, 0.3)' }}
                                        onClick={() => { onClose(); onDepositClick(); }}
                                    >
                                        Nạp Ngay
                                    </Button>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                    <StarFilled style={{ fontSize: 40, color: '#faad14', marginBottom: 10 }} />
                                    <Title level={4} style={{ margin: 0, color: '#faad14' }}>MAX LEVEL</Title>
                                    <Text type="secondary">Bạn là huyền thoại!</Text>
                                </div>
                            )}
                        </Col>
                    </Row>
                </Card>

                {/* 🟢 2. NÚT MỞ KHO VOUCHER (MỚI) */}
                <Button
                    icon={<WalletOutlined />}
                    size="large"
                    onClick={() => setWalletVisible(true)}
                    block
                    style={{
                        marginBottom: 24,
                        height: 50,
                        borderRadius: 12,
                        background: '#f0f5ff',
                        borderColor: '#adc6ff',
                        color: '#2f54eb',
                        fontWeight: 600,
                        fontSize: 16,
                        boxShadow: '0 2px 8px rgba(47, 84, 235, 0.1)'
                    }}
                >
                    Quản lý Kho Voucher & Quà tặng
                </Button>

                {/* 3. LỘ TRÌNH THĂNG CẤP (STEPS) */}
                <div style={{ padding: '0 5px' }}>
                    <Divider orientation="left" style={{borderColor: '#e8e8e8'}}>
                        <Text strong style={{color: '#555'}}>LỘ TRÌNH QUYỀN LỢI</Text>
                    </Divider>

                    <Steps
                        direction="vertical"
                        current={currentLevelIndex}
                        items={VIP_LEVELS_DATA.map((lvl, index) => {
                            const isUnlocked = index <= currentLevelIndex;
                            const isCurrent = index === currentLevelIndex;

                            return {
                                title: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: isUnlocked ? lvl.color : '#bfbfbf',
                                            fontSize: 16
                                        }}>
                                            {lvl.name}
                                        </span>
                                        {isUnlocked && <CheckCircleFilled style={{ color: '#52c41a' }} />}
                                        {isCurrent && <Tag color="processing">Hiện tại</Tag>}
                                    </div>
                                ),
                                subTitle: <Text type="secondary" style={{fontSize: 12}}>Mốc: {lvl.min.toLocaleString()} đ</Text>,
                                description: (
                                    <div style={{
                                        marginTop: 8,
                                        padding: '12px 16px',
                                        background: isCurrent ? '#e6f7ff' : (isUnlocked ? '#f6ffed' : '#fafafa'),
                                        borderRadius: 12,
                                        border: isCurrent ? '1px solid #91d5ff' : (isUnlocked ? '1px solid #b7eb8f' : '1px dashed #d9d9d9'),
                                        display: 'flex', alignItems: 'center', gap: 15,
                                        transition: 'all 0.3s'
                                    }}>
                                        <div style={{
                                            background: '#fff', padding: 8, borderRadius: '50%',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <GiftOutlined style={{ color: isUnlocked ? '#cf1322' : '#bfbfbf', fontSize: 20 }} />
                                        </div>
                                        <div style={{flex: 1}}>
                                            <div style={{ fontSize: 12, color: '#888', display:'flex', alignItems:'center', gap: 5 }}>
                                                Đặc quyền <Tooltip title="Mã giảm giá được gửi tự động vào ngày 1 hàng tháng"><ClockCircleOutlined /></Tooltip>
                                            </div>
                                            <div style={{ fontWeight: 700, color: isUnlocked ? '#333' : '#999', fontSize: 15 }}>
                                                {lvl.percent > 0 ? (
                                                    <>Nhận mã giảm giá <span style={{color: '#cf1322'}}>{lvl.percent}%</span> mỗi tháng</>
                                                ) : (
                                                    lvl.reward
                                                )}
                                            </div>
                                            {lvl.percent > 0 && isUnlocked && (
                                                <Tag color="success" style={{marginTop: 4, borderRadius: 10, fontSize: 10, border: 'none'}}>
                                                    Đã kích hoạt
                                                </Tag>
                                            )}
                                        </div>
                                    </div>
                                ),
                                icon: (
                                    <div style={{
                                        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: isUnlocked ? lvl.color : '#f5f5f5',
                                        color: isUnlocked ? '#fff' : '#d9d9d9',
                                        borderRadius: '50%',
                                        fontSize: 18,
                                        boxShadow: isCurrent ? `0 0 0 4px ${lvl.color}40` : 'none',
                                        transition: 'all 0.3s'
                                    }}>
                                        {lvl.icon}
                                    </div>
                                )
                            };
                        })}
                    />
                </div>
            </Modal>

            {/* 🟢 RENDER MODAL KHO VOUCHER */}
            <VoucherWalletModal
                visible={walletVisible}
                onClose={() => setWalletVisible(false)}
            />
        </>
    );
};

export default VipDetailModal;