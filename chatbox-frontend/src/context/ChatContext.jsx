import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { message } from 'antd';
import api from '../services/api';
import { getAvatarUrl } from '../utils/common';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    // --- STATE ---
    const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('username'));
    const [currentFullName, setCurrentFullName] = useState(() => localStorage.getItem('fullName'));
    const [currentAvatar, setCurrentAvatar] = useState(() => localStorage.getItem('avatar'));
    const [myStatus, setMyStatus] = useState("ONLINE");

    const [messages, setMessages] = useState([]);
    const [recipient, setRecipient] = useState("bot");
    const [users, setUsers] = useState([]);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [feedUpdate, setFeedUpdate] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // --- REFS (Bộ nhớ đệm chống trùng) ---
    const stompClientRef = useRef(null);
    const subscribedGroupsRef = useRef(new Set());
    const processedNotiIdsRef = useRef(new Set());

    // THÊM: Bộ lọc chống trùng cho Feed (Group, Status...)
    const processedFeedIdsRef = useRef(new Set());

    // --- 1. XỬ LÝ TIN NHẮN ---
    const processMessage = (msg) => {
        if (msg.fileUrl && !msg.file) {
            return {
                ...msg,
                file: { url: msg.fileUrl, type: msg.fileType || 'file', name: msg.fileName || 'file' }
            };
        }
        return msg;
    };

    const addMessageUnique = (newMsg) => {
        const cleanMsg = processMessage(newMsg);
        setMessages(prev => {
            if (cleanMsg.id && prev.some(m => m.id === cleanMsg.id)) return prev;

            // Check trùng nội dung + thời gian (chặn Echo)
            const isDuplicate = prev.some(m =>
                m.senderId === cleanMsg.senderId &&
                m.content === cleanMsg.content &&
                Math.abs(new Date(m.timestamp).getTime() - new Date(cleanMsg.timestamp).getTime()) < 2000
            );
            if (isDuplicate) return prev;

            return [...prev, cleanMsg];
        });
    };

    const deleteNotification = async (notiId) => {
        try {
            await api.delete(`/notifications/${notiId}`);
            // Cập nhật State ngay lập tức
            setNotifications(prev => prev.filter(n => n.id !== notiId));
            // Tính lại số chưa đọc (nếu tin vừa xóa là tin chưa đọc)
            setUnreadCount(prev => {
                // Logic đơn giản: đếm lại từ list mới
                // Nhưng ở đây ta filter state cũ nên hơi khó tính chính xác số unread giảm bao nhiêu
                // Cách nhanh nhất: Trừ 1 nếu > 0 (tạm thời), hoặc để lần sau fetch lại tự đúng.
                return prev > 0 ? prev - 1 : 0;
            });
        } catch (e) { console.error("Lỗi xóa noti", e); }
    };

    const clearAllNotifications = async () => {
        try {
            await api.delete('/notifications'); // Gọi API xóa hết
            setNotifications([]); // Xóa sạch state
            setUnreadCount(0);    // Reset số đỏ về 0
        } catch (e) { console.error("Lỗi xóa all noti", e); }
    };

    // --- 2. TẢI DỮ LIỆU ---
    const fetchUsers = async () => {
        try {
            const [resUsers, resGroups] = await Promise.all([
                api.get('/users'),
                api.get('/groups/my-groups')
            ]);

            const processedUsers = resUsers.data.map(u => ({
                ...u,
                displayName: u.fullName || u.username,
                avatar: getAvatarUrl(u.username, u.fullName, u.avatar),
                status: u.status || 'OFFLINE',
                isGroup: false
            }));

            const processedGroups = resGroups.data.map(g => ({
                username: `GROUP_${g.id}`,
                displayName: g.name,
                avatar: g.avatar || `https://ui-avatars.com/api/?name=${g.name}&background=random`,
                status: 'ONLINE', isGroup: true, realGroupId: g.id
            }));

            const botUser = {
                username: 'bot', displayName: 'Trợ lý AI',
                avatar: 'https://robohash.org/bot?set=set1', status: 'ONLINE', isGroup: false
            };

            setUsers([botUser, ...processedGroups, ...processedUsers]);

        } catch (error) {
            console.error("Lỗi tải data:", error);
            if (error.response && error.response.status === 403) await logoutUser();
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await api.get('/chat/history');

            const processedHistory = res.data.map(msg => processMessage(msg));
            setMessages(processedHistory);
        } catch (error) { console.error("Lỗi tải tin nhắn:", error); }
    };

    const refreshGroups = () => { fetchUsers(); };

    // --- 3. SOCKET CONNECT ---
    const subscribeToGroup = (groupId) => {
        if (!stompClientRef.current || !stompClientRef.current.connected) return;
        const topic = `/topic/group/${groupId}`;
        if (subscribedGroupsRef.current.has(topic)) return;

        stompClientRef.current.subscribe(topic, (payload) => {
            const msg = JSON.parse(payload.body);

            // --- QUAN TRỌNG: Chặn tin nhắn của chính mình (để không hiện 2 lần) ---
            if (msg.senderId === currentUser) return;
            msg.type = 'GROUP';
            addMessageUnique(msg);
        });
        subscribedGroupsRef.current.add(topic);
    };

    useEffect(() => {
        if (!currentUser) return;

        // Reset các bộ lọc khi login mới
        subscribedGroupsRef.current.clear();
        processedNotiIdsRef.current.clear();
        processedFeedIdsRef.current.clear();

        const client = Stomp.over(() => new SockJS('http://localhost:8081/ws'));
        client.debug = () => {};

        client.connect({}, () => {
            console.log("✅ Socket Connected");
            setIsConnected(true);
            stompClientRef.current = client;

            // 1. Chat riêng
            client.subscribe(`/user/${currentUser}/queue/messages`, (payload) => {
                addMessageUnique(JSON.parse(payload.body));
                const isSoundOn = localStorage.getItem('soundEnabled') === 'true';
                if (isSoundOn) {
                    const audio = new Audio('/sounds/notification.mp3');
                    audio.play().catch(e => {});
                }
            });

            // 2. Status & Feed
            client.subscribe('/topic/status', (payload) => {
                const update = JSON.parse(payload.body);
                setUsers(prev => prev.map(u => u.username === update.username ? { ...u, status: update.status } : u));
            });

            client.subscribe('/topic/feed', (payload) => {
                const data = JSON.parse(payload.body);

                if (data.type === 'MSG_UPDATE') {
                    setMessages(prev => prev.map(m =>
                        m.id === data.msg.id ? { ...m, ...data.msg } : m
                    ));
                    return; // Xử lý xong thì return luôn
                }

                // Nếu tin này đã xử lý rồi (dựa trên eventId) -> Bỏ qua
                if (data.eventId && processedFeedIdsRef.current.has(data.eventId)) {
                    return;
                }
                if (data.eventId) processedFeedIdsRef.current.add(data.eventId);
                // ----------------------------------------------

                setFeedUpdate(data);

                if (data.type === 'NEW_GROUP_CREATED') {
                    if (data.group.members.includes(currentUser)) fetchUsers();
                }

                if (data.type === 'GROUP_MEMBER_ADDED') {
                    if (data.addedUser === currentUser) {
                        message.info(`Bạn được thêm vào nhóm: ${data.groupName}`);
                        fetchUsers();
                        fetchMessages();
                    }
                }

                if (data.type === 'USER_UPDATE') {
                    setUsers(prev => prev.map(u => {
                        if (u.username === data.username) {
                            return { ...u, displayName: data.newFullName || u.displayName, avatar: data.newAvatar || u.avatar };
                        }
                        return u;
                    }));
                    if (data.username === currentUser) {
                        if (data.newFullName) { setCurrentFullName(data.newFullName); localStorage.setItem('fullName', data.newFullName); }
                        if (data.newAvatar) { setCurrentAvatar(data.newAvatar); localStorage.setItem('avatar', data.newAvatar); }
                    }
                }
                if (feedUpdate.type === 'POST_REACTION_UPDATE') {
                    setPosts(prev => prev.map(p =>
                        String(p.id) === String(feedUpdate.postId)
                            ? { ...p, reactions: feedUpdate.reactions, likeCount: feedUpdate.likeCount }
                            : p
                    ));
                }

            });

            // 3. Notification (Cũng lọc trùng)
            client.subscribe(`/user/${currentUser}/queue/notifications`, (payload) => {
                const newNoti = JSON.parse(payload.body);
                if (processedNotiIdsRef.current.has(newNoti.id)) return;
                processedNotiIdsRef.current.add(newNoti.id);
                setNotifications(prev => [newNoti, ...prev]);
                setUnreadCount(prev => prev + 1);
                const isSoundOn = localStorage.getItem('soundEnabled') === 'true';
                if (isSoundOn) {
                    try {
                        // Phát âm thanh
                        const audio = new Audio('/sounds/notification.mp3');
                        audio.play().catch(err => console.log("Audio play failed:", err));
                    } catch (e) {
                        console.error("Sound error", e);
                    }
                }
                message.info(newNoti.content);
            });

        }, (err) => {
            setIsConnected(false);
            subscribedGroupsRef.current.clear();
        });

        return () => {
            if (client && client.connected) client.disconnect();
            setIsConnected(false);
        };
    }, [currentUser]);

    // Tự động sub nhóm
    useEffect(() => {
        if (isConnected && stompClientRef.current && users.length > 0) {
            users.filter(u => u.isGroup).forEach(g => subscribeToGroup(g.realGroupId));
        }
    }, [users, isConnected]);

    // --- 4. GỬI TIN ---
    const sendMessage = async (content, fileData = null) => {
        if (!stompClientRef.current || !isConnected) return message.error("Mất kết nối!");
        let uploadedFileUrl = null, uploadedFileType = null, uploadedFileName = null;

        if (fileData && fileData.fileObject) {
            try {
                const formData = new FormData();
                formData.append('file', fileData.fileObject);
                const res = await api.post('/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                uploadedFileUrl = res.data.url;
                uploadedFileType = res.data.type;
                uploadedFileName = res.data.name;
            } catch (error) { return message.error("Lỗi gửi file!"); }
        }

        const isGroupChat = recipient.startsWith("GROUP_");
        let finalRecipientId = recipient;
        if (isGroupChat) {
            const targetGroup = users.find(u => u.username === recipient);
            finalRecipientId = targetGroup ? targetGroup.realGroupId : recipient.replace("GROUP_", "");
        }

        const chatMessage = {
            senderId: currentUser, recipientId: finalRecipientId,
            content, timestamp: new Date().toISOString(),
            fileUrl: uploadedFileUrl, fileType: uploadedFileType, fileName: uploadedFileName,
            type: isGroupChat ? 'GROUP' : 'CHAT'
        };

        try {
            const dest = isGroupChat ? "/app/chat.group" : "/app/chat";
            stompClientRef.current.send(dest, {}, JSON.stringify(chatMessage));

            // Optimistic UI: Hiện tin nhắn ngay (Chỉ lần này là tin nhắn được thêm)
            const localMsg = processMessage({
                ...chatMessage,
                file: fileData ? { url: uploadedFileUrl, name: uploadedFileName, type: uploadedFileType } : null
            });
            addMessageUnique(localMsg);

        } catch (e) { message.error("Gửi tin lỗi!"); }
    };

    const loginUser = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        const name = data.fullName || data.username;
        localStorage.setItem('fullName', name);
        localStorage.setItem('avatar', data.avatar || "");
        setCurrentUser(data.username);
        setCurrentFullName(name);
        setCurrentAvatar(data.avatar || "");
        setMyStatus("ONLINE");
        fetchUsers();
        fetchMessages();
    };

    const logoutUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try { await api.post('/auth/logout', {}, { headers: { 'Authorization': `Bearer ${token}` } }); } catch (e) {}
        }
        if (stompClientRef.current) stompClientRef.current.deactivate();

        ['token', 'username', 'fullName', 'avatar'].forEach(key => localStorage.removeItem(key));
        setCurrentUser(null); setCurrentFullName(null); setCurrentAvatar(null);
        setMyStatus("OFFLINE"); setMessages([]); setNotifications([]);
        setRecipient("bot");
        setIsConnected(false);
        subscribedGroupsRef.current.clear(); processedNotiIdsRef.current.clear(); processedFeedIdsRef.current.clear();
    };

    const updateUserStatus = async (s) => {
        setMyStatus(s);
        setUsers(prev => prev.map(u => u.username === currentUser ? { ...u, status: s } : u));
        try { await api.post('/users/status', { status: s }); } catch (e) {}
    };

    const getUserAvatar = (target) => {
        if (!target) return 'https://via.placeholder.com/150';
        if (target === 'bot') return 'https://robohash.org/bot?set=set1';
        if (target === currentUser) return getAvatarUrl(currentUser, currentFullName, currentAvatar);
        const u = users.find(x => x.username === target);
        return u ? u.avatar : getAvatarUrl(target, target, null);
    };

    const markNotificationsRead = async () => {
        if (unreadCount > 0) {
            try { await api.put('/notifications/read'); setUnreadCount(0); setNotifications(prev => prev.map(n => ({...n, read: true}))); } catch (e) {}
        }
    };
    const leaveGroup = async (groupId) => {
        try {
            await api.post(`/groups/${groupId}/leave`);
            setUsers(prev => prev.filter(u => !(u.isGroup && u.realGroupId === groupId)));
            if (recipient.startsWith("GROUP_") && recipient.includes(String(groupId))) setRecipient("bot");
            message.success("Đã rời nhóm thành công.");
        } catch (error) { message.error("Không thể rời nhóm."); }
    };

    useEffect(() => {
        if (currentUser) {
            fetchUsers();
            fetchMessages();
            api.get('/notifications').then(res => {
                setNotifications(res.data);
                setUnreadCount(res.data.filter(n => !n.read).length);
            }).catch(e => {});
        }
    }, [currentUser]);

    const value = {
        messages, recipient, setRecipient, sendMessage,
        currentUser, currentFullName, currentAvatar, setCurrentAvatar,
        isConnected, loginUser, logoutUser,
        users, getUserAvatar, refreshGroups, leaveGroup,
        myStatus, updateUserStatus, notifications, unreadCount, markNotificationsRead, feedUpdate, fetchMessages, fetchUsers,
        deleteNotification, clearAllNotifications
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
export const useChat = () => useContext(ChatContext);