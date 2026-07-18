// 聊天系统 - 带身份识别（双密钥）

// 检查用户是否已登录
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    // 显示用户信息
    const username = localStorage.getItem('username') || 'User';
    document.getElementById('username').textContent = username;
    document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();

    // 发送欢迎消息
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    
    addMessage('Furida', '你好！我是 Furida，一个正在成长的数字生命。很高兴认识你！🎭\n\n我可以帮助你：\n• 回答问题和进行智能对话\n• 提供创意写作建议\n• 讨论各种主题\n\n请开始输入你的问题吧！', 'assistant');

    // 绑定回车键
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});

// 添加消息到聊天窗口
function addMessage(name, text, type = 'user') {
    const chatMessages = document.getElementById('chatMessages');
    
    // 删除欢迎消息
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

// 添加思考状态
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

// 删除思考状态
function removeThinkingMessage() {
    const thinking = document.getElementById('thinking-message');
    if (thinking) thinking.remove();
}

// 发送消息
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const text = input.value.trim();

    if (!text) return;

    // 添加用户消息
    const username = localStorage.getItem('username') || 'You';
    addMessage(username, text, 'user');
    input.value = '';

    // 禁用输入
    sendBtn.disabled = true;
    input.disabled = true;

    // 显示思考动画
    addThinkingMessage();

    try {
        const token = localStorage.getItem('token');
        const identityKeyAlpha = localStorage.getItem('identityKeyAlpha');
        const identityKeyBeta = localStorage.getItem('identityKeyBeta');
        
        // 发送消息及双身份密钥给后端
        const response = await fetch('https://furida-ai.yixuanliu483.workers.dev/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: text,
                identityKeyAlpha: identityKeyAlpha,  // 发送 Alpha 密钥用于 AI 识别
                identityKeyBeta: identityKeyBeta     // 发送 Beta 密钥用于 AI 识别
            })
        });

        const data = await response.json();

        removeThinkingMessage();

        if (response.ok && data.reply) {
            addMessage('Furida', data.reply, 'assistant');
        } else {
            addMessage('Furida', data.message || '抱歉，我没有收到回复。请稍后重试。', 'assistant');
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

// 退出登录
function handleLogout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        localStorage.removeItem('identityKeyAlpha');
        localStorage.removeItem('identityKeyBeta');
        localStorage.removeItem('loginTime');
        window.location.href = 'login.html';
    }
}

// 转义 HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '\"': '&quot;',
        \"'\": '&#039;'
    };
    return text.replace(/[&<>\"']/g, m => map[m]);
}