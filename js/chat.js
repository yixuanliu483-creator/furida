// 聊天系统 - 基于 token 的身份识别

async function loadAnnouncement() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://furida-ai.yixuanliu483.workers.dev/announcement', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.content && data.content.trim()) {
            document.getElementById('announcementContent').textContent = data.content;
            document.getElementById('announcementModal').style.display = 'flex';
        }
    } catch (error) {
        console.error('公告加载失败:', error);
    }
}

function closeAnnouncement() {
    document.getElementById('announcementModal').style.display = 'none';
}

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

    loadAnnouncement();

    document.getElementById('messageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    const voiceBtn = document.getElementById('voiceToggleBtn');
    if (voiceBtn) {
        voiceBtn.textContent = isVoiceEnabled() ? '🔊 语音已开启' : '🔇 语音已关闭';
    }

    // PWA/Service Worker 暂时停用，等后续统一实现时再开启
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(reg => reg.unregister());
        });
    }
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

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

function isVoiceEnabled() {
    return localStorage.getItem('voiceEnabled') === 'true';
}

function toggleVoice() {
    const enabled = !isVoiceEnabled();
    localStorage.setItem('voiceEnabled', enabled ? 'true' : 'false');
    const btn = document.getElementById('voiceToggleBtn');
    if (btn) btn.textContent = enabled ? '🔊 语音已开启' : '🔇 语音已关闭';
}

async function fetchTTSAudio(text) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://furida-ai.yixuanliu483.workers.dev/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        return data.audio || null;
    } catch (error) {
        console.error('TTS 请求出错:', error);
        return null;
    }
}

function playAudioBase64(base64) {
    return new Promise((resolve) => {
        const audio = new Audio(`data:audio/mp3;base64,${base64}`);
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(() => resolve());
    });
}

async function playSentencesQueue(sentences) {
    if (!isVoiceEnabled() || !sentences || sentences.length === 0) return;

    // 所有句子并行请求语音合成（不用排队等前一句处理完），
    // 但严格按顺序播放，第一句一到就先播，后面的边生成边等待播放
    const audioPromises = sentences.map(s => fetchTTSAudio(s));

    for (const promise of audioPromises) {
        const audioBase64 = await promise;
        if (audioBase64) {
            await playAudioBase64(audioBase64);
        }
    }
}

async function toggleRecording() {
    if (isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('micBtn').textContent = '🎤';
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);

        mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(track => track.stop());
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendVoiceMessage(audioBlob);
        };

        mediaRecorder.start();
        isRecording = true;
        document.getElementById('micBtn').textContent = '⏹️';
    } catch (error) {
        alert('无法访问麦克风，请检查权限设置');
        console.error('录音错误:', error);
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function sendVoiceMessage(audioBlob) {
    const input = document.getElementById('messageInput');
    input.placeholder = '正在识别语音...';

    try {
        const base64Audio = await blobToBase64(audioBlob);
        const token = localStorage.getItem('token');

        const response = await fetch('https://furida-ai.yixuanliu483.workers.dev/stt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ audio: base64Audio })
        });

        const data = await response.json();
        input.placeholder = 'Say something to Furida...';

        if (response.ok && data.text && data.text.trim()) {
            input.value = data.text.trim();
            sendMessage();
        } else {
            alert('没有识别到语音内容，请重试');
        }
    } catch (error) {
        input.placeholder = 'Say something to Furida...';
        alert('语音识别出错，请检查网络');
        console.error('语音识别错误:', error);
    }
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
            playSentencesQueue(data.sentences && data.sentences.length ? data.sentences : [data.reply]);
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
        if (response.status === 401) {
            // token 过期或无效，回到登录页
            handleLogout();
            return;
        }

        if (response.ok && data.reply) {
            addMessage('Furida', data.reply, 'assistant');
            playSentencesQueue(data.sentences && data.sentences.length ? data.sentences : [data.reply]);
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
