import React, { useEffect, useState, useMemo } from 'react';
import {
    Table, Tag, Button, message, Popconfirm, Card,
    Typography, Row, Col, Statistic, Descriptions, Divider, Empty,
    Input, Select, DatePicker, Avatar, Form, Space // 🟢 Đã thêm Space
} from 'antd';
import {
    ShopOutlined, ClockCircleOutlined, CarOutlined, DollarOutlined,
    QrcodeOutlined, PrinterOutlined, SearchOutlined, FilterOutlined,
    ReloadOutlined, UserOutlined, EditOutlined, SaveOutlined, EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

import { marketApi } from './MarketAPI';
import { useChat } from '../../context/ChatContext';

dayjs.extend(isBetween);
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const MyShop = () => {
    // --- State cho Đơn hàng ---
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterDate, setFilterDate] = useState(null);

    // --- State cho Shop Info ---
    const [shopInfo, setShopInfo] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [form] = Form.useForm();

    const { currentUser } = useChat();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            fetchAllData();
        }
    }, [currentUser]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [resSales, resShop] = await Promise.all([
                marketApi.getMySales(),
                marketApi.getMyShopInfo()
            ]);

            const sortedOrders = (resSales.data || []).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
            setOrders(sortedOrders);

            setShopInfo(resShop.data);
            if (resShop.data) {
                form.setFieldsValue(resShop.data);
            }

        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIC CẬP NHẬT SHOP ---
    const handleUpdateShop = async (values) => {
        try {
            await marketApi.updateShopInfo(values);
            message.success("Cập nhật thông tin Shop thành công!");
            setIsEditing(false);
            fetchAllData();
        } catch (error) {
            message.error("Lỗi cập nhật: " + (error.response?.data || "Unknown"));
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await marketApi.updateOrderStatus(orderId, newStatus);
            message.success(`Đã cập nhật: ${newStatus}`);
            fetchAllData();
        } catch (error) {
            message.error("Lỗi cập nhật: " + (error.response?.data || "Unknown error"));
        }
    };

    // Hàm lấy thông tin người nhận (Parsing chuỗi địa chỉ phức tạp)
    const parseShippingInfo = (record) => {
        const rawString = record.shippingAddress || "";
        let finalName = record.fullName;
        let finalPhone = record.phoneNumber;
        let finalAddress = rawString;
        let finalNote = record.note || "";

        if (rawString.includes('|')) {
            const parts = rawString.split('|');
            const leftPart = parts[0].trim();
            let rightPart = parts.slice(1).join('|').trim();

            const phoneMatch = leftPart.match(/\((.*?)\)/);
            if (phoneMatch) {
                if (!finalPhone) finalPhone = phoneMatch[1];
                if (!finalName) finalName = leftPart.replace(/\(.*?\)/, '').trim();
            } else {
                if (!finalName) finalName = leftPart;
            }

            if (rightPart.includes('Note:')) {
                const noteParts = rightPart.split('Note:');
                finalAddress = noteParts[0].replace(/[.,;]$/, '').trim();
                if (!finalNote) finalNote = noteParts.slice(1).join('Note:').trim();
            } else {
                finalAddress = rightPart;
            }
        }

        const displayReceiverName = finalName || record.buyer?.fullName || record.buyer?.username || "Khách hàng";
        const displayReceiverUsername = record.buyer?.username || "unknown";
        const displayPhone = finalPhone || record.buyer?.phoneNumber || "Chưa có SĐT";

        return {
            receiverName: displayReceiverName,
            receiverUsername: displayReceiverUsername,
            phone: displayPhone,
            address: finalAddress,
            note: finalNote
        };
    };

    // 🟢 HÀM IN HÓA ĐƠN (Đã nâng cấp giao diện & Logic Shop & Biến ngày tháng)
    const handlePrint = (record) => {
        const info = parseShippingInfo(record);
        const orderDateFormatted = dayjs(record.orderDate).format('DD/MM/YYYY HH:mm');

        // Thông tin shop (Lấy từ state shopInfo)
        const senderName = shopInfo?.shopName || record.seller?.username || 'Cửa hàng';
        const senderPhone = shopInfo?.phoneNumber || record.seller?.phoneNumber || '___-___-____';
        const senderAddress = shopInfo?.address || 'Kho hàng';
        const senderLogo = shopInfo?.avatarUrl || 'https://via.placeholder.com/80?text=Shop';

        // Tính toán chi tiết cho bảng in
        const item = record.items[0];
        const unitPrice = item.product.price || 0;
        const qty = item.quantity || 1;
        const merchandiseTotal = unitPrice * qty;
        const shipFeeUnit = item.product.shippingFee || 0;
        const totalShip = shipFeeUnit * qty;

        const printWindow = window.open('', '', 'width=1000,height=900');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Hóa Đơn - ${record.orderCode}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Roboto', sans-serif; background: #f5f5f5; padding: 20px; -webkit-print-color-adjust: exact; }
                        .invoice-box {
                            background: #fff; max-width: 800px; margin: 0 auto; padding: 30px;
                            border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
                            font-size: 14px; line-height: 24px; color: #555;
                        }
                        .header { text-align: right; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 20px; }
                        .platform-brand { float: left; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px;}
                        .invoice-title { font-size: 28px; font-weight: bold; color: #333; text-transform: uppercase; margin-bottom: 5px; }
                        .order-date { font-size: 13px; color: #777; }
                        
                        .shop-info { display: flex; align-items: center; gap: 15px; margin-bottom: 30px; background: #f9fbfd; padding: 15px; border-radius: 8px; border: 1px dashed #1890ff; }
                        .shop-logo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                        .shop-details h3 { margin: 0; color: #1890ff; font-size: 18px; }
                        
                        .columns { display: flex; gap: 30px; margin-bottom: 30px; }
                        .col { flex: 1; }
                        .col-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #999; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                        .info-row { margin-bottom: 5px; }
                        .highlight { font-weight: bold; color: #333; font-size: 15px; }
                        
                        .shipping-label {
                            text-align: center; font-weight: bold; font-size: 20px; margin: 20px 0; padding: 10px;
                            background: #333; color: #fff; letter-spacing: 1px;
                        }

                        .order-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        .order-table th { background: #f0f0f0; color: #333; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #ddd; }
                        .order-table td { padding: 12px 10px; border-bottom: 1px solid #eee; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        
                        .summary-section { margin-top: 20px; border-top: 2px solid #333; padding-top: 15px; }
                        .summary-row { display: flex; justify-content: flex-end; margin-bottom: 5px; font-size: 14px; }
                        .summary-label { width: 150px; text-align: right; padding-right: 20px; color: #777; }
                        .summary-val { width: 100px; text-align: right; font-weight: 500; }
                        .grand-total { font-size: 18px; color: #d32f2f; font-weight: bold; margin-top: 10px; }

                        .note-box { background: #fffbe6; padding: 12px; border-radius: 4px; border: 1px solid #ffe58f; font-size: 13px; margin-bottom: 30px; }
                        
                        .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
                        .footer p { margin: 3px 0; }
                    </style>
                </head>
                <body>
                    <div class="invoice-box">
                        <div class="header">
                            <div class="platform-brand">Powered by T-Private Place</div>
                            <div class="invoice-details">
                                <div class="invoice-title">PHIẾU GIAO HÀNG</div>
                                <div class="order-date">Ngày đặt hàng: ${orderDateFormatted}</div>
                            </div>
                        </div>

                        <div class="shop-info">
                            <img src="${senderLogo}" class="shop-logo" alt="Logo" onerror="this.src='https://via.placeholder.com/60?text=S'"/>
                            <div class="shop-details">
                                <div style="font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 2px;">Nhà cung cấp / Người gửi:</div>
                                <h3>${senderName}</h3>
                                <div style="font-size: 13px; color: #555;">Hotline: ${senderPhone}</div>
                            </div>
                        </div>

                        <div class="columns">
                            <div class="col">
                                <div class="col-title">KHO XUẤT HÀNG</div>
                                <div class="info-row">${senderAddress}</div>
                            </div>
                            <div class="col">
                                <div class="col-title">NGƯỜI NHẬN (CONSIGNEE)</div>
                                <div class="info-row highlight">${info.receiverName}</div>
                                <div class="info-row">Tel: <b>${info.phone}</b></div>
                                <div class="info-row">Add: ${info.address}</div>
                            </div>
                        </div>

                        <div class="shipping-label">${record.orderCode}</div>

                        <table class="order-table">
                            <thead>
                                <tr>
                                    <th style="width: 40%">Sản phẩm</th>
                                    <th class="text-center" style="width: 10%">SL</th>
                                    <th class="text-right" style="width: 15%">Đơn giá</th>
                                    <th class="text-right" style="width: 15%">Phí Ship</th>
                                    <th class="text-right" style="width: 20%">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <b>${item.product.name}</b><br/>
                                        <small style="color: #888;">${item.product.category || 'Tiêu chuẩn'}</small>
                                    </td>
                                    <td class="text-center">x${qty}</td>
                                    <td class="text-right">${unitPrice.toLocaleString()}</td>
                                    <td class="text-right">${totalShip > 0 ? totalShip.toLocaleString() : '0'}</td>
                                    <td class="text-right"><b>${(merchandiseTotal + totalShip).toLocaleString()}</b></td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="summary-section">
                            <div class="summary-row">
                                <span class="summary-label">Tổng tiền hàng:</span>
                                <span class="summary-val">${merchandiseTotal.toLocaleString()}</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Tổng phí vận chuyển:</span>
                                <span class="summary-val">${totalShip > 0 ? totalShip.toLocaleString() : '0'}</span>
                            </div>
                            ${record.voucherCode ? `
                            <div class="summary-row" style="color: green;">
                                <span class="summary-label">Voucher giảm giá:</span>
                                <span class="summary-val">Đã áp dụng</span>
                            </div>` : ''}
                            <div class="summary-row grand-total">
                                <span class="summary-label">TỔNG THANH TOÁN:</span>
                                <span class="summary-val">${record.finalAmount?.toLocaleString()} T</span>
                            </div>
                        </div>

                        <div class="note-box" style="margin-top: 20px;">
                            <strong>📝 Ghi chú giao hàng:</strong> ${info.note || 'Khách hàng không để lại ghi chú.'}
                        </div>

                        <div class="footer">
                            <p>Đây là phiếu giao hàng được tạo tự động từ hệ thống <b>T-Private Place</b>.</p>
                            <p>Mọi thắc mắc về đơn hàng, vui lòng liên hệ trực tiếp Shop qua số điện thoại ở trên.</p>
                            <div style="margin-top: 15px; font-style: italic;">Thời gian in phiếu: ${dayjs().format('DD/MM/YYYY HH:mm:ss')}</div>
                        </div>
                    </div>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const searchContent = `${order.orderCode} ${order.fullName} ${order.items[0]?.product?.name}`.toLowerCase();
            const matchText = searchContent.includes(searchText.toLowerCase());
            const matchStatus = filterStatus === 'ALL' || order.status === filterStatus;
            let matchDate = true;
            if (filterDate) {
                const start = filterDate[0].startOf('day');
                const end = filterDate[1].endOf('day');
                matchDate = dayjs(order.orderDate).isBetween(start, end, null, '[]');
            }
            return matchText && matchStatus && matchDate;
        });
    }, [orders, searchText, filterStatus, filterDate]);

    const fetchMySales = async () => {
        setLoading(true);
        try {
            const res = await marketApi.getMySales();
            const sortedOrders = (res.data || []).sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
            setOrders(sortedOrders);
        } catch (error) {
            console.error("Lỗi tải đơn hàng:", error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Mã đơn',
            dataIndex: 'orderCode',
            width: 150,
            render: text => <Tag color="geekblue" style={{fontWeight: 'bold', cursor:'copy'}}>{text}</Tag>,
        },
        {
            title: 'Ngày đặt',
            dataIndex: 'orderDate',
            width: 140,
            render: date => dayjs(date).format('DD/MM/YYYY HH:mm'),
            sorter: (a, b) => new Date(a.orderDate) - new Date(b.orderDate),
        },
        {
            title: 'Sản phẩm',
            key: 'product',
            render: (_, record) => {
                const product = record.items[0]?.product;
                return (
                    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                        <Avatar shape="square" size={50} src={product?.images?.[0]} icon={<ShopOutlined />} />
                        <div style={{maxWidth: 200}}>
                            <div style={{fontWeight: 600}}>{product?.name}</div>
                            <div style={{fontSize: 12, color: '#888'}}>x{record.items[0]?.quantity}</div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'finalAmount',
            width: 120,
            render: amount => <Text strong style={{color: '#52c41a'}}>{amount?.toLocaleString()} T</Text>,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 130,
            render: status => {
                let color = 'default'; let text = status;
                if (status === 'PREPARING') { color = 'orange'; text='Chờ xử lý'}
                if (status === 'SHIPPED') { color = 'blue'; text='Đang giao'}
                if (status === 'DELIVERED') { color = 'cyan'; text='Đã giao'}
                if (status === 'COMPLETED') { color = 'green'; text='Hoàn tất'}
                if (status === 'CANCELLED') { color = 'red'; text='Đã hủy'}
                return <Tag color={color}>{text}</Tag>;
            },
        },
        {
            title: 'Hành động',
            key: 'action',
            fixed: 'right',
            width: 120,
            render: (_, record) => {
                // 1. Gửi hàng (Giữ nguyên)
                if (record.status === 'PREPARING') {
                    return (
                        <Popconfirm title="Xác nhận gửi hàng?" onConfirm={() => handleUpdateStatus(record.id, 'SHIPPED')}>
                            <Button type="primary" size="small" icon={<CarOutlined />}>Gửi</Button>
                        </Popconfirm>
                    );
                }

                // --- 🟢 THÊM ĐOẠN NÀY ---
                // 2. Nếu Khách đã nhận (DELIVERED) -> Shop bấm Duyệt để nhận tiền
                if (record.status === 'DELIVERED') {
                    return (
                        <Popconfirm
                            title="Xác nhận đơn thành công? (Tiền sẽ về ví & +1 lượt bán)"
                            onConfirm={() => handleUpdateStatus(record.id, 'COMPLETED')}
                        >
                            <Button type="primary" size="small" style={{background: '#52c41a', borderColor: '#52c41a'}} icon={<CheckCircleOutlined />}>
                                Duyệt
                            </Button>
                        </Popconfirm>
                    );
                }
                // ------------------------

                // Mặc định hiện nút In (Giữ nguyên)
                return <Button size="small" icon={<PrinterOutlined />} onClick={(e) => {e.stopPropagation(); handlePrint(record)}} />;
            },
        },
    ];

    const expandedRowRender = (record) => {
        const info = parseShippingInfo(record);
        const item = record.items[0];

        // Tính toán chi tiết
        const unitPrice = item.product.price || 0;
        const qty = item.quantity || 1;
        const merchandiseTotal = unitPrice * qty;
        const shipFeeUnit = item.product.shippingFee || 0;
        const totalShip = shipFeeUnit * qty;

        // QR Code giữ nguyên logic chỉ chứa mã đơn
        const shippingInfoForQR = record.orderCode;

        return (
            <div style={{ background: '#fbfbfb', padding: '16px', borderRadius: 8, border: '1px solid #eee' }}>
                <Row gutter={24}>
                    {/* Cột 1: Thông tin vận chuyển & Sản phẩm */}
                    <Col xs={24} md={16}>
                        <Descriptions title="📦 Chi tiết vận đơn & Thanh toán" bordered size="small" column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                            <Descriptions.Item label="Mã Đơn Hàng"><b style={{color: '#1890ff'}}>{record.orderCode}</b></Descriptions.Item>
                            <Descriptions.Item label="Ngày Đặt">{dayjs(record.orderDate).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>

                            <Descriptions.Item label="Người Nhận"><b>{info.receiverName}</b> <br/><Text type="secondary">(@{info.receiverUsername})</Text></Descriptions.Item>
                            <Descriptions.Item label="SĐT / Địa chỉ">
                                <div><b>{info.phone}</b></div>
                                <div>{info.address}</div>
                            </Descriptions.Item>

                            {/* 🟢 PHẦN MỚI: CHI TIẾT GIÁ */}
                            <Descriptions.Item label="Đơn giá">{unitPrice.toLocaleString()} <small>x{qty}</small></Descriptions.Item>
                            <Descriptions.Item label="Tiền hàng"><b>{merchandiseTotal.toLocaleString()}</b></Descriptions.Item>

                            <Descriptions.Item label="Phí Vận Chuyển">
                                {totalShip > 0 ? `${totalShip.toLocaleString()}` : <Tag color="green">Freeship</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="TỔNG THU">
                                <span style={{color: '#d32f2f', fontWeight: 'bold', fontSize: 15}}>{record.finalAmount?.toLocaleString()} T</span>
                            </Descriptions.Item>

                            <Descriptions.Item label="Ghi Chú" span={2}>{info.note ? (<div style={{background: '#fffbe6', padding: '5px 10px', borderRadius: 4, border: '1px dashed #ffe58f'}}>{info.note}</div>) : <Text type="secondary">Không có ghi chú</Text>}</Descriptions.Item>
                        </Descriptions>
                    </Col>

                    {/* Cột 2: QR Code & Hành động (Giữ nguyên) */}
                    <Col xs={24} md={8} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent:'center' }}>
                        <Card size="small" title={<><QrcodeOutlined /> Mã Vận Đơn</>} style={{textAlign: 'center', width: '100%'}}>
                            <div style={{background: '#fff', padding: 10, display: 'inline-block', borderRadius: 8, border: '1px solid #ddd'}}>
                                <QRCodeCanvas value={shippingInfoForQR} size={140} level={"H"} includeMargin={true} />
                            </div>
                            <div style={{marginTop: 10, fontSize: 12, color: '#888', fontWeight: 600}}>{record.orderCode}</div>
                            <Button style={{marginTop: 15}} type="dashed" icon={<PrinterOutlined />} onClick={() => handlePrint(record)} block>In Phiếu Giao Hàng</Button>
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    };

    if (!currentUser) return (
        <Empty description="Vui lòng đăng nhập" style={{ marginTop: 50 }}>
            <Button type="primary" onClick={() => navigate('/login')}>Đăng nhập</Button>
        </Empty>
    );

    return (
        <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>

            {/* PHẦN QUẢN LÝ THÔNG TIN SHOP */}
            <Card style={{ marginBottom: 24, borderRadius: 12 }}>
                <Row gutter={24} align="middle">
                    <Col xs={24} md={4} style={{textAlign:'center'}}>
                        <Avatar shape="square" size={100} src={shopInfo?.avatarUrl} icon={<ShopOutlined />} style={{border: '2px solid #f0f0f0'}} />
                    </Col>
                    <Col xs={24} md={20}>
                        {isEditing ? (
                            <Form form={form} layout="vertical" onFinish={handleUpdateShop}>
                                <Row gutter={16}>
                                    <Col span={8}><Form.Item name="shopName" label="Tên Shop" rules={[{required:true}]}><Input /></Form.Item></Col>
                                    <Col span={8}><Form.Item name="phoneNumber" label="Số điện thoại"><Input /></Form.Item></Col>
                                    <Col span={8}><Form.Item name="address" label="Địa chỉ kho"><Input /></Form.Item></Col>
                                </Row>
                                <Form.Item name="description" label="Giới thiệu shop"><Input.TextArea rows={2} /></Form.Item>
                                <Space>
                                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Lưu thay đổi</Button>
                                    <Button onClick={() => setIsEditing(false)}>Hủy</Button>
                                </Space>
                            </Form>
                        ) : (
                            <div>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                                    <div>
                                        <Title level={3} style={{margin: 0}}>{shopInfo?.shopName || "Chưa đặt tên Shop"}</Title>
                                        <Text type="secondary">{shopInfo?.address || "Chưa cập nhật địa chỉ"}</Text>
                                        <div style={{marginTop: 5, color: '#666'}}>{shopInfo?.description}</div>
                                    </div>
                                    <Space>
                                        <Button icon={<EyeOutlined />} onClick={() => navigate(`/market/shop/${currentUser}`)}>Xem Shop (Public)</Button>
                                        <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditing(true)}>Sửa thông tin</Button>
                                    </Space>
                                </div>
                                <Divider style={{margin: '15px 0'}} />
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Statistic title="Tổng đơn hàng" value={orders.length} prefix={<ShopOutlined />} />
                                    </Col>
                                    <Col span={8}>
                                        <Statistic title="Doanh thu thực tế" value={orders.filter(o => o.status === 'COMPLETED').reduce((acc, c) => acc + c.finalAmount, 0)} prefix={<DollarOutlined />} valueStyle={{color:'#52c41a'}} precision={0} suffix="T" />
                                    </Col>
                                    <Col span={8}>
                                        <Statistic title="Đánh giá trung bình" value={shopInfo?.rating || 5.0} prefix={<UserOutlined />} suffix="/ 5.0" />
                                    </Col>
                                </Row>
                            </div>
                        )}
                    </Col>
                </Row>
            </Card>

            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ marginBottom: 5 }}><ShopOutlined /> Quản Lý Đơn Hàng</Title>
            </div>

            {/* TOOLBAR TÌM KIẾM & LỌC */}
            <Card style={{marginBottom: 20, borderRadius: 8}} bodyStyle={{padding: '16px'}}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={8}>
                        <Input placeholder="Tìm mã đơn, tên khách, tên SP..." prefix={<SearchOutlined style={{color: '#bfbfbf'}}/>} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
                    </Col>
                    <Col xs={12} md={5}>
                        <Select defaultValue="ALL" style={{width: '100%'}} onChange={setFilterStatus} suffixIcon={<FilterOutlined />}>
                            <Option value="ALL">Tất cả trạng thái</Option>
                            <Option value="PREPARING">Chờ xử lý</Option>
                            <Option value="SHIPPED">Đang giao</Option>
                            <Option value="COMPLETED">Hoàn tất</Option>
                            <Option value="CANCELLED">Đã hủy</Option>
                        </Select>
                    </Col>
                    <Col xs={12} md={7}>
                        <RangePicker style={{width: '100%'}} onChange={setFilterDate} format="DD/MM/YYYY" />
                    </Col>
                    <Col xs={24} md={4} style={{textAlign: 'right'}}>
                        <Button icon={<ReloadOutlined />} onClick={fetchMySales}>Làm mới</Button>
                    </Col>
                </Row>
            </Card>

            {/* THỐNG KÊ ĐƠN HÀNG */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}><Card bordered={false} bodyStyle={{padding: 15}}><Statistic title="Chờ xử lý" value={filteredOrders.filter(o => o.status === 'PREPARING').length} valueStyle={{ color: '#faad14' }} prefix={<ClockCircleOutlined />} /></Card></Col>
                <Col span={8}><Card bordered={false} bodyStyle={{padding: 15}}><Statistic title="Đang giao" value={filteredOrders.filter(o => o.status === 'SHIPPED').length} valueStyle={{ color: '#1890ff' }} prefix={<CarOutlined />} /></Card></Col>
                <Col span={8}><Card bordered={false} bodyStyle={{padding: 15}}><Statistic title="Doanh thu (Lọc)" value={filteredOrders.filter(o => o.status === 'COMPLETED').reduce((acc, c) => acc + c.finalAmount, 0)} precision={0} valueStyle={{ color: '#52c41a' }} prefix={<DollarOutlined />} suffix="T" /></Card></Col>
            </Row>

            {/* BẢNG DỮ LIỆU */}
            <Card bordered={false} style={{borderRadius: 8}} bodyStyle={{padding: 0}}>
                <Table
                    columns={columns}
                    dataSource={filteredOrders}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10, showTotal: (total) => `Tổng ${total} đơn` }}
                    expandable={{ expandedRowRender, expandIconColumnIndex: 0 }}
                    scroll={{ x: 800 }}
                />
            </Card>
        </div>
    );
};

export default MyShop;