import React from 'react';
import { Layout, List, Avatar, Typography, Button } from 'antd';
import ChatWindow from '../components/chat/ChatWindow'; // Import Component con
import UserList from "../components/sidebar/UserList.jsx";
import AppHeader from "../components/layout/AppHeader.jsx";
import PageTitle from "../components/common/PageTitle.jsx";
const { Sider, Content, Header } = Layout;
const { Text } = Typography;

const Chat = () => {
    return (

        <Layout style={{ height: '100vh' }}>
            <PageTitle title="Chat"/>

            <Layout>
                {/* Sidebar (Cột trái) */}
                <Sider width={280} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
                    <UserList />
                </Sider>

                {/* Content (Cột phải) - Gọi Component con vào */}
                <Content style={{ height: '100%' }}>
                    <ChatWindow />
                </Content>
            </Layout>
        </Layout>
    );
};

export default Chat;