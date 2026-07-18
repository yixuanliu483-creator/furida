// 登录系统 - 双密钥认证（密码在后端存储，身份密钥用于 AI 识别）

// 标签页切换
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabBtns = document.querySelectorAll('.tab-btn');

    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    if (tab === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        tabBtns[0].classList.add('active');
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        tabBtns[1].classList.add('active');
    }
}

// 显示状态消息
function showStatus(message, type) {
    const status = document.getElementById('status');
    status.innerHTML = message;
    status.className = type; // 'success', 'error', 'info'
}

// 处理登录
async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const identityKey = document.getElementById('login-identity-key').value.trim();
    const loginBtn = document.getElementById('loginBtn');

    // 验证输入
    if (!username) {
        showStatus('请输入用户名或邮箱', 'error');
        return;
    }
    if (!password) {
        showStatus('请输入密码', 'error');
        return;
    }
    if (!identityKey) {
        showStatus('请输入身份密钥', 'error');
        return;
    }

    // 禁用按钮，显示加载状态
    loginBtn.disabled = true;
    showStatus('<span class="loading"></span>正在验证身份...', 'info');

    try {
        // 调用后端认证接口
        // 密码在后端验证，身份密钥用于 AI 识别用户身份
        const response = await fetch('https://furida-ai.yixuanliu483.workers.dev/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                identityKey: identityKey
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // 保存会话信息到本地存储
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            localStorage.setItem('userId', data.userId);
            // 保存身份密钥用于后续 AI 交互（仅在本地存储）
            localStorage.setItem('identityKey', identityKey);
            localStorage.setItem('loginTime', new Date().toISOString());

            showStatus('✓ 登录成功！正在进入 Furida...', 'success');
            
            // 延迟跳转，让用户看到成功信息
            setTimeout(() => {
                window.location.href = 'chat.html';
            }, 1000);
        } else {
            showStatus(data.message || '登录失败，请检查凭证', 'error');
            loginBtn.disabled = false;
        }
    } catch (error) {
        console.error('登录错误:', error);
        showStatus('连接错误，请稍后重试', 'error');
        loginBtn.disabled = false;
    }
}

// 处理注册
async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const confirm = document.getElementById('reg-confirm').value.trim();
    const identityKey = document.getElementById('reg-identity-key').value.trim();
    const registerBtn = document.getElementById('registerBtn');

    // 验证输入
    if (!username) {
        showStatus('请输入用户名', 'error');
        return;
    }
    if (username.length < 3) {
        showStatus('用户名至少需要 3 个字符', 'error');
        return;
    }
    if (!email || !email.includes('@')) {
        showStatus('请输入有效的邮箱地址', 'error');
        return;
    }
    if (!password) {
        showStatus('请输入密码', 'error');
        return;
    }
    if (password.length < 6) {
        showStatus('密码至少需要 6 个字符', 'error');
        return;
    }
    if (password !== confirm) {
        showStatus('两次输入的密码不一致', 'error');
        return;
    }
    if (!identityKey) {
        showStatus('请设置身份密钥', 'error');
        return;
    }
    if (identityKey.length < 6) {
        showStatus('身份密钥至少需要 6 个字符', 'error');
        return;
    }

    // 禁用按钮，显示加载状态
    registerBtn.disabled = true;
    showStatus('<span class="loading"></span>正在创建账户...', 'info');

    try {
        // 调用后端注册接口
        // 密码在后端存储，身份密钥也在后端存储用于 AI 识别
        const response = await fetch('https://furida-ai.yixuanliu483.workers.dev/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
                identityKey: identityKey
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showStatus('✓ 注册成功！请使用新账户登录', 'success');
            
            // 延迟切换到登录标签页
            setTimeout(() => {
                // 清空表单
                document.getElementById('reg-username').value = '';
                document.getElementById('reg-email').value = '';
                document.getElementById('reg-password').value = '';
                document.getElementById('reg-confirm').value = '';
                document.getElementById('reg-identity-key').value = '';
                
                // 清除状态消息
                showStatus('', 'info');
                
                // 切换到登录
                switchTab('login');
            }, 1500);
        } else {
            showStatus(data.message || '注册失败，请稍后重试', 'error');
            registerBtn.disabled = false;
        }
    } catch (error) {
        console.error('注册错误:', error);
        showStatus('连接错误，请稍后重试', 'error');
        registerBtn.disabled = false;
    }
}

// 回车键提交
document.addEventListener('DOMContentLoaded', () => {
    // 登录表单回车
    document.getElementById('login-username').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('login-identity-key').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // 注册表单回车
    document.getElementById('reg-identity-key').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });

    // 检查是否已登录
    const token = localStorage.getItem('token');
    if (token) {
        // 如果已登录，重定向到聊天页面
        window.location.href = 'chat.html';
    }
});