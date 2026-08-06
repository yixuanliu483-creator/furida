// Live2D 模型加载与初始化

let furidaModel = null;

async function initLive2D() {
    const canvas = document.getElementById('live2dCanvas');
    if (!canvas) return;

    try {
        const app = new PIXI.Application({
            view: canvas,
            width: canvas.clientWidth || 300,
            height: canvas.clientHeight || 400,
            transparent: true,
            autoStart: true
        });

        const model = await PIXI.live2d.Live2DModel.from(
            'live2d/models/hiyori/runtime/hiyori_pro_t11.model3.json'
        );

        app.stage.addChild(model);

        // 根据画布大小自动缩放定位，让模型完整显示在画布里
        const scaleX = canvas.clientWidth / model.width;
        const scaleY = canvas.clientHeight / model.height;
        const scale = Math.min(scaleX, scaleY) * 0.9;
        model.scale.set(scale);
        model.x = (canvas.clientWidth - model.width * scale) / 2;
        model.y = (canvas.clientHeight - model.height * scale) / 2;

        // 允许拖动模型调整位置（可选的小交互）
        model.interactive = true;
        model.buttonMode = true;

        window.furidaModel = model;
        furidaModel = model;
    } catch (error) {
        console.error('Live2D 模型加载失败:', error);
        const canvasEl = document.getElementById('live2dCanvas');
        if (canvasEl) {
            canvasEl.style.display = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof PIXI !== 'undefined' && PIXI.live2d) {
        initLive2D();
    } else {
        console.error('PIXI 或 PIXI.live2d 未加载，跳过 Live2D 初始化');
    }
});
