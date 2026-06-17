// AI 聊天功能

class ChatBot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendButton');
        this.messages = [];
        this.isLoading = false;
        
        // 选择 API 源
        this.apiSource = 'local'; // 'huggingface' 或 'local'
        
        this.init();
    }
    
    init() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // 欢迎消息
        this.addMessage('欢迎来到 Furida AI 聊天助手！😊\n\n你可以和我聊天，我会尽力回答你的问题。\n\n目前支持基础对话功能。未来我会集成更强大的 AI 模型！', 'ai');
    }
    
    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isLoading) return;
        
        // 添加用户消息
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        this.chatInput.focus();
        
        // 显示加载状态
        this.isLoading = true;
        this.sendButton.disabled = true;
        
        try {
            const response = await this.getAIResponse(message);
            this.addMessage(response, 'ai');
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('抱歉，发生了错误。请稍后重试。', 'ai');
        } finally {
            this.isLoading = false;
            this.sendButton.disabled = false;
        }
    }
    
    async getAIResponse(message) {
        // 方案 1: 使用本地简单回复（目前）
        return this.getLocalResponse(message);
        
        // 方案 2: Hugging Face API (需要配置 API key)
        // return await this.getHuggingFaceResponse(message);
        
        // 方案 3: 你自己的 AI 后端
        // return await this.getCustomAIResponse(message);
    }
    
    getLocalResponse(message) {
        // 简单的本地回复示例
        const responses = {
            '你好': '你好！很高兴认识你。😊',
            '你是谁': '我是 Furida AI 助手，一个运行在你博客上的聊天机器人。',
            '你叫什么': '我叫 Furida，是你个人博客的 AI 伙伴。',
            '谢谢': '不客气！很高兴为你服务。😄',
            '再见': '再见！期待下次聊天！👋',
            '帮助': '我可以：\n1. 回答你的问题\n2. 进行有趣的对话\n3. 提供信息和建议\n\n试试问我任何问题吧！',
        };
        
        // 检查完全匹配
        if (responses[message]) {
            return responses[message];
        }
        
        // 检查包含的关键词
        for (const [key, value] of Object.entries(responses)) {
            if (message.includes(key)) {
                return value;
            }
        }
        
        // 默认回复
        return `你说的是："${message}"。\n\n目前我还在学习中。如果你想要更智能的回复，可以帮我集成一个更强大的 AI 模型！✨`;
    }
    
    async getHuggingFaceResponse(message) {
        // 使用 Hugging Face Inference API
        // 需要获取免费 API key: https://huggingface.co/settings/tokens
        
        const HF_API_KEY = 'your_huggingface_api_key_here';
        const MODEL = 'meta-llama/Llama-2-7b-chat-hf';
        
        if (HF_API_KEY === 'your_huggingface_api_key_here') {
            return '请配置 Hugging Face API key 以使用此功能。';
        }
        
        try {
            const response = await fetch(
                `https://api-inference.huggingface.co/models/${MODEL}`,
                {
                    headers: { Authorization: `Bearer ${HF_API_KEY}` },
                    method: 'POST',
                    body: JSON.stringify({ inputs: message }),
                }
            );
            
            const result = await response.json();
            return result[0]?.generated_text || '无法获取回复';
        } catch (error) {
            console.error('Hugging Face API error:', error);
            throw error;
        }
    }
    
    async getCustomAIResponse(message) {
        // 调用你自己的 AI 后端
        // 示例：Python Flask 后端
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });
            
            if (!response.ok) throw new Error('API request failed');
            
            const data = await response.json();
            return data.response || '无法获取回复';
        } catch (error) {
            console.error('Custom AI error:', error);
            throw error;
        }
    }
    
    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        
        // 自动滚动到底部
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        this.messages.push({ text, sender, timestamp: new Date() });
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('chatMessages')) {
        new ChatBot();
    }
});
