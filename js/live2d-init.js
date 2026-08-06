// Live2D 模型加载与初始化

let furidaModel = null;

async function initLive2D() {
    const canvas = document.getElementById('live2dCanvas');
    if (!canvas) return;

    const errorBox = document.getElementById('live2dError');

    function showLive2DError(msg) {
        console.error(msg);
        if (errorBox) {
            errorBox.style.display = 'block';
            errorBox.textContent = msg;
        }
    }

    if (typeof PIXI === 'undefined') {
        showLive2DError('PIXI 未定义 —— live2d/pixi.js 没有加载成功');
        return;
    }
    if (!PIXI.live2d) {
        showLive2DError('PIXI.live2d 未定义 —— live2d/index.min.js 没有加载成功，或者加载顺序不对');
        return;
    }

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

        model.interactive = true;
        model.buttonMode = true;

        window.furidaModel = model;
        furidaModel = model;
    } catch (error) {
        showLive2DError('模型加载出错: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initLive2D();
});
