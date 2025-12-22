import React, { useState, useEffect, useRef } from 'react';
import {
    Modal, InputNumber, Button, Typography, message,
    Row, Col, Statistic, Divider, Steps, Card, Tag, Alert, Tooltip, Badge, Space, Result
} from 'antd';
import {
    DollarCircleOutlined, QrcodeOutlined, CheckCircleFilled,
    CopyOutlined, HeartFilled, ThunderboltFilled, BankOutlined,
    SafetyCertificateOutlined, ArrowLeftOutlined, ClockCircleOutlined, SmileOutlined
} from '@ant-design/icons';
import paymentApi from '../../services/paymentApi';
import { useSettings } from '../../context/SettingsContext';
import { useChat } from '../../context/ChatContext';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import api from '../../services/api';

const { Text, Title } = Typography;

// --- CẤU HÌNH ---
const BANK_INFO = {
    bankName: import.meta.env.VITE_BANK_NAME || "VCB",
    accountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || "NDT",
    accountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || "000000000",
};

// Màu sắc chủ đạo
const COLORS = {
    primary: '#1890ff',
    primaryGradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
    donateGradient: 'linear-gradient(135deg, #eb2f96 0%, #c41d7f 100%)',
    success: '#52c41a',
    error: '#ff4d4f',
    gold: '#faad14',
};

const PRESET_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000];

