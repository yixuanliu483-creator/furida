// 登录系统 - 双身份密钥认证（仅登录，关闭注册）

// 显示状态消息
function showStatus(message, type) {
    const status = document.getElementById('status');
    status.innerHTML = message;
    status.className = type; // 'success', 'error', 'info'
}

// 处理登录
async function handleLogin() {
    const identityKeyAlpha = document.getElementById('login-identity-key-1').value.trim();
    const identityKeyBeta = document.getElementById('login-identity-key-2').value.trim();
    const loginBtn = document.getElementById('loginBtn');

    // 验证输入
    if (!identityKeyAlpha) {
        showStatus('请输入身份密钥 Alpha', 'error');
        return;
    }
    if (!identityKeyBeta) {
        showStatus('请输入身份密钥 Beta', 'error');
        return;
    }

    // 禁用按钮，显示加载状态
    loginBtn.disabled = true;
    showStatus('<span class="loading"></span>正在验证身份...', 'info');

    try {
        // 调用后端认证接口
        // 使用双身份密钥进行认证
        const response = await fetch('https://furida-ai.yixuanliu483.workers.dev/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identityKeyAlpha: identityKeyAlpha,
                identityKeyBeta: identityKeyBeta
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // 保存会话信息到本地存储
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username || 'Furida User');
            localStorage.setItem('userId', data.userId || 'anonymous');
            // 保存两个身份密钥用于后续 AI 交互
            localStorage.setItem('identityKeyAlpha', identityKeyAlpha);
            localStorage.setItem('identityKeyBeta', identityKeyBeta);
            localStorage.setItem('loginTime', new Date().toISOString());

            showStatus('✓ 身份验证成功！正在进入 Furida...', 'success');
            
            // 延迟跳转，让用户看到成功信息
            setTimeout(() => {
                window.location.href = 'chat.html';
            }, 1000);
        } else {
            showStatus(data.message || '身份验证失败，请检查身份密钥', 'error');
            loginBtn.disabled = false;
        }
    } catch (error) {
        console.error('登录错误:', error);
        showStatus('连接错误，请稍后重试', 'error');
        loginBtn.disabled = false;
    }
}

// 回车键提交
document.addEventListener('DOMContentLoaded', () => {
    // 身份密钥输入框回车
    document.getElementById('login-identity-key-1').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('login-identity-key-2').focus();
        }
    });
    document.getElementById('login-identity-key-2').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // 检查是否已登录
    const token = localStorage.getItem('token');
    if (token) {
        // 如果已登录，重定向到聊天页面
        window.location.href = 'chat.html';
    }
});