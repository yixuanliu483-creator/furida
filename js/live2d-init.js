// Live2D 模型加载与初始化

document.addEventListener('DOMContentLoaded', () => {
    const errorBox = document.getElementById('live2dError');
    if (errorBox) {
        errorBox.style.display = 'block';
        errorBox.textContent = '✓ live2d-init.js 文件已成功加载并开始执行';
    }
});

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
    if (typeof Live2DCubismCore === 'undefined') {
        showLive2DError('Live2DCubismCore 未定义 —— live2d/live2dcubismcore.min.js 没有正确加载/注册\n\nPIXI.live2d 存在: ' + (!!PIXI.live2d) + '\nPIXI.live2d.Live2DModel 存在: ' + (!!(PIXI.live2d && PIXI.live2d.Live2DModel)));
        return;
    }
    if (!PIXI.live2d) {
        showLive2DError('PIXI.live2d 未定义 —— live2d/index.min.js 没有加载成功，或者加载顺序不对');
        return;
    }
    if (!PIXI.live2d.Live2DModel) {
        showLive2DError('PIXI.live2d.Live2DModel 未定义，但 Live2DCubismCore 和 PIXI.live2d 都存在\n\nPIXI.live2d 里实际有的属性: ' + Object.keys(PIXI.live2d).join(', '));
        return;
    }

    try {
        const app = new PIXI.Application({
            view: canvas,
            width: canvas.clientWidth || 300,
            height: canvas.clientHeight || 400,
            backgroundAlpha: 0,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            autoStart: true
        });

        showLive2DError('正在加载模型文件（最多等待15秒）...');

        const modelPromise = PIXI.live2d.Live2DModel.from(
            'live2d/models/hiyori/runtime/hiyori_pro_t11.model3.json'
        );
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('模型加载超时（15秒），可能是某个资源文件卡住了')), 15000)
        );

        const model = await Promise.race([modelPromise, timeoutPromise]);

        app.stage.addChild(model);

        // 兼容补丁：新版 Cubism Core 把 renderOrders 改名/移除了，换成了 drawOrders，
        // 但 drawOrders 存的是"优先级分组值"（比如200/300/700），不是连续排位，
        // 需要按数值排序，重新算出 0~N-1 的连续排位，才是库内部代码期望的格式
        try {
            const drawables = model.internalModel.coreModel._model.drawables;
            if (!drawables.renderOrders && drawables.drawOrders) {
                const n = drawables.drawOrders.length;
                const indices = Array.from({ length: n }, (_, i) => i);
                indices.sort((a, b) => drawables.drawOrders[b] - drawables.drawOrders[a]);
                const renderOrders = new Int32Array(n);
                indices.forEach((originalIndex, rank) => {
                    renderOrders[originalIndex] = rank;
                });
                drawables.renderOrders = renderOrders;
                showLive2DError('已应用 renderOrders 兼容补丁（按drawOrders排序重算），继续加载...');
            }
        } catch (patchError) {
            console.warn('兼容补丁应用失败（可能库结构不一样）:', patchError);
        }

        // 根据画布大小自动缩放定位，让模型完整显示在画布里
        const rawWidth = model.width;
        const rawHeight = model.height;
        const scaleX = canvas.clientWidth / rawWidth;
        const scaleY = canvas.clientHeight / rawHeight;
        const scale = Math.min(scaleX, scaleY) * 0.9;
        model.scale.set(scale);
        model.x = (canvas.clientWidth - rawWidth * scale) / 2;
        model.y = (canvas.clientHeight - rawHeight * scale) / 2;

        model.interactive = true;
        model.buttonMode = true;

        window.furidaModel = model;
        furidaModel = model;

        showLive2DError(
            `✓ 模型加载成功！\n` +
            `model.width: ${model.width}\n` +
            `model.height: ${model.height}\n` +
            `canvas尺寸: ${canvas.clientWidth} x ${canvas.clientHeight}\n` +
            `计算出的scale: ${scale}\n` +
            `计算出的位置: x=${model.x}, y=${model.y}`
        );
    } catch (error) {
        showLive2DError('模型加载出错: ' + error.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initLive2D();
});