const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const formatCurrency = (value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const DepositModal = ({ visible, onClose, onSuccess }) => {
    const { t } = useSettings();
    const { currentUser, user } = useChat();

    // step 0: Nhập, 1: QR, 2: Thành công
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState(50000);
    const [type, setType] = useState('DEPOSIT');
    const [transaction, setTransaction] = useState(null);
    const [timeLeft, setTimeLeft] = useState(600);

    const stompClientRef = useRef(null);
    const subscriptionRef = useRef(null);

    const MAX_AMOUNT = 10000000000;

    useEffect(() => {
        if (visible && step === 0) {
            setAmount(50000);
            setTimeLeft(600);
        }
    }, [visible]);

    useEffect(() => {
        let timer;
        if (step === 1 && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [step, timeLeft]);

    // WebSocket Logic (Giữ nguyên)
    useEffect(() => {
        if (visible && step === 1 && currentUser) {
            const socket = new SockJS('http://localhost:8081/ws');
            const client = Stomp.over(socket);
            client.debug = () => {};

            client.connect({}, () => {
                stompClientRef.current = client;
                subscriptionRef.current = client.subscribe(`/user/${currentUser}/queue/payment`, (msg) => {
                    try {
                        const body = JSON.parse(msg.body);
                        if (body.status === 'SUCCESS' && body.transactionCode === transaction?.transactionCode) {
                            setStep(2);
                            message.success(t('moneyReceived') || "Đã nhận được tiền!");
                            if (onSuccess) onSuccess();
                        }
                    } catch (e) {
                        console.error("Socket parse error", e);
                    }
                });
            });
        }
        return () => {
            if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
            if (stompClientRef.current) stompClientRef.current.disconnect();
        };
    }, [visible, step, currentUser, transaction]);

    const handleCopy = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        message.success({
            content: `${t('copied') || "Đã sao chép"} ${label || ''}`,
            icon: <CheckCircleFilled style={{ color: COLORS.success }} />,
        });
    };

    const handleCreateTransaction = async () => {
        if (amount < 10000) return message.warning(t('minAmountError'));
        setLoading(true);
        try {
            const res = await paymentApi.createTransaction({
                amount: amount, method: 'BANK', type: type
            });
            if (res && res.data) {
                setTransaction(res.data);
                setStep(1);
                message.success(t('createQrSuccess'));
            } else {
                message.error(t('transactionError'));
            }
        } catch (error) {
            message.error(t('transactionError'));
        } finally { setLoading(false); }
    };

    const handleConfirm = () => {
        Modal.success({
            title: t('sentRequestTitle') || 'Đã gửi yêu cầu xác nhận!',
            content: t('sentRequestDesc') || 'Hệ thống đang kiểm tra...',
            okText: t('close') || 'Đóng',
            onOk: () => { onClose(); setStep(0); onSuccess && onSuccess(); },
            // Override style cho Modal con này để ăn theo Dark Mode
            className: 'custom-success-modal' // Có thể add global css hoặc để mặc định Antd override
        });
    };

    const handleSimulateSuccess = async () => {
        try {
            message.loading(t('simulating') || "Đang giả lập...", 1);
            await api.post('/payment/webhook/fake-bank-callback', { content: transaction.transactionCode });
        } catch (error) { message.error("Error: " + error.message); }
    };

    // --- RENDER BƯỚC 1 ---
    const renderStep1 = () => (
        <div style={{ padding: '0 10px' }}>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={12}>
                    <Badge.Ribbon text={t('popular') || "Phổ biến"} color="gold" style={{ display: type === 'DEPOSIT' ? 'block' : 'none' }}>
                        <Card
                            hoverable onClick={() => setType('DEPOSIT')}
                            styles={{ body: { padding: '15px' } }}
                            style={{
                                textAlign: 'center', cursor: 'pointer', borderRadius: 12,
                                border: type === 'DEPOSIT' ? `2px solid ${COLORS.primary}` : '1px solid var(--border-color)',
                                // Background đổi theo theme và trạng thái chọn
                                background: type === 'DEPOSIT' ? (document.body.getAttribute('data-theme') === 'dark' ? '#111b26' : '#e6f7ff') : 'var(--card-bg)',
                                transition: 'all 0.3s'
                            }}
                        >
                            <ThunderboltFilled style={{ fontSize: 28, color: '#faad14', marginBottom: 8 }} />
                            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-color)' }}>{t('depositThan')}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('exchangeValue')}</div>
                        </Card>
                    </Badge.Ribbon>
                </Col>
                <Col span={12}>
                    <Card
                        hoverable onClick={() => setType('DONATE')}
                        styles={{ body: { padding: '15px' } }}
                        style={{
                            textAlign: 'center', cursor: 'pointer', borderRadius: 12,
                            border: type === 'DONATE' ? '2px solid #eb2f96' : '1px solid var(--border-color)',
                            background: type === 'DONATE' ? (document.body.getAttribute('data-theme') === 'dark' ? '#291321' : '#fff0f6') : 'var(--card-bg)',
                            transition: 'all 0.3s'
                        }}
                    >
                        <HeartFilled style={{ fontSize: 28, color: '#eb2f96', marginBottom: 8 }} />
                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-color)' }}>{t('donateDev')}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('supportProject')}</div>
                    </Card>
                </Col>
            </Row>

            <div style={{
                background: 'var(--bg-secondary)', borderRadius: 16, padding: '25px',
                textAlign: 'center', marginBottom: 20, border: '1px solid var(--border-color)'
            }}>
                <div style={{marginBottom: 10, color: 'var(--text-secondary)', fontWeight: 500}}>
                    {t('enterAmountVnd') || "Nhập số tiền (VND)"}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <InputNumber
                        style={{
                            width: 240, fontSize: 36, fontWeight: '800', height: 60,
                            borderRadius: 12, textAlign: 'center',
                            border: 'none', background: 'transparent',
                            boxShadow: 'none', color: COLORS.primary
                        }}
                        controls={false}
                        value={amount}
                        onChange={val => setAmount(val || 0)}
                        formatter={value => formatCurrency(value)}
                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                        min={0} max={MAX_AMOUNT}
                    />
                    <span style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-secondary)' }}>₫</span>
                </div>
                <Divider style={{ margin: '10px 0', borderColor: 'var(--border-color)' }} />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 15 }}>
                    {PRESET_AMOUNTS.map(val => (
                        <Tag.CheckableTag
                            key={val}
                            checked={amount === val}
                            onChange={() => setAmount(val)}
                            style={{
                                padding: '5px 12px', fontSize: 13, borderRadius: 15, cursor: 'pointer',
                                border: amount === val ? `1px solid ${COLORS.primary}` : '1px solid var(--border-color)',
                                background: amount === val ? 'var(--bg-color)' : 'transparent',
                                color: amount === val ? COLORS.primary : 'var(--text-color)',
                                fontWeight: amount === val ? 700 : 400
                            }}
                        >
                            {val >= 1000000 ? `${val/1000000}M` : `${val/1000}k`}
                        </Tag.CheckableTag>
                    ))}
                </div>

                {type === 'DEPOSIT' && (
                    <div style={{ background: 'var(--card-bg)', padding: '8px 15px', borderRadius: 30, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px dashed var(--border-color)' }}>
                        <Text style={{color: 'var(--text-secondary)'}}>{t('exchangeRate')}</Text>
                        <Tag color="gold" style={{ margin: 0, padding: '2px 10px', fontSize: 16, fontWeight: 900, borderRadius: 10 }}>
                            {(amount * 0.008).toLocaleString()} T
                        </Tag>
                    </div>
                )}
            </div>

            <Button
                type="primary" block size="large" onClick={handleCreateTransaction} loading={loading}
                style={{
                    height: 50, fontSize: 16, fontWeight: 700, borderRadius: 12,
                    background: type === 'DEPOSIT' ? COLORS.primaryGradient : COLORS.donateGradient,
                    border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}
            >
                {type === 'DEPOSIT' ? t('createDepositTrans') : t('createDonateTrans')}
            </Button>

            <div style={{textAlign: 'center', marginTop: 15, color: 'var(--text-secondary)', fontSize: 12}}>
                <SafetyCertificateOutlined style={{marginRight: 5, color: COLORS.success}}/>
                {t('secureTrans')}
            </div>
        </div>
    );

    // --- RENDER BƯỚC 2 ---
    const renderStep2 = () => {
        if (!transaction) return <div>{t('loadingData') || "Đang tải dữ liệu..."}</div>;

        return (
            <div>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <Tag color="error" style={{ padding: '5px 15px', fontSize: 14, borderRadius: 20 }}>
                        <ClockCircleOutlined style={{ marginRight: 5 }} />
                        {t('expiresIn')} <b>{formatTime(timeLeft)}</b>
                    </Tag>
                </div>

                {/* 🟢 NÚT TEST GIẢ LẬP (CHỈ HIỆN KHI LÀ ADMIN) */}
                <div style={{textAlign: 'center', marginBottom: 15}}>
                    <Button type="dashed" size="small" onClick={handleSimulateSuccess} style={{color: COLORS.primary, borderColor: COLORS.primary}}>
                        ⚡ (Admin Only) Giả lập thanh toán thành công
                    </Button>
                </div>

                {user?.role === 'ADMIN' && (
                    <div style={{textAlign: 'center', marginBottom: 15}}>
                        <Button type="dashed" size="small" onClick={handleSimulateSuccess} style={{color: COLORS.primary, borderColor: COLORS.primary}}>
                            {t('adminSimulate')}
                        </Button>
                    </div>
                )}

                <Alert
                    message={t('waitingPayment')}
                    description={t('waitingPaymentDesc')}
                    type="info" showIcon
                    style={{ marginBottom: 20, border: `1px solid ${COLORS.primary}`, background: 'var(--bg-hover)', color: 'var(--text-color)' }}
                />

                <Row gutter={[24, 24]}>
                    <Col xs={24} sm={10} style={{ textAlign: 'center' }}>
                        <div style={{
                            background: '#fff', padding: 12, borderRadius: 16, // Giữ nền trắng cho QR dễ quét
                            border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                        }}>
                            {transaction.qrUrl ? (
                                <img src={transaction.qrUrl} alt="QR" style={{ width: '100%', borderRadius: 8 }} />
                            ) : <div style={{ padding: 30 }}>Loading QR...</div>}
                            <div style={{ marginTop: 10, fontSize: 12, color: '#666', fontWeight: 600, letterSpacing: 1 }}>
                                {t('scanViaApp')}
                            </div>
                        </div>
                    </Col>

                    <Col xs={24} sm={14}>
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 15 }}>

                            <div style={{ background: 'var(--bg-secondary)', padding: 15, borderRadius: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <BankOutlined style={{ fontSize: 20, color: COLORS.primary }} />
                                    <div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('bank')}</div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-color)' }}>{BANK_INFO.bankName}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 20 }}></div>
                                    <div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('accountHolder')}</div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-color)' }}>{BANK_INFO.accountName}</div>
                                    </div>
                                </div>
                            </div>


                            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
                                <div style={{ padding: '10px 15px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{color: 'var(--text-secondary)'}}>{t('amount')}</Text>
                                    <Space>
                                        <Text strong style={{ color: COLORS.success, fontSize: 16 }}>{formatCurrency(amount)} đ</Text>
                                        <CopyOutlined onClick={() => handleCopy(amount)} style={{ color: COLORS.primary, cursor: 'pointer' }} />
                                    </Space>
                                </div>
                                <div style={{ padding: '10px 15px', background: 'rgba(255, 77, 79, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{color: 'var(--text-secondary)'}}>{t('content')} <span style={{color: 'red'}}>*</span></Text>
                                    <Space>
                                        <Text strong style={{ color: COLORS.error, fontSize: 16 }}>{transaction.transactionCode}</Text>
                                        <CopyOutlined onClick={() => handleCopy(transaction.transactionCode, t('content'))} style={{ color: COLORS.error, cursor: 'pointer' }} />
                                    </Space>
                                </div>
                            </div>

                            <Alert
                                message={t('importantNote')}
                                description={t('noteKeepContent')}
                                type="warning" showIcon style={{ fontSize: 12 }}
                            />
                        </div>
                    </Col>
                </Row>

                <div style={{ display: 'flex', gap: 12, marginTop: 25 }}>
                    <Button
                        size="large" onClick={() => setStep(0)}
                        style={{ flex: 1, borderRadius: 10, background: 'var(--bg-secondary)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
                    >
                        <ArrowLeftOutlined /> {t('back')}
                    </Button>
                    <Button
                        type="primary" size="large" onClick={handleConfirm}
                        style={{ flex: 1.5, borderRadius: 10, background: COLORS.success, borderColor: COLORS.success, fontWeight: 700 }}
                    >
                        <CheckCircleFilled /> {t('iHaveTransferred')}
                    </Button>
                </div>
            </div>
        );
    };

    // --- RENDER BƯỚC 3 ---
    const renderStep3 = () => (
        <Result
            status="success"
            title={<span style={{color: COLORS.success, fontWeight: 800}}>{t('paymentSuccess')}</span>}
            subTitle={
                <div style={{fontSize: 16, color: 'var(--text-color)'}}>
                    {t('systemRecorded')} <b>{formatCurrency(amount)} VND</b>.<br/>
                    {type === 'DEPOSIT' && <span>{t('balanceAdded')} <b>{(amount * 0.008).toLocaleString()} T</b>.</span>}
                    {type === 'DONATE' && <span>{t('thanksDonate')}</span>}
                </div>
            }
            extra={[
                <Button type="primary" key="close" size="large"
                        style={{borderRadius: 10, background: COLORS.success, borderColor: COLORS.success, width: 200, fontWeight: 'bold'}}
                        onClick={() => { onClose(); setStep(0); onSuccess && onSuccess(); }}>
                    {t('stepComplete')}
                </Button>,
            ]}
        />
    );

    return (
        <Modal
            open={visible} onCancel={onClose} footer={null} centered width={600}
            title={
                step !== 2 && <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 800, color: 'var(--text-color)', textTransform: 'uppercase' }}>
                    {t('paymentGateway')}
                </div>
            }
            maskClosable={false}
            // Style đè vào Modal để đổi màu nền
            styles={{
                content: { backgroundColor: 'var(--card-bg)' },
                header: { backgroundColor: 'var(--card-bg)', borderBottom: 'none' },
                body: { padding: '24px', backgroundColor: 'var(--card-bg)' }
            }}
        >
            {step !== 2 && (
                <Steps
                    current={step} size="small" style={{ marginBottom: 25 }}
                    items={[
                        { title: t('stepChoosePackage'), icon: <DollarCircleOutlined /> },
                        { title: t('stepPayment'), icon: <QrcodeOutlined /> },
                        { title: t('stepComplete'), icon: <SmileOutlined /> }
                    ]}
                />
            )}

            {step === 0 && renderStep1()}
            {step === 1 && renderStep2()}
            {step === 2 && renderStep3()}
        </Modal>
    );
};

export default DepositModal;