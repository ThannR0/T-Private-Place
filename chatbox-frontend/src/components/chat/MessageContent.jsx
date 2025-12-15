import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MessageContent = ({ content }) => {
    return (
        <div className="modern-markdown">
            <style>{`
                .modern-markdown {
                    font-size: 15px;
                    line-height: 1.5;
                    word-wrap: break-word;
                }

                /* 1. Xử lý đoạn văn (p) */
                .modern-markdown p {
                    margin: 0 0 6px 0; /* Chỉ cách dưới một chút, không cách trên */
                }
                /* Dòng cuối cùng của tin nhắn thì KHÔNG được cách dưới -> Gọn bong bóng chat */
                .modern-markdown > *:last-child {
                    margin-bottom: 0 !important;
                }
                .modern-markdown > *:first-child {
                    margin-top: 0 !important;
                }

                /* 2. Xử lý Danh sách (ul, ol) */
                .modern-markdown ul, .modern-markdown ol {
                    margin: 4px 0;
                    padding-left: 20px;
                }
                .modern-markdown li {
                    margin-bottom: 2px;
                }

                /* 3. Xử lý Tiêu đề (h1-h6) - Bot hay dùng */
                .modern-markdown h1, .modern-markdown h2, .modern-markdown h3, 
                .modern-markdown h4, .modern-markdown h5, .modern-markdown h6 {
                    font-weight: 700;
                    margin: 10px 0 5px 0;
                    font-size: 1.1em; /* Không để chữ quá to làm vỡ khung chat */
                    line-height: 1.3;
                }

                /* 4. Link */
                .modern-markdown a {
                    color: #096dd9;
                    text-decoration: underline;
                }
                
                /* 5. Code block (nếu có) */
                .modern-markdown pre {
                    background: rgba(0,0,0,0.05);
                    padding: 8px;
                    border-radius: 6px;
                    overflow-x: auto;
                }
                .modern-markdown code {
                    font-family: Consolas, monospace;
                    background: rgba(0,0,0,0.06);
                    padding: 2px 4px;
                    border-radius: 4px;
                    font-size: 0.9em;
                }
            `}</style>

            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Link mở tab mới
                    a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MessageContent;