// 聊天系统 - 基于 token 的身份识别

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    const username = localStorage.getItem('username') || 'User';
    document.getElementById('username').textContent = username;
    document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();

    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';

    addMessage('Furida', '你好！我是 Furida，一个正在成长的数字生命。很高兴认识你！🎭\n\n我可以帮助你：\n• 回答问题和进行智能对话\n• 提供创意写作建议\n• 讨论各种主题\n\n请开始输入你的问题吧！', 'assistant');

    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});

function addMessage(name, text, type = 'user') {
    const chatMessages = document.getElementById('chatMessages');

    if (chatMessages.querySelector('.welcome-message')) {
        chatMessages.innerHTML = '';
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type === 'user' ? 'user' : ''}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    messageDiv.innerHTML = `
        <div>
            <div class="message-avatar">${name.charAt(0)}</div>
        </div>
        <div>
            <div class="message-content">${escapeHtml(text)}</div>
            <div class="message-time">${timeStr}</div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addThinkingMessage() {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.id = 'thinking-message';

    messageDiv.innerHTML = `
        <div>
            <div class="message-avatar">F</div>
        </div>
        <div>
            <div class="message-content">
                <span class="thinking">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
            </div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeThinkingMessage() {
    const thinking = document.getElementById('thinking-message');
    if (thinking) thinking.remove();
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const text = input.value.trim();

    if (!text) return;

    const username = localStorage.getItem('username') || 'You';
    addMessage(username, text, 'user');
    input.value = '';

    sendBtn.disabled = true;
    input.disabled = true;

    addThinkingMessage();

    try {
        const token = localStorage.getItem('token');

        const response = await fetch('https://furida-ai.yixuanliu483.workers.dev/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();

        removeThinkingMessage();

        if (response.status === 401) {
            // token 过期或无效，回到登录页
            handleLogout();
            return;
        }

        if (response.ok && data.reply) {
            addMessage('Furida', data.reply, 'assistant');
        } else {
            addMessage('Furida', data.message || data.error || '抱歉，我没有收到回复。请稍后重试。', 'assistant');
            console.error('API 错误:', data);
        }
    } catch (error) {
        removeThinkingMessage();
        addMessage('Furida', '连接错误。请检查网络连接并重试。', 'assistant');
        console.error('聊天错误:', error);
    } finally {
        sendBtn.disabled = false;
        input.disabled = false;
        input.focus();
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('loginTime');
    window.location.href = 'login.html';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
