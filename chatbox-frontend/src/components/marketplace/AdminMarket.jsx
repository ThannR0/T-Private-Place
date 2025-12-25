import React, { useEffect, useState } from 'react';
import { Table, Button, Image, Tag, message, Card, Typography, Space, Popconfirm, Tabs, Input, InputNumber, Form, DatePicker, Select, Row, Col, Statistic } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, ShopOutlined, DeleteOutlined, GiftOutlined, AppstoreOutlined, ShoppingCartOutlined, SearchOutlined, FilterOutlined, DollarOutlined } from '@ant-design/icons';
import { marketApi } from './MarketAPI';

const { Title, Text } = Typography;
const { Option } = Select;

const AdminMarket = () => {
    const [loading, setLoading] = useState(false);

    // Dữ liệu gốc (Khởi tạo mảng rỗng để tránh lỗi null ban đầu)
    const [data, setData] = useState({
        pending: [],
        allProducts: [],
        vouchers: [],
        orders: []
    });

    // Dữ liệu hiển thị
    const [filteredData, setFilteredData] = useState({
        pending: [],
        allProducts: [],
        orders: []
    });

    const [searchText, setSearchText] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');

    const [formVoucher] = Form.useForm();

    // --- FETCH DATA (Đã sửa lỗi chống crash) ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // Sử dụng Promise.allSettled để nếu 1 API lỗi thì các API khác vẫn chạy được
            // Tuy nhiên để giữ logic cũ của bạn, tôi dùng try-catch và kiểm tra kỹ dữ liệu trả về
            const [resPending, resAll, resVouchers, resOrders] = await Promise.all([
                marketApi.getPendingProducts(),
                marketApi.getAllProductsAdmin(),
                marketApi.getAllVouchers(),
                marketApi.getAllOrdersAdmin()
            ]);

            // 🟢 FIX QUAN TRỌNG: Thêm "|| []" để nếu API trả về null/undefined thì không bị lỗi
            const newData = {
                pending: Array.isArray(resPending.data) ? resPending.data : [],
                allProducts: Array.isArray(resAll.data) ? resAll.data : [],
                vouchers: Array.isArray(resVouchers.data) ? resVouchers.data : [],
                orders: Array.isArray(resOrders.data) ? resOrders.data : []
            };

            setData(newData);
            // Reset filter
            setFilteredData({
                pending: newData.pending,
                allProducts: newData.allProducts,
                orders: newData.orders
            });
        } catch (error) {
            console.error("Lỗi tải dữ liệu admin:", error);
            // Không set lại state thành null để tránh trắng trang
            message.error("Có lỗi khi tải dữ liệu (Chi tiết trong Console)");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- LOGIC TÌM KIẾM & LỌC (Đã thêm kiểm tra null) ---
    useEffect(() => {
        const lowerSearch = searchText.toLowerCase();

        const filterFn = (item, type) => {
            if (!item) return false; // Check item null

            // Tìm theo tên sản phẩm hoặc tên người bán
            const matchName = (item.name || '').toLowerCase().includes(lowerSearch) ||
                (item.seller?.username || '').toLowerCase().includes(lowerSearch);

            // Tìm theo mã đơn hàng
            const matchOrder = (item.orderCode || '').toLowerCase().includes(lowerSearch);

            const matchText = type === 'order' ? (matchOrder || matchName) : matchName;

            // Lọc danh mục
            const matchCat = filterCategory === 'ALL' || item.category === filterCategory;

            return matchText && (type === 'order' ? true : matchCat);
        };

        // 🟢 FIX QUAN TRỌNG: Kiểm tra mảng trước khi .filter
        setFilteredData({
            pending: (data.pending || []).filter(i => filterFn(i, 'product')),
            allProducts: (data.allProducts || []).filter(i => filterFn(i, 'product')),
            orders: (data.orders || []).filter(i => filterFn(i, 'order'))
        });
    }, [searchText, filterCategory, data]);

    // --- HÀNH ĐỘNG ---
    const handleApprove = async (id, isApproved) => {
        try {
            await marketApi.approveProduct(id, isApproved);
            message.success("Đã xử lý xong!");
            fetchData();
        } catch (e) { message.error("Lỗi: " + e.message); }
    };

    const handleDeleteProduct = async (id) => {
        try {
            await marketApi.deleteProduct(id);
            message.success("Đã xóa!");
            fetchData();
        } catch (e) { message.error("Lỗi xóa"); }
    };

    const handleCreateVoucher = async (values) => {
        try {
            const payload = { ...values, discountPercent: values.discountPercent / 100 };
            await marketApi.createVoucher(payload);
            message.success("Tạo voucher thành công");
            formVoucher.resetFields();
            fetchData();
        } catch (e) { message.error("Lỗi: " + e.message); }
    };

    const handleAdminUpdateOrder = async (orderId, status) => {
        try {
            await marketApi.adminUpdateOrderStatus(orderId, status);
            message.success(`Đã chuyển đơn hàng sang trạng thái: ${status}`);
            fetchData();
        } catch (e) { message.error("Lỗi cập nhật: " + e.message); }
    };

    // --- COLUMNS ---
    const productColumns = (isPending) => [
        { title: 'ID', dataIndex: 'id', width: 60 },
        {
            title: 'Sản phẩm', dataIndex: 'name',
            render: (t, r) => (
                <Space>
                    <Image src={r.images?.[0]} width={40} />
                    <div>
                        <div style={{fontWeight:600}}>{t}</div>
                        <div style={{fontSize:11, color:'#888'}}>{r.category}</div>
                    </div>
                </Space>
            )
        },
        { title: 'Giá', dataIndex: 'price', render: v => <Text type="danger">{v?.toLocaleString()}</Text> },
        { title: 'Seller', dataIndex: 'seller', render: s => <Tag color="blue">{s?.username}</Tag> },
        {
            title: 'Hành động',
            render: (_, r) => isPending ? (
                <Space>
                    <Button type="primary" size="small" onClick={() => handleApprove(r.id, true)}>Duyệt</Button>
                    <Button danger size="small" onClick={() => handleApprove(r.id, false)}>Hủy</Button>
                </Space>
            ) : (
                <Popconfirm title="Xóa?" onConfirm={() => handleDeleteProduct(r.id)}>
                    <Button danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
            )
        }
    ];

    const orderColumns = [
        { title: 'Mã Đơn', dataIndex: 'orderCode', render: t => <b>{t}</b> },
        { title: 'Người mua', dataIndex: 'buyer', render: u => <Tag>{u?.username}</Tag> },
        { title: 'Người bán', dataIndex: 'seller', render: u => <Tag color="blue">{u?.username}</Tag> },
        { title: 'Tổng tiền', dataIndex: 'finalAmount', render: v => <span style={{color:'red', fontWeight:'bold'}}>{v?.toLocaleString()} T</span> },
        {
            title: 'Trạng thái', dataIndex: 'status',
            render: (status) => {
                let color = 'default';
                if(status === 'COMPLETED') color = 'success';
                if(status === 'CANCELLED') color = 'error';
                if(['PREPARING', 'SHIPPED', 'DELIVERED'].includes(status)) color = 'processing';
                return <Tag color={color}>{status}</Tag>
            }
        },
        {
            title: 'Can thiệp (Admin)',
            render: (_, r) => {
                if (r.status === 'COMPLETED' || r.status === 'CANCELLED') return <Text type="secondary">Đã xong</Text>;
                return (
                    <Space>
                        <Popconfirm title="Xác nhận đơn đã xong (Tiền sẽ về Seller)?" onConfirm={() => handleAdminUpdateOrder(r.id, 'COMPLETED')}>
                            <Button size="small" type="primary" style={{background: '#52c41a'}}>Hoàn tất</Button>
                        </Popconfirm>
                        <Popconfirm title="Hủy đơn này (Hoàn tiền Buyer)?" onConfirm={() => handleAdminUpdateOrder(r.id, 'CANCELLED')}>
                            <Button size="small" danger>Hủy đơn</Button>
                        </Popconfirm>
                    </Space>
                )
            }
        }
    ];

    // --- TAB ITEMS ---
    const items = [
        {
            key: '1',
            label: <span><CheckCircleOutlined /> Duyệt bài ({filteredData.pending.length})</span>,
            children: <Table dataSource={filteredData.pending} columns={productColumns(true)} rowKey="id" pagination={{pageSize: 5}} />
        },
        {
            key: '2',
            label: <span><AppstoreOutlined /> Tất cả SP ({filteredData.allProducts.length})</span>,
            children: <Table dataSource={filteredData.allProducts} columns={productColumns(false)} rowKey="id" pagination={{pageSize: 8}} />
        },
        {
            key: '3',
            label: <span><DollarOutlined /> Quản lý Đơn hàng ({filteredData.orders.length})</span>,
            children: (
                <div>
                    <div style={{marginBottom: 10, background: '#fffbe6', padding: 10, borderRadius: 5, border: '1px solid #ffe58f'}}>
                        <Text type="warning">⚠️ Lưu ý: Hành động "Can thiệp" sẽ cưỡng chế chuyển tiền ngay lập tức. Hãy kiểm tra kỹ trước khi bấm.</Text>
                    </div>
                    <Table dataSource={filteredData.orders} columns={orderColumns} rowKey="id" />
                </div>
            )
        },
        {
            key: '4',
            label: <span><GiftOutlined /> Voucher</span>,
            children: (
                <Row gutter={20}>
                    <Col span={8}>
                        <Card title="Tạo Voucher" size="small">
                            <Form form={formVoucher} layout="vertical" onFinish={handleCreateVoucher}>
                                <Form.Item name="code" label="Mã"><Input placeholder="Tự sinh nếu trống"/></Form.Item>
                                <Form.Item name="discountPercent" label="Giảm (%)" rules={[{required:true}]}><InputNumber min={1} max={100} style={{width:'100%'}}/></Form.Item>
                                <Form.Item name="ownerUsername" label="Username nhận"><Input placeholder="Để trống = Public"/></Form.Item>
                                <Button type="primary" htmlType="submit" block>Tạo</Button>
                            </Form>
                        </Card>
                    </Col>
                    <Col span={16}>
                        {/* 🟢 FIX: Đảm bảo dataSource luôn là mảng */}
                        <Table dataSource={data.vouchers || []} columns={[
                            { title: 'Mã', dataIndex: 'code', render: t => <Tag>{t}</Tag> },
                            { title: 'Giảm', dataIndex: 'discountPercent', render: v => (v * 100).toFixed(0) + '%' },
                            { title: 'User', dataIndex: 'owner', render: u => u?.username || 'All' }
                        ]} rowKey="id" pagination={{pageSize: 5}}/>
                    </Col>
                </Row>
            )
        }
    ];

    return (
        <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 12, marginBottom: 20 }}>
                <Row gutter={24} align="middle">
                    <Col span={12}>
                        <Title level={3} style={{ margin: 0 }}>⚙️ Admin Control Center</Title>
                    </Col>
                    <Col span={12} style={{ textAlign: 'right' }}>
                        <Button icon={<SyncOutlined />} onClick={fetchData} loading={loading}>Làm mới dữ liệu</Button>
                    </Col>
                </Row>

                <div style={{ marginTop: 20, display: 'flex', gap: 15 }}>
                    <Input
                        placeholder="🔍 Tìm kiếm sản phẩm, đơn hàng, người bán..."
                        prefix={<SearchOutlined />}
                        size="large"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <Select
                        defaultValue="ALL"
                        size="large"
                        style={{ width: 200 }}
                        onChange={setFilterCategory}
                    >
                        <Option value="ALL">Tất cả danh mục</Option>
                        <Option value="Electronics">Điện tử</Option>
                        <Option value="Fashion">Thời trang</Option>
                        <Option value="Other">Khác</Option>
                    </Select>
                </div>
            </div>

            <div style={{ background: '#fff', padding: 20, borderRadius: 12 }}>
                <Tabs defaultActiveKey="1" items={items} type="card" size="large" />
            </div>
        </div>
    );
};

export default AdminMarket;