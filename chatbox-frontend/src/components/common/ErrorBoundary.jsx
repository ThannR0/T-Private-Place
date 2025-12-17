import React from 'react';
import { Button, Result } from 'antd';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log lỗi ra console để bạn đọc
        console.error("🔥 LỖI CRASH TRANG:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 50, textAlign: 'center' }}>
                    <Result
                        status="500"
                        title="Đã xảy ra lỗi hiển thị (Crash)"
                        subTitle="Vui lòng mở Console (F12) để xem chi tiết lỗi màu đỏ."
                        extra={[
                            <div key="err" style={{ textAlign: 'left', background: '#f5f5f5', padding: 20, borderRadius: 8, marginBottom: 20, overflow: 'auto' }}>
                                <code style={{ color: 'red' }}>{this.state.error?.toString()}</code>
                            </div>,
                            <Button type="primary" key="reload" onClick={() => window.location.reload()}>
                                Tải lại trang
                            </Button>
                        ]}
                    />
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;