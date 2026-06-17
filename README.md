# Furida - Personal Blog with AI Chat

个人博客 + AI 聊天助手

## 🎯 功能

- 📝 **Markdown 博客** - 简洁优雅的文章展示
- 💬 **AI 聊天助手** - 免费 AI 模型集成
- 📱 **响应式设计** - 完美适配各种设备
- ⚡ **快速加载** - 静态网站 + CDN 加速
- 🌍 **国内访问友好** - jsDelivr CDN 优化

## 📖 使用指南

### 本地开发

```bash
# 启动本地服务器
python -m http.server 8000

# 访问 http://localhost:8000
```

### 部署到 GitHub Pages

1. 在 GitHub 仓库 Settings 中启用 Pages
2. 选择 `main` 分支作为源
3. 访问 `https://yixuanliu483-creator.github.io/furida/`

## 📚 添加文章

在 `posts/` 目录下创建 HTML 文件：

```html
<!-- posts/my-first-post.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的第一篇文章</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <article class="post">
        <h1>我的第一篇文章</h1>
        <div class="meta">2026-06-17</div>
        <div class="content">
            <p>文章内容...</p>
        </div>
    </article>
    <a href="../">← 返回首页</a>
</body>
</html>
```

然后在 `index.html` 中的文章列表添加链接。

## 🤖 AI 聊天集成

三种方案可选：

### 方案 1：Hugging Face (推荐免费)
```javascript
// 在 js/chat.js 中配置
const HF_API_KEY = 'your_api_key'; // 免费获取
const MODEL = 'meta-llama/Llama-2-7b-chat-hf';
```

### 方案 2：本地离线模型 (完全免费)
安装 Ollama: https://ollama.ai
```bash
ollama pull llama2
ollama serve
```

### 方案 3：Together AI (免费 token)
注册: https://together.ai

## 🌐 国内加速

所有资源自动通过以下 CDN 加速：
- jsDelivr (国内节点)
- Cloudflare (智能路由)

## 📁 项目结构

```
furida/
├── index.html           # 主页
├── chat.html            # AI 聊天页面
├── about.html           # 关于页面
├── posts/               # 文章目录
│   ├── post1.html
│   └── post2.html
├── css/
│   └── style.css        # 全局样式
├── js/
│   ├── app.js           # 主应用
│   └── chat.js          # 聊天功能
└── README.md
```

## 🚀 未来计划

- [ ] 集成你自己的 AI 模型
- [ ] 评论功能
- [ ] 文章搜索
- [ ] 分类和标签
- [ ] 暗色主题

## 📄 许可证

MIT
