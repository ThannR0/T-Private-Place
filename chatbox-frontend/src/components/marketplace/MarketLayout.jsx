import React, { useState, useEffect } from 'react';
import { Layout, Typography, Checkbox, Slider, InputNumber, Button, Divider, Card } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

// Danh mục cứng (Hoặc có thể nhận từ props nếu muốn động)
const CATEGORIES = ['Điện tử', 'Thời trang', 'Nhà cửa', 'Sách', 'Khác'];
const MAX_PRICE_DEFAULT = 10000000; // 10 triệu

const MarketLayout = ({ children, onFilterChange }) => {
    // --- STATE QUẢN LÝ BỘ LỌC TẠI SIDEBAR ---
    const [selectedCats, setSelectedCats] = useState([]);
    const [priceRange, setPriceRange] = useState([0, MAX_PRICE_DEFAULT]);
    const [inputMin, setInputMin] = useState(null);
    const [inputMax, setInputMax] = useState(null);

    // Gửi dữ liệu ra ngoài khi bấm Áp dụng hoặc thay đổi danh mục
    // Dùng useEffect để tự động gửi khi check danh mục, còn giá thì đợi bấm nút
    useEffect(() => {
        triggerFilter();
    }, [selectedCats]); // Khi danh mục đổi -> Lọc ngay

    const triggerFilter = (customPriceRange) => {
        if (onFilterChange) {
            onFilterChange({
                category: selectedCats, // Gửi mảng danh mục
                priceRange: customPriceRange || priceRange // Gửi khoảng giá
            });
        }
    };

    // Xử lý nút "Áp dụng" giá
    const handleApplyPrice = () => {
        let min = inputMin !== null ? inputMin : priceRange[0];
        let max = inputMax !== null ? inputMax : priceRange[1];

        // Validate: Nếu min > max thì đảo ngược
        if (min > max) {
            const temp = min; min = max; max = temp;
            setInputMin(min); setInputMax(max);
        }

        const newRange = [min, max];
        setPriceRange(newRange);
        triggerFilter(newRange);
    };

    // Xử lý nút "Xóa lọc"
    const handleClearFilter = () => {
        setSelectedCats([]);
        setPriceRange([0, MAX_PRICE_DEFAULT]);
        setInputMin(null);
        setInputMax(null);

        // Reset về mặc định
        if (onFilterChange) {
            onFilterChange({
                category: [],
                priceRange: [0, MAX_PRICE_DEFAULT]
            });
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
            {/* SIDEBAR BỘ LỌC */}
            <Sider
                width={280}
                theme="light"
                breakpoint="lg"
                collapsedWidth="0"
                style={{
                    padding: '20px',
                    borderRight: '1px solid #f0f0f0',
                    overflowY: 'auto',
                    height: '100vh',
                    position: 'sticky',
                    top: 0,
                    left: 0
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <FilterOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                    <Title level={4} style={{ margin: 0 }}>Bộ Lọc</Title>
                </div>

                {/* 1. DANH MỤC */}
                <div style={{ marginBottom: 24 }}>
                    <Text strong>Theo Danh mục</Text>
                    <div style={{ marginTop: 12 }}>
                        <Checkbox.Group
                            options={CATEGORIES}
                            value={selectedCats}
                            onChange={setSelectedCats}
                            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                        />
                    </div>
                </div>

                <Divider />

                {/* 2. KHOẢNG GIÁ */}
                <div style={{ marginBottom: 24 }}>
                    <Text strong>Khoảng giá (Than)</Text>

                    {/* Input nhập tay */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 15 }}>
                        <InputNumber
                            placeholder="Từ" min={0}
                            value={inputMin} onChange={setInputMin}
                            style={{ width: '100%' }}
                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\$\s?|(,*)/g, '')}
                        />
                        <span>-</span>
                        <InputNumber
                            placeholder="Đến" min={0}
                            value={inputMax} onChange={setInputMax}
                            style={{ width: '100%' }}
                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\$\s?|(,*)/g, '')}
                        />
                    </div>

                    {/* Slider kéo */}
                    <Slider
                        range
                        min={0} max={MAX_PRICE_DEFAULT}
                        value={priceRange}
                        onChange={(val) => {
                            setPriceRange(val);
                            setInputMin(val[0]);
                            setInputMax(val[1]);
                        }}
                        tooltip={{ formatter: val => val.toLocaleString() }}
                    />

                    <Button type="primary" block size="small" onClick={handleApplyPrice} style={{ marginTop: 10 }}>
                        Áp dụng giá
                    </Button>
                </div>

                <Divider />

                {/* 3. NÚT RESET */}
                <Button icon={<ReloadOutlined />} block onClick={handleClearFilter}>
                    Xóa tất cả lọc
                </Button>
            </Sider>

            {/* NỘI DUNG CHÍNH (Sẽ chứa ProductList) */}
            <Content style={{ padding: '20px', maxWidth: 1600, width: '100%' }}>
                {children}
            </Content>
        </Layout>
    );
};

export default MarketLayout;