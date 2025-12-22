import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Table, Tag, Statistic, Button, message } from 'antd';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    WalletOutlined,
    HistoryOutlined,
    BarChartOutlined,
    PlusCircleOutlined,
    CheckCircleFilled
} from '@ant-design/icons';
import paymentApi from '../services/paymentApi';
import DepositModal from '../components/payment/DepositModal';
import { useChat } from '../context/ChatContext';
import { useSettings } from '../context/SettingsContext';

const { Title, Text } = Typography;

const PaymentPage = () => {
    const { t } = useSettings();
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    const { currentUser } = useChat();

    // Fetch dữ liệu
    const fetchData = async () => {
        setLoading(true);
        try {
            const [historyRes, statsRes] = await Promise.all([
                paymentApi.getHistory(),
                paymentApi.getStats()
            ]);
            setHistory(historyRes.data || []);
            setStats(statsRes.data || []);
        } catch (error) {
            console.error("Lỗi tải dữ liệu thanh toán:", error);
            message.error(t('errorLoadHistory') || "Không thể tải lịch sử giao dịch.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Cấu hình cột bảng
    const columns = [
        {
            title: t('transCode'),
            dataIndex: 'transactionCode',
            key: 'code',
            render: (text) => <Text strong copyable style={{color: 'var(--text-color)'}}>{text}</Text>
        },
        {
            title: t('time'),
            dataIndex: 'createdAt',
            key: 'date',
            render: (date) => <span style={{color: 'var(--text-secondary)'}}>{new Date(date).toLocaleString('vi-VN')}</span>
        },
        {
            title: t('amountVndColumn'),
            dataIndex: 'amountVnd',
            key: 'amount',
            render: (val, record) => {
                if (record.type === 'ADMIN_ADD') {
                    return <span style={{color: '#722ed1', fontWeight: 600}}>{t('gift')}</span>;
                }
                return <span style={{color: '#52c41a', fontWeight: 600}}>{val ? val.toLocaleString() : 0} đ</span>;
            }
        },
        {
            title: t('thanReceived'),
            dataIndex: 'thanReceived',
            key: 'than',
            render: (val, record) => {
                if (record.type === 'DONATE') return <span style={{color: 'var(--text-secondary)'}}>-</span>;
                return <Tag color="gold">+{val ? val.toLocaleString() : 0} T</Tag>;
            }
        },
        {
            title: t('type'),
            dataIndex: 'type',
            key: 'type',
            render: (type) => {
                if (type === 'DEPOSIT') return <Tag color="blue">{t('depositType')}</Tag>;
                if (type === 'DONATE') return <Tag color="magenta">{t('donateType')}</Tag>;
                if (type === 'ADMIN_ADD') return <Tag color="purple" icon={<CheckCircleFilled />}>{t('adminGift')}</Tag>;
                return <Tag>{type}</Tag>;
            }
        },
        {
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = status === 'SUCCESS' ? 'green' : (status === 'PENDING' ? 'orange' : 'red');
                return <Tag color={color}>{status}</Tag>;
            }
        }
    ];

    // Tính tổng đã nạp
    const totalDeposited = history
        .filter(h => h.status === 'SUCCESS')
        .reduce((sum, item) => sum + item.amountVnd, 0);

    return (
        <div style={{ maxWidth: 1200, margin: '20px auto', padding: '0 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0, color: 'var(--text-color)' }}>
                    <WalletOutlined style={{ marginRight: 10, color: '#faad14' }} />
                    {t('myWallet')}
                </Title>
                <Button
                    type="primary"
                    size="large"
                    icon={<PlusCircleOutlined />}
                    shape="round"
                    onClick={() => setModalVisible(true)}
                    style={{ background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)', border: 'none', color: '#000', fontWeight: 600 }}
                >
                    {t('depositMore')}
                </Button>
            </div>

            <Row gutter={[24, 24]}>
                {/* 1. THỐNG KÊ TỔNG QUAN */}
                <Col xs={24} md={8}>
                    <Card bordered={false} style={{ height: '100%', borderRadius: 16, background: 'var(--card-bg)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
                        <Statistic
                            title={<span style={{color: 'var(--text-secondary)'}}>{t('totalDeposited')}</span>}
                            value={totalDeposited}
                            precision={0}
                            valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                            prefix="₫"
                            suffix=""
                        />
                        <div style={{ marginTop: 20 }}>
                            <Statistic
                                title={<span style={{color: 'var(--text-secondary)'}}>{t('totalSuccessTrans')}</span>}
                                value={history.filter(h => h.status === 'SUCCESS').length}
                                valueStyle={{ color: 'var(--text-color)' }}
                                prefix={<CheckCircleFilled style={{color: '#52c41a'}}/>}
                            />
                        </div>
                    </Card>
                </Col>

                {/* 2. BIỂU ĐỒ */}
                <Col xs={24} md={16}>
                    <Card
                        title={<span style={{color: 'var(--text-color)'}}><BarChartOutlined /> {t('balanceFluctuation')}</span>}
                        bordered={false}
                        style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
                        headStyle={{borderBottom: '1px solid var(--border-color)'}}
                    >
                        <div style={{ width: '100%', height: 200 }}>
                            {stats.length > 0 ? (
                                <ResponsiveContainer>
                                    <AreaChart data={stats}>
                                        <defs>
                                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="month" tick={{fill: 'var(--text-secondary)'}} />
                                        <YAxis tick={{fill: 'var(--text-secondary)'}} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                        <Tooltip
                                            contentStyle={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)'}}
                                            formatter={(value) => `${value.toLocaleString()} đ`}
                                        />
                                        <Area type="monotone" dataKey="totalAmount" stroke="#8884d8" fillOpacity={1} fill="url(#colorAmount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{textAlign: 'center', lineHeight: '200px', color: 'var(--text-secondary)'}}>{t('noStatsData')}</div>
                            )}
                        </div>
                    </Card>
                </Col>

                {/* 3. BẢNG LỊCH SỬ */}
                <Col span={24}>
                    <Card
                        title={<span style={{color: 'var(--text-color)'}}><HistoryOutlined /> {t('transactionHistory')}</span>}
                        bordered={false}
                        style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
                        headStyle={{borderBottom: '1px solid var(--border-color)'}}
                    >
                        <Table
                            columns={columns}
                            dataSource={history}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 5 }}
                            // Không cần style riêng cho table vì đã có override trong index.css
                        />
                    </Card>
                </Col>
            </Row>

            <DepositModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSuccess={() => {
                    fetchData();
                }}
            />
        </div>
    );
};

export default PaymentPage;