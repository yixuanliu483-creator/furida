// 登录系统 - 双身份密钥认证（仅登录，关闭注册）

const API_URLS = ['https://furida.de5.net', 'https://furida-ai.yixuanliu483.workers.dev'];

// 依次尝试每个后端地址，前一个网络请求失败（不是业务逻辑失败）才换下一个
async function apiFetch(path, options) {
    let lastError;
    for (const base of API_URLS) {
        try {
            return await fetch(base + path, options);
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.innerHTML = message;
    status.className = type;
}

async function handleLogin() {
    const identityKeyAlpha = document.getElementById('login-identity-key-1').value.trim();
    const identityKeyBeta = document.getElementById('login-identity-key-2').value.trim();
    const loginBtn = document.getElementById('loginBtn');

    if (!identityKeyAlpha) {
        showStatus('请输入身份密钥 Alpha', 'error');
        return;
    }
    if (!identityKeyBeta) {
        showStatus('请输入身份密钥 Beta', 'error');
        return;
    }

    loginBtn.disabled = true;
    showStatus('<span class="loading"></span>正在验证身份...', 'info');

    try {
        const response = await apiFetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identityKeyAlpha, identityKeyBeta })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username || 'Furida User');
            localStorage.setItem('role', data.role || 'user');
            localStorage.setItem('loginTime', new Date().toISOString());
            // 注意：不再保存原始密钥，身份识别之后完全由 token 承担

            showStatus('✓ 身份验证成功！正在进入 Furida...', 'success');

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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-identity-key-1').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('login-identity-key-2').focus();
        }
    });
    document.getElementById('login-identity-key-2').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'chat.html';
    }
});
