import api from './api';

// --- USER API ---
export const createTicket = (data) => {
    return api.post('/support/create', data);
};

export const getMyTickets = () => {
    return api.get('/support/my-tickets');
};

// --- ADMIN API ---
export const getAllTicketsAdmin = () => {
    return api.get('/support/admin/all');
};

export const replyTicketAdmin = (id, response, status) => {
    return api.put(`/support/admin/reply/${id}`, { response, status });
};