import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, Typography, Avatar, List, Tag, DatePicker, Button, Space, Tooltip as AntTooltip, message } from 'antd';
import {
    UserOutlined, ShoppingCartOutlined, ShopOutlined, DollarOutlined,
    RiseOutlined, PieChartOutlined, TrophyOutlined, CrownOutlined,
    CheckCircleOutlined, SyncOutlined, CloseCircleOutlined,
    CalendarOutlined, ReloadOutlined, DownloadOutlined, FilePdfOutlined
} from '@ant-design/icons';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { marketApi } from './MarketAPI';
import api from '../../services/api'; // Import axios instance của bạn
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title } = Typography;

const COLORS_METHOD = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const COLORS_STATUS = {
    'Thành công': '#52c41a',
    'Thất bại': '#ff4d4f',
    'Đang treo': '#faad14'
};

const MarketDashboard = () => {
    const [stats, setStats] = useState({ totalUsers: 0, totalProducts: 0, totalOrders: 0, totalRevenue: 0 });
    const [revenueData, setRevenueData] = useState([]);
    const [advancedData, setAdvancedData] = useState({ topUsers: [], paymentMethods: [], transactionStatus: [], dailyRevenue: [] });
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);

    // State chọn năm (Mặc định năm nay)
    const [selectedYear, setSelectedYear] = useState(dayjs().year());

    useEffect(() => {
        loadGeneralData();
    }, []);

    // Khi đổi năm -> Gọi lại API biểu đồ
    useEffect(() => {
        loadRevenueChart(selectedYear);
    }, [selectedYear]);

    // 1. Tải dữ liệu chung
    const loadGeneralData = async () => {
        setLoading(true);
        try {
            const [basicRes, advRes] = await Promise.all([
                marketApi.getAdminStats(),
                marketApi.getAdminAdvancedStats()
            ]);
            setStats(basicRes.data);
            setAdvancedData(advRes.data);
        } catch (e) {
            console.error("Lỗi tải dashboard:", e);
        } finally {
            setLoading(false);
        }
    };

    // 2. Tải biểu đồ doanh thu theo năm
    const loadRevenueChart = async (year) => {
        setChartLoading(true);
        try {
            const res = await api.get('/admin/market/dashboard/chart', { params: { year } });
            setRevenueData(res.data);
            message.success({ content: `Đã tải dữ liệu năm ${year}`, key: 'chartLoad' });
        } catch (e) {
            console.error("Lỗi tải chart:", e);
            message.error("Không thể tải biểu đồ doanh thu");
        } finally {
            setChartLoading(false);
        }
    };

    // --- HÀM 1: XUẤT EXCEL (Dữ liệu biểu đồ doanh thu) ---
    const handleExportExcel = () => {
        if (revenueData.length === 0) {
            return message.warning("Không có dữ liệu biểu đồ để xuất!");
        }
        try {
            const dataToExport = revenueData.map(item => ({
                "Tháng": item.month,
                "Doanh thu (VNĐ)": item.totalAmount,
                "Năm": selectedYear
            }));
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Doanh Thu");
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
            saveAs(data, `Bao_Cao_Doanh_Thu_${selectedYear}.xlsx`);
            message.success("Đã xuất Excel thành công!");
        } catch (error) {
            console.error("Lỗi xuất Excel:", error);
            message.error("Có lỗi khi tạo file Excel");
        }
    };

    // --- HÀM 2: XUẤT PDF (Chi tiết tất cả giao dịch) ---
    const handleExportPdf = async () => {
        try {
            message.loading({ content: "Đang lấy dữ liệu chi tiết...", key: "export" });

            // Gọi API lấy danh sách chi tiết (Cần backend hỗ trợ endpoint này)
            const res = await api.get('/admin/market/transactions/export', {
                params: { year: selectedYear }
            });
            const transactions = res.data;

            if (!transactions || transactions.length === 0) {
                message.warning({ content: "Năm này không có giao dịch nào!", key: "export" });
                return;
            }

            // Khởi tạo PDF
            const doc = new jsPDF();

            // Tiêu đề
            doc.setFontSize(18);
            doc.text(`BAO CAO GIAO DICH NAM ${selectedYear}`, 14, 20);

            doc.setFontSize(11);
            doc.text(`Ngay xuat: ${new Date().toLocaleDateString('en-GB')}`, 14, 30);
            doc.text(`Tong so giao dich: ${transactions.length}`, 14, 36);

            // Chuẩn bị dữ liệu bảng
            const tableColumn = ["STT", "Ma GD", "Loai", "So Tien", "Trang Thai", "Ngay Tao"];
            const tableRows = transactions.map((t, index) => [
                index + 1,
                t.transactionCode,
                t.type,
                parseInt(t.amountVnd).toLocaleString('vi-VN'),
                t.status,
                new Date(t.createdAt).toLocaleString('en-GB') // Format ngày giờ
            ]);

            // Vẽ bảng
            autoTable(doc, {
                startY: 45,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [24, 144, 255] },
                styles: { fontSize: 10 },
            });

            doc.save(`Chi_Tiet_Giao_Dich_${selectedYear}.pdf`);
            message.success({ content: "Xuất PDF thành công!", key: "export" });

        } catch (error) {
            console.error("Lỗi xuất PDF:", error);
            message.error({ content: "Lỗi khi tạo file PDF (Kiểm tra lại Backend)", key: "export" });
        }
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: '#fff', padding: '10px 15px', border: '1px solid #f0f0f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 5 }}>Tháng {label}</p>
                    <p style={{ color: payload[0].fill || '#8884d8', margin: 0 }}>
                        {payload[0].name}: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading && !stats.totalUsers) return <div style={{textAlign:'center', padding: 100}}><Spin size="large" tip="Đang tải dữ liệu..." /></div>;

    return (
        <div style={{ padding: 20 }}>
            {/* 1. THẺ THỐNG KÊ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}><Card bordered={false} hoverable style={{borderRadius: 12}}><Statistic title="Tổng Người Dùng" value={stats.totalUsers} prefix={<UserOutlined />} valueStyle={{ color: '#1890ff' }} /></Card></Col>
                <Col xs={24} sm={12} lg={6}><Card bordered={false} hoverable style={{borderRadius: 12}}><Statistic title="Tổng Sản Phẩm" value={stats.totalProducts} prefix={<ShopOutlined />} valueStyle={{ color: '#faad14' }} /></Card></Col>
                <Col xs={24} sm={12} lg={6}><Card bordered={false} hoverable style={{borderRadius: 12}}><Statistic title="Tổng Đơn Hàng" value={stats.totalOrders} prefix={<ShoppingCartOutlined />} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                <Col xs={24} sm={12} lg={6}><Card bordered={false} hoverable style={{borderRadius: 12}}><Statistic title="Tổng Doanh Thu" value={stats.totalRevenue} prefix={<DollarOutlined />} precision={0} valueStyle={{ color: '#cf1322', fontWeight: 'bold' }} suffix="₫" /></Card></Col>
            </Row>

            {/* 2. BIỂU ĐỒ DOANH THU & THANH CÔNG CỤ */}
            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                    <Card
                        title={
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: 10}}>
                                <Space>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8, background: '#e6f7ff',
                                        display:'flex', alignItems:'center', justifyContent:'center', color:'#1890ff'
                                    }}>
                                        <RiseOutlined />
                                    </div>
                                    <span style={{fontWeight: 600}}>Doanh Thu</span>
                                </Space>

                                {/* THANH CÔNG CỤ */}
                                <Space>
                                    <span style={{fontSize: 13, color: '#888'}}>Năm:</span>
                                    <DatePicker
                                        picker="year"
                                        defaultValue={dayjs(String(selectedYear), 'YYYY')}
                                        onChange={(date) => {
                                            if(date) setSelectedYear(date.year());
                                        }}
                                        allowClear={false}
                                        style={{ width: 90 }}
                                        inputReadOnly
                                    />

                                    <AntTooltip title="Làm mới">
                                        <Button
                                            icon={<ReloadOutlined spin={chartLoading} />}
                                            onClick={() => loadRevenueChart(selectedYear)}
                                            shape="circle"
                                        />
                                    </AntTooltip>

                                    {/* Nút Excel (Biểu đồ) */}
                                    <AntTooltip title="Xuất Excel (Biểu đồ)">
                                        <Button icon={<DownloadOutlined />} shape="circle" onClick={handleExportExcel} />
                                    </AntTooltip>

                                    {/* Nút PDF (Chi tiết) */}
                                    <AntTooltip title="Xuất PDF (Chi tiết GD)">
                                        <Button
                                            icon={<FilePdfOutlined />}
                                            shape="circle"
                                            onClick={handleExportPdf}
                                            type="primary"
                                            danger
                                        />
                                    </AntTooltip>
                                </Space>
                            </div>
                        }
                        bordered={false}
                        style={{ borderRadius: 16 }}
                    >
                        <div style={{ height: 350 }}>
                            {chartLoading ? (
                                <div style={{height: '100%', display:'flex', justifyContent:'center', alignItems:'center'}}>
                                    <Spin />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="month" />
                                        <YAxis tickFormatter={(val) => new Intl.NumberFormat('en', { notation: "compact" }).format(val)} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="totalAmount"
                                            stroke="#8884d8"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorRev)"
                                            name="Doanh thu"
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>
                </Col>

                {/* CỘT PHẢI: 7 NGÀY */}
                <Col xs={24} lg={8}>
                    <Card title={<span><DollarOutlined /> 7 Ngày Gần Nhất</span>} bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                        <div style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={advancedData.dailyRevenue} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="day" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="total" fill="#1890ff" radius={[6, 6, 0, 0]} name="Doanh thu" barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 3. CHART TRÒN & TOP USERS */}
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={8}>
                    <Card title={<span style={{color: '#d48806'}}><TrophyOutlined /> Top Đại Gia</span>} bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                        <List
                            itemLayout="horizontal"
                            dataSource={advancedData.topUsers}
                            renderItem={(item, index) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={
                                            <div style={{position: 'relative'}}>
                                                <Avatar src={item.avatar || `https://ui-avatars.com/api/?name=${item.username}`} size="large" />
                                                {[0,1,2].includes(index) && <CrownOutlined style={{position:'absolute', top:-12, right:-6, color: index===0?'#fadb14':index===1?'#d9d9d9':'#d48806', fontSize: 18}} />}
                                            </div>
                                        }
                                        title={<span style={{fontWeight: 'bold'}}>{item.fullName || item.username}</span>}
                                        description={<Tag color="blue">{item.username}</Tag>}
                                    />
                                    <div style={{ fontWeight: 'bold', color: '#cf1322' }}>
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total)}
                                    </div>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>

                <Col xs={24} lg={16}>
                    <Row gutter={[16, 16]} style={{height: '100%'}}>
                        <Col span={12}>
                            <Card title={<span><PieChartOutlined /> Kênh Thanh Toán</span>} bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                                <div style={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={advancedData.paymentMethods} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                                                {advancedData.paymentMethods.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_METHOD[index % COLORS_METHOD.length]} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>

                        <Col span={12}>
                            <Card title={<span><CheckCircleOutlined /> Trạng Thái (Năm Nay)</span>} bordered={false} style={{ borderRadius: 16, height: '100%' }}>
                                <div style={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={advancedData.transactionStatus || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                                                {advancedData.transactionStatus?.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS_STATUS[entry.name] || '#ccc'} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                formatter={(value) => {
                                                    const icon = value === 'Thành công' ? <CheckCircleOutlined style={{color: COLORS_STATUS['Thành công']}}/> :
                                                        value === 'Thất bại' ? <CloseCircleOutlined style={{color: COLORS_STATUS['Thất bại']}}/> :
                                                            <SyncOutlined style={{color: COLORS_STATUS['Đang treo']}}/>;
                                                    return <span>{icon} {value}</span>
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
};

export default MarketDashboard;