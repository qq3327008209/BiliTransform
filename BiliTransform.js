// ==UserScript==
// @name         B站视频旋转与缩放
// @namespace    http://tampermonkey.net/
// @version      1.3.9
// @description  为B站视频添加旋转和缩放滑条控制，支持鼠标中键滚动调节，支持鼠标左键长按拖动调整位置（不触发视频暂停/播放）
// @author       John Smish
// @match        *://www.bilibili.com/*
// @match        *://bilibili.com/*
// @match        *://*.bilibili.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ==================== CSS样式 ====================
    const style = document.createElement('style');
    style.textContent = `
.bcmnp-rotate-box {
    box-sizing: border-box;
    position: absolute;
    width: 260px;
    height: fit-content;
    flex-direction: column;
    font-size: 12px;
    padding: 12px 16px 16px 16px;
    text-align: left;
    color: #fff;
    display: none;
    user-select: none;
    border-radius: 8px;
    background-color: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 9999;
}

.bpx-player-ctrl-rotate:hover {
    animation: none !important;
}

.bcmnp-rows {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.bcmnp-slider-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.bcmnp-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.bcmnp-label {
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
}

.bcmnp-value {
    font-size: 13px;
    color: #00AEEC;
    font-weight: 500;
}

.bcmnp-slider {
    width: 100%;
    padding: 4px 0;
}

.bcmnp-slider input[type=range] {
    -webkit-appearance: none;
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    outline: none;
}

.bcmnp-slider input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    border: 2px solid #00AEEC;
    transition: transform 0.1s ease;
}

.bcmnp-slider input[type=range]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
}

.bcmnp-scale-presets,
.bcmnp-rotate-presets {
    display: flex;
    flex-direction: row;
    gap: 8px;
    margin-top: 4px;
    justify-content: space-between;
}

.bcmnp-preset-btn {
    background-color: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    width: 48px;
    height: 28px;
    line-height: 28px;
    text-align: center;
    transition: all 0.2s ease;
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    cursor: pointer;
}

.bcmnp-preset-btn:hover {
    background-color: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.2);
}

.bcmnp-preset-btn.active {
    background-color: #00AEEC;
    border-color: #00AEEC;
    color: white;
    box-shadow: 0 2px 8px rgba(0, 174, 236, 0.3);
}

/* 拖动提示样式 */
.bcmnp-drag-hint {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    pointer-events: none;
    z-index: 10000;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: bcmnp-fadeOut 1.5s ease forwards;
    white-space: nowrap;
}

@keyframes bcmnp-fadeOut {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    10% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
}

/* 拖动状态光标 - 应用到全局 */
body.bcmnp-dragging-active {
    cursor: grabbing !important;
}

.bcmnp-dragging-video {
    cursor: grabbing !important;
}

/* 重置位置按钮 */
.bcmnp-reset-position {
    margin-top: 8px;
    display: flex;
    justify-content: center;
}

.bcmnp-reset-btn {
    background-color: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 6px 12px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    text-align: center;
}

.bcmnp-reset-btn:hover {
    background-color: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.2);
    color: #00AEEC;
}

/* 按钮动画相关 */
@keyframes rotateToggle {
    0% { transform: scale(1) translateX(0); }
    25% { transform: scale(1) translateX(-3px); }
    75% { transform: scale(1) translateX(-3px); }
    100% { transform: scale(1) translateX(0); }
}

.bpx-player-ctrl-rotate.animating .bpx-player-ctrl-btn-icon {
    animation: rotateToggle 0.8s ease;
}

/* 拦截点击的覆盖层 */
.bcmnp-click-interceptor {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 99999;
    background: transparent;
    pointer-events: auto;
    display: none;
}

.bcmnp-click-interceptor.active {
    display: block;
}

/* 当前角度指示器 */
.bcmnp-angle-indicator {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid #00AEEC;
    border-radius: 50%;
    margin-left: 4px;
    position: relative;
}

.bcmnp-angle-indicator::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2px;
    height: 6px;
    background-color: #00AEEC;
    transform: translate(-50%, -50%) rotate(var(--angle, 0deg));
    transform-origin: center;
}
    `;
    document.head.appendChild(style);

    // ==================== HTML模板 ====================
    const rotateHtml = `
<div class="bpx-player-ctrl-btn bpx-player-ctrl-rotate" role="button" aria-label="旋转">
    <div class="bpx-player-ctrl-btn-icon">
        <span class="bpx-common-svg-icon">
            <svg style="scale: 0.97;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="200" height="200">
                <path id="bcmnp-toggle-icon-vertical" d="m 553.81,128 c -35.34622,0 -84.48,49.13378 -84.48,84.48 v 256.85 h -1.52 v 0.96 h 87.82 l -2.74553,-0.96 V 211.54447 H 812.45553 V 682.67 H 768 l -0.03,-0.03 v 85.37 L 768,768 h 43.52 C 846.86622,768 896,718.86622 896,683.52 V 212.48 C 896,177.13378 846.86622,128 811.52,128 Z" />
                <path id="bcmnp-toggle-icon-shake" d="m 336.896,128.98133 c 23.05754,-4.9956 56.03905,9.64648 61.03465,32.704 4.9956,23.05752 -15.89579,57.8246 -38.95333,62.8202 -34.38934,7.46667 -59.88399,22.96114 -85.18532,48.26247 -25.48613,25.59345 -43.25822,57.84048 -51.28533,93.056 l -1.19467,4.224 c -7.47494,21.29649 -40.48268,33.08736 -62.18918,26.90327 -21.70649,-6.18409 -34.8418,-38.44359 -29.97082,-60.48194 11.60528,-50.81938 37.27275,-97.34906 74.06933,-134.272 36.6134,-36.71308 83.01797,-62.11488 133.67467,-73.17333 z" />
                <path id="bcmnp-toggle-icon-dot" d="m 361.13067,608.59733 c 11.78208,0 21.33333,9.55126 21.33333,21.33334 v 106.66666 c 0,11.78208 -9.55125,21.33334 -21.33333,21.33334 H 308.224 c -11.78208,0 -21.33333,-9.55126 -21.33333,-21.33334 V 629.93067 c 0,-11.78208 9.55125,-21.33334 21.33333,-21.33334 z" />
                <path id="bcmnp-toggle-icon-horizontal" d="m 671.25789,470.38382 c 57.26015,1.19257 102.70476,58.84934 96.49376,114.6237 -0.22515,75.67856 0.96974,151.39574 -0.43437,227.04887 -8.43964,40.97159 -48.7707,65.94561 -85.28793,79.7445 -27.86729,8.38821 -57.60771,2.35022 -86.29846,4.15221 -128.93419,-0.27168 -257.91757,0.91802 -386.81976,-0.75429 -50.54449,-8.13703 -87.09271,-60.55525 -80.87974,-110.83244 0.60127,-79.60731 -1.45966,-159.34845 1.22674,-238.8684 10.18958,-50.6741 65.48009,-80.09982 114.32883,-76.17492 142.55783,-0.1735 285.11587,0.13346 427.67093,1.06077 z M 221.04821,802.95179 c 151.30119,0 302.60239,0 453.90358,0 0,-80.19008 0,-160.38016 0,-240.57024 -151.30119,0 -302.60239,0 -453.90358,0 0,80.19008 0,160.38016 0,240.57024 z" />
            </svg>
        </span>
    </div>
    <div class="bcmnp-rotate-box">
        <div class="bcmnp-rows">
            <div class="bcmnp-slider-container">
                <div class="bcmnp-label-row">
                    <span class="bcmnp-label">视频缩放</span>
                    <span class="bcmnp-value" id="scale-value">100%</span>
                </div>
                <div class="bcmnp-slider">
                    <input type="range" id="scale-slider" min="50" max="400" value="100" step="1">
                </div>
                <div class="bcmnp-scale-presets">
                    <button data-scale="1" class="bcmnp-preset-btn">100%</button>
                    <button data-scale="1.7" class="bcmnp-preset-btn">170%</button>
                    <button data-scale="2.4" class="bcmnp-preset-btn">240%</button>
                    <button data-scale="3.2" class="bcmnp-preset-btn">320%</button>
                </div>
            </div>
            <div class="bcmnp-slider-container">
                <div class="bcmnp-label-row">
                    <span class="bcmnp-label">视频旋转</span>
                    <span class="bcmnp-value" id="rotate-value">0°</span>
                </div>
                <div class="bcmnp-slider">
                    <input type="range" id="rotate-slider" min="0" max="360" value="0" step="1">
                </div>
                <div class="bcmnp-rotate-presets">
                    <button data-angle="0" class="bcmnp-preset-btn">0°</button>
                    <button data-angle="90" class="bcmnp-preset-btn">90°</button>
                    <button data-angle="180" class="bcmnp-preset-btn">180°</button>
                    <button data-angle="270" class="bcmnp-preset-btn">270°</button>
                </div>
            </div>
            <div class="bcmnp-reset-position">
                <button class="bcmnp-reset-btn" id="reset-position-btn">重置视频位置</button>
            </div>
        </div>
    </div>
</div>
    `;

    // ==================== 工具函数 ====================
    function waitUntilElementReady(selector) {
        return new Promise((resolve, reject) => {
            const maxTries = 100;
            let trys = 0;
            function _checkReady() {
                const el = document.querySelector(selector);
                if (el) {
                    resolve(el);
                    return;
                }
                if (trys++ > maxTries) {
                    reject(new Error(`Element ${selector} not found`));
                    return;
                }
                setTimeout(_checkReady, 300);
            }
            _checkReady();
        });
    }

    function insertHtmlAfterElement(element, html) {
        const range = document.createRange();
        const frag = range.createContextualFragment(html);
        element.parentElement?.insertBefore(frag, element.nextSibling);
    }

    function log(message) {
        console.log(`[B站视频旋转与缩放] ${message}`);
    }

    function printVersion(version, cost) {
        console.log(
            `%c 🎮 B站视频旋转与缩放 v${version} %c Cost ${cost}ms 作者：John Smish QQ：3327008209`,
            'background:#4A90E2;color:white;padding:2px 6px;border-radius:3px 0 0 3px;font-weight:bold;',
            'background:#50E3C2;color:#003333;padding:2px 6px;border-radius:0 3px 3px 0;font-weight:bold;',
        );
    }

    function showDragHint(message = '按住左键拖动可移动视频位置') {
        const videoWrap = document.querySelector('.bpx-player-video-wrap');
        if (!videoWrap) return;
        
        const hint = document.createElement('div');
        hint.className = 'bcmnp-drag-hint';
        hint.textContent = message;
        videoWrap.appendChild(hint);
        
        setTimeout(() => {
            if (hint.parentNode) {
                hint.remove();
            }
        }, 1500);
    }

    // ==================== 旋转矩阵工具函数 ====================
    function rotatePoint(x, y, angle) {
        const rad = angle * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        return {
            x: x * cos - y * sin,
            y: x * sin + y * cos
        };
    }

    // ==================== 动画关键帧 ====================
    const rotateToggleKeyframes = [
        {
            '@all': { scale: '1', translate: '0px 0px' },
            '#bcmnp-toggle-icon-dot': { opacity: '1' },
            '#bcmnp-toggle-icon-horizontal': { scale: '1', rotate: '0deg', transformOrigin: '50% 60%', translate: '0px 0px' },
            '#bcmnp-toggle-icon-vertical': { opacity: '1' },
            '#bcmnp-toggle-icon-shake': { opacity: '1', rotate: '0deg', transformOrigin: '50% 60%' }
        },
        {
            '@all': { scale: '1', translate: '-3px 0px' },
            '#bcmnp-toggle-icon-dot': { opacity: '0' },
            '#bcmnp-toggle-icon-horizontal': { scale: '1.1', rotate: '90deg', transformOrigin: '50% 60%', translate: '200px -50px' },
            '#bcmnp-toggle-icon-vertical': { opacity: '0' },
            '#bcmnp-toggle-icon-shake': { opacity: '0', rotate: '0deg', transformOrigin: '50% 60%' }
        },
        {
            '@all': { scale: '1', translate: '-3px 0px' },
            '#bcmnp-toggle-icon-dot': { opacity: '0' },
            '#bcmnp-toggle-icon-horizontal': { scale: '1.1', rotate: '90deg', transformOrigin: '50% 60%', translate: '200px -50px' },
            '#bcmnp-toggle-icon-vertical': { opacity: '0' },
            '#bcmnp-toggle-icon-shake': { opacity: '0', rotate: '180deg', transformOrigin: '50% 60%' }
        },
        {
            '@all': { scale: '1', translate: '0px 0px' },
            '#bcmnp-toggle-icon-dot': { opacity: '1' },
            '#bcmnp-toggle-icon-horizontal': { scale: '1', rotate: '0deg', transformOrigin: '50% 60%', translate: '0px 0px' },
            '#bcmnp-toggle-icon-vertical': { opacity: '1' },
            '#bcmnp-toggle-icon-shake': { opacity: '1', rotate: '0deg', transformOrigin: '50% 60%' }
        }
    ];

    function animateGroup(element, keyframes, options) {
        const individualKeyframes = [];
        for (const frame of keyframes) {
            for (const selector in frame) {
                let target = null;
                if (selector === '@all') {
                    target = element;
                } else {
                    target = element.querySelector(selector);
                }
                if (target) {
                    let record = individualKeyframes.find(r => r.element === target);
                    if (!record) {
                        record = { element: target, keyframes: [] };
                        individualKeyframes.push(record);
                    }
                    record.keyframes.push(frame[selector]);
                }
            }
        }
        for (const { element: el, keyframes: kf } of individualKeyframes) {
            el.animate(kf, options);
        }
    }

    // ==================== 主控制器 ====================
    class RotateController {
        constructor() {
            this.timer = null;
            this.isToggleAnimating = false;
            this.currentScale = 1;
            this.currentAngle = 0;
            this.currentTranslateX = 0;
            this.currentTranslateY = 0;
            this.updateTimer = null;
            this.lastEnterTime = 0;
            this.animationCooldown = false;
            
            // 拖动相关
            this.isDragging = false;
            this.dragStartX = 0;
            this.dragStartY = 0;
            this.translateStartX = 0;
            this.translateStartY = 0;
            this.dragLongPressTimer = null;
            
            // 单击/长按检测器
            this.isMouseDown = false;           // 鼠标是否按下
            this.mouseDownTime = 0;              // 鼠标按下的时间戳
            this.longPressThreshold = 500;       // 长按阈值（毫秒）
            this.isLongPressReady = false;       // 是否已满足长按条件（等待移动）
            
            // 用于拦截点击的标记
            this.wasDragging = false;
            this.clickInterceptor = null;
            
            // 鼠标移动监听（全局）
            this.globalMouseMoveHandler = (e) => this.onGlobalMouseMove(e);
            this.globalMouseUpHandler = (e) => this.onGlobalMouseUp(e);

            this.init();
        }

        init() {
            const toggle = document.querySelector('.bpx-player-ctrl-rotate .bpx-player-ctrl-btn-icon');
            const panel = document.querySelector('.bpx-player-ctrl-rotate .bcmnp-rotate-box');
            const scaleSlider = document.querySelector('#scale-slider');
            const rotateSlider = document.querySelector('#rotate-slider');
            const scaleValue = document.querySelector('#scale-value');
            const rotateValue = document.querySelector('#rotate-value');
            const scalePresets = document.querySelector('.bcmnp-scale-presets');
            const rotatePresets = document.querySelector('.bcmnp-rotate-presets');
            const rotateBtn = document.querySelector('.bpx-player-ctrl-rotate');
            const resetBtn = document.querySelector('#reset-position-btn');

            if (!toggle || !panel || !scaleSlider || !rotateSlider || !scaleValue || !rotateValue || !scalePresets || !rotatePresets || !rotateBtn || !resetBtn) {
                console.error('元素未找到');
                return;
            }

            this.toggle = toggle;
            this.panel = panel;
            this.scaleSlider = scaleSlider;
            this.rotateSlider = rotateSlider;
            this.scaleValue = scaleValue;
            this.rotateValue = rotateValue;
            this.scalePresets = scalePresets;
            this.rotatePresets = rotatePresets;
            this.rotateBtn = rotateBtn;
            this.resetBtn = resetBtn;

            // 事件监听
            this.rotateBtn.addEventListener('mouseenter', () => this.onMouseEnter());
            this.rotateBtn.addEventListener('mouseleave', () => this.onMouseLeave());
            this.panel.addEventListener('mouseenter', () => this.onPanelEnter());
            this.panel.addEventListener('mouseleave', () => this.onPanelLeave());
            
            this.scaleSlider.addEventListener('input', (e) => this.scaleSliderOnInput(e));
            this.rotateSlider.addEventListener('input', (e) => this.rotateSliderOnInput(e));
            
            this.scalePresets.addEventListener('click', (e) => this.scalePresetOnClick(e));
            this.rotatePresets.addEventListener('click', (e) => this.rotatePresetOnClick(e));
            
            this.resetBtn.addEventListener('click', () => this.resetPosition());

            // 鼠标中键滚动控制滑条
            this.scaleSlider.addEventListener('wheel', (e) => this.handleWheel(e, this.scaleSlider, 1));
            this.rotateSlider.addEventListener('wheel', (e) => this.handleWheel(e, this.rotateSlider, 1));
            
            const scaleContainer = this.scaleSlider.closest('.bcmnp-slider-container');
            const rotateContainer = this.rotateSlider.closest('.bcmnp-slider-container');
            if (scaleContainer) scaleContainer.addEventListener('wheel', (e) => this.handleWheel(e, this.scaleSlider, 1));
            if (rotateContainer) rotateContainer.addEventListener('wheel', (e) => this.handleWheel(e, this.rotateSlider, 1));

            // 创建点击拦截器
            this.createClickInterceptor();
            
            // 视频拖动相关事件
            this.initDragEvents();
        }

        createClickInterceptor() {
            this.clickInterceptor = document.createElement('div');
            this.clickInterceptor.className = 'bcmnp-click-interceptor';
            
            this.clickInterceptor.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }, true);
            
            this.clickInterceptor.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }, true);
            
            this.clickInterceptor.addEventListener('mouseup', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }, true);
            
            document.body.appendChild(this.clickInterceptor);
        }

        initDragEvents() {
            const videoWrap = document.querySelector('.bpx-player-video-wrap');
            if (!videoWrap) {
                setTimeout(() => this.initDragEvents(), 1000);
                return;
            }

            const video = videoWrap.querySelector('video');
            
            if (video) {
                video.addEventListener('click', (e) => this.onVideoClick(e), true);
                video.addEventListener('mousedown', (e) => this.onVideoMouseDown(e), true);
                video.addEventListener('mouseup', (e) => this.onVideoMouseUp(e), true);
                video.addEventListener('mousemove', (e) => this.onVideoMouseMove(e), true);
            }
            
            videoWrap.addEventListener('mousedown', (e) => this.onVideoMouseDown(e), true);
            videoWrap.addEventListener('mouseup', (e) => this.onVideoMouseUp(e), true);
            videoWrap.addEventListener('mousemove', (e) => this.onVideoMouseMove(e), true);
            videoWrap.addEventListener('dragstart', (e) => e.preventDefault());
            
            // 添加全局 mouseup 监听，确保在任何地方松开鼠标都能退出拖动状态
            document.addEventListener('mouseup', this.globalMouseUpHandler, true);
            
            setTimeout(() => showDragHint(), 3000);
        }

        onVideoClick(e) {
            // 计算按下到松开的时间
            const clickDuration = Date.now() - this.mouseDownTime;
            
            // 如果是短按（小于阈值）且没有拖动，让播放/暂停正常触发
            if (clickDuration < this.longPressThreshold && !this.isDragging && !this.wasDragging) {
                log(`单击检测: ${clickDuration}ms，允许播放/暂停`);
                return; // 不阻止，让事件正常传递
            }
            
            // 如果是长按或拖动，阻止点击事件
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            log(`阻止点击事件 - 时长: ${clickDuration}ms, 长按就绪: ${this.isLongPressReady}, 拖动: ${this.isDragging}`);
            
            return false;
        }

        onVideoMouseDown(e) {
            if (e.button !== 0) return;
            
            log('鼠标按下');
            
            // 重置所有状态
            this.isLongPressReady = false;
            this.isDragging = false;
            this.wasDragging = false;
            
            // 记录鼠标按下状态和时间
            this.isMouseDown = true;
            this.mouseDownTime = Date.now();
            
            // 清除之前的定时器
            if (this.dragLongPressTimer) {
                clearTimeout(this.dragLongPressTimer);
                this.dragLongPressTimer = null;
            }
            
            // 保存起始位置
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.translateStartX = this.currentTranslateX;
            this.translateStartY = this.currentTranslateY;
            
            // 设置长按检测定时器
            this.dragLongPressTimer = setTimeout(() => {
                // 如果鼠标仍然按着，标记为长按就绪
                if (this.isMouseDown) {
                    this.isLongPressReady = true;
                    log('长按就绪: 500ms已到，等待移动激活拖动');
                    
                    // 添加全局鼠标移动监听
                    document.addEventListener('mousemove', this.globalMouseMoveHandler, true);
                }
            }, this.longPressThreshold);
            
            // 不阻止默认行为
        }

        onVideoMouseMove(e) {
            // 这个方法现在主要用于调试，实际移动处理在全局监听中
            if (this.isDragging) {
                e.preventDefault();
                e.stopPropagation();
            }
        }

        onVideoMouseUp(e) {
            if (e.button !== 0) return;
            
            log('鼠标松开 (video)');
            this.endDrag(e);
        }

        onGlobalMouseUp(e) {
            if (e.button !== 0) return;
            
            log('鼠标松开 (global)');
            this.endDrag(e);
        }

        endDrag(e) {
            // 鼠标已松开
            this.isMouseDown = false;
            
            // 清除长按定时器
            if (this.dragLongPressTimer) {
                clearTimeout(this.dragLongPressTimer);
                this.dragLongPressTimer = null;
            }
            
            // 如果是拖动状态，处理拖动结束
            if (this.isDragging) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                this.wasDragging = true;
                this.isDragging = false;
                this.isLongPressReady = false;
                
                const videoWrap = document.querySelector('.bpx-player-video-wrap');
                if (videoWrap) {
                    videoWrap.classList.remove('bcmnp-dragging-video');
                }
                document.body.classList.remove('bcmnp-dragging-active');
                
                // 移除全局鼠标监听
                document.removeEventListener('mousemove', this.globalMouseMoveHandler, true);
                
                if (this.clickInterceptor) {
                    setTimeout(() => {
                        this.clickInterceptor.classList.remove('active');
                    }, 200);
                }
                
                log(`拖动结束，位置: (${this.currentTranslateX.toFixed(1)}, ${this.currentTranslateY.toFixed(1)})`);
                
                setTimeout(() => {
                    this.wasDragging = false;
                }, 300);
            } else {
                // 如果不是拖动，清理状态
                this.isLongPressReady = false;
                document.removeEventListener('mousemove', this.globalMouseMoveHandler, true);
            }
        }

        onGlobalMouseMove(e) {
            // 如果还没有长按就绪，或者鼠标已松开，不处理
            if (!this.isLongPressReady || !this.isMouseDown) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            // 计算从按下位置开始的移动距离
            const deltaX = Math.abs(e.clientX - this.dragStartX);
            const deltaY = Math.abs(e.clientY - this.dragStartY);
            
            // 如果移动超过阈值，激活拖动
            if (deltaX > 3 || deltaY > 3) {
                // 如果还没有激活拖动，现在激活
                if (!this.isDragging) {
                    this.isDragging = true;
                    
                    const videoWrap = document.querySelector('.bpx-player-video-wrap');
                    if (videoWrap) {
                        // 重新获取当前的translate值，确保起始位置正确
                        const transform = videoWrap.style.transform;
                        const translateMatch = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
                        if (translateMatch) {
                            this.translateStartX = parseFloat(translateMatch[1]) || 0;
                            this.translateStartY = parseFloat(translateMatch[2]) || 0;
                        }
                        
                        document.body.classList.add('bcmnp-dragging-active');
                        videoWrap.classList.add('bcmnp-dragging-video');
                        
                        if (this.clickInterceptor) {
                            this.clickInterceptor.classList.add('active');
                        }
                        
                        log(`拖动激活，起始位置: (${this.translateStartX}, ${this.translateStartY})`);
                    }
                }
                
                // 处理拖动移动
                if (this.isDragging) {
                    // 计算鼠标在屏幕上的移动距离
                    const moveDeltaX = e.clientX - this.dragStartX;
                    const moveDeltaY = e.clientY - this.dragStartY;
                    
                    // 根据当前旋转角度，将屏幕坐标的移动转换为视频坐标系中的移动
                    const rotatedDelta = rotatePoint(moveDeltaX, moveDeltaY, -this.currentAngle);
                    
                    // 根据缩放比例调整移动速度
                    const moveFactor = 1 / this.currentScale;
                    const adjustedDeltaX = rotatedDelta.x * moveFactor;
                    const adjustedDeltaY = rotatedDelta.y * moveFactor;
                    
                    // 计算新的位置
                    const newTranslateX = this.translateStartX + adjustedDeltaX;
                    const newTranslateY = this.translateStartY + adjustedDeltaY;
                    
                    // 更新位置
                    this.currentTranslateX = newTranslateX;
                    this.currentTranslateY = newTranslateY;
                    
                    // 应用到视频
                    this.updateVideoTransform();
                }
            }
        }

        resetPosition() {
            this.currentTranslateX = 0;
            this.currentTranslateY = 0;
            this.updateVideoTransform();
            showDragHint('位置已重置');
            log('位置重置');
        }

        handleWheel(e, slider, step = 1) {
            e.preventDefault();
            e.stopPropagation();

            const delta = e.deltaY > 0 ? -step : step;
            let newValue = parseInt(slider.value, 10) + delta;
            
            const min = parseInt(slider.min, 10);
            const max = parseInt(slider.max, 10);
            newValue = Math.max(min, Math.min(max, newValue));
            
            slider.value = newValue.toString();
            
            const inputEvent = new Event('input', { bubbles: true });
            slider.dispatchEvent(inputEvent);
        }

        onMouseEnter() {
            const now = Date.now();
            
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            
            this.showPanel();
            
            if (!this.animationCooldown || (now - this.lastEnterTime > 1000)) {
                this.playAnimation();
                this.lastEnterTime = now;
                this.animationCooldown = true;
                
                setTimeout(() => {
                    this.animationCooldown = false;
                }, 1500);
            }
        }

        onMouseLeave() {
            this.startHideTimer();
        }

        onPanelEnter() {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
        }

        onPanelLeave() {
            this.startHideTimer();
        }

        startHideTimer() {
            if (this.timer) {
                clearTimeout(this.timer);
            }
            this.timer = setTimeout(() => {
                this.hidePanel();
                this.timer = null;
            }, 300);
        }

        playAnimation() {
            if (!this.isToggleAnimating) {
                this.isToggleAnimating = true;
                animateGroup(this.toggle, rotateToggleKeyframes, { 
                    duration: 800, 
                    easing: 'ease' 
                });
                setTimeout(() => { 
                    this.isToggleAnimating = false; 
                }, 1000);
            }
        }

        showPanel() {
            if (this.panel.style.display === 'flex') return;
            this.panel.style.display = 'flex';
            this.updatePanelPosition();
        }

        hidePanel() {
            if (this.panel.style.display === 'none') return;
            this.panel.style.display = 'none';
        }

        updatePanelPosition() {
            const toggleRect = this.rotateBtn.getBoundingClientRect();
            const panelRect = this.panel.getBoundingClientRect();
            const screenType = document.querySelector('.bpx-player-container')?.dataset.screen ?? 'normal';
            
            this.panel.style.bottom = (screenType === 'full' || screenType === 'web') ? '74px' : '41px';
            this.panel.style.right = `${(toggleRect.width - panelRect.width) / 2}px`;
        }

        scaleSliderOnInput(e) {
            const value = parseInt(e.target.value, 10);
            this.scaleValue.textContent = `${value}%`;
            this.currentScale = value / 100;
            this.updateActivePresets();
            
            if (this.updateTimer) clearTimeout(this.updateTimer);
            this.updateTimer = setTimeout(() => this.updateVideoTransform(), 50);
        }

        rotateSliderOnInput(e) {
            const value = parseInt(e.target.value, 10);
            this.rotateValue.textContent = `${value}°`;
            this.currentAngle = value;
            this.updateActivePresets();
            
            if (this.updateTimer) clearTimeout(this.updateTimer);
            this.updateTimer = setTimeout(() => this.updateVideoTransform(), 50);
        }

        scalePresetOnClick(e) {
            const target = e.target;
            if (!target.classList.contains('bcmnp-preset-btn')) return;
            
            const scaleStr = target.dataset.scale;
            if (!scaleStr) return;
            
            const scale = parseFloat(scaleStr);
            const percent = Math.round(scale * 100);
            
            this.scaleSlider.value = percent.toString();
            this.scaleValue.textContent = `${percent}%`;
            this.currentScale = scale;
            this.updateActivePresets();
            this.updateVideoTransform();
        }

        rotatePresetOnClick(e) {
            const target = e.target;
            if (!target.classList.contains('bcmnp-preset-btn')) return;
            
            const angleStr = target.dataset.angle;
            if (!angleStr) return;
            
            const angle = parseInt(angleStr, 10);
            
            this.rotateSlider.value = angle.toString();
            this.rotateValue.textContent = `${angle}°`;
            this.currentAngle = angle;
            this.updateActivePresets();
            this.updateVideoTransform();
        }

        updateActivePresets() {
            this.scalePresets.querySelectorAll('.bcmnp-preset-btn').forEach(btn => {
                const scaleStr = btn.dataset.scale;
                if (scaleStr) {
                    const scale = parseFloat(scaleStr);
                    btn.classList.toggle('active', Math.abs(scale - this.currentScale) < 0.01);
                }
            });
            
            this.rotatePresets.querySelectorAll('.bcmnp-preset-btn').forEach(btn => {
                const angleStr = btn.dataset.angle;
                if (angleStr) {
                    const angle = parseInt(angleStr, 10);
                    btn.classList.toggle('active', angle === this.currentAngle);
                }
            });
        }

        updateVideoTransform() {
            const video = document.querySelector('.bpx-player-video-wrap');
            if (!video) {
                log('视频元素未找到');
                return;
            }

            let angle = this.currentAngle;
            const scale = this.currentScale;

            const W = 16, H = 9;
            const rad = angle * Math.PI / 180;
            const scaleX = W / (W * Math.abs(Math.cos(rad)) + H * Math.abs(Math.sin(rad)));
            const scaleY = H / (W * Math.abs(Math.sin(rad)) + H * Math.abs(Math.cos(rad)));
            const compositeScale = Math.min(scaleX, scaleY) * scale;

            if (angle === 90 || angle === 270 || angle === 180) angle += 0.0001;

            const oldTransform = video.style.transform || '';
            
            const newTransform = `rotate(${angle}deg) scale(${compositeScale}) translate(${this.currentTranslateX}px, ${this.currentTranslateY}px)`;

            video.style.transform = newTransform;
            video.style.transformOrigin = 'center center';

            if (!this.isDragging && oldTransform) {
                video.animate([
                    { transform: oldTransform },
                    { transform: newTransform }
                ], { duration: 300, easing: 'ease-in-out' });
            }
        }
    }

    // ==================== 启动脚本 ====================
    async function main() {
        try {
            const settingBtn = await waitUntilElementReady('.bpx-player-ctrl-btn.bpx-player-ctrl-setting');
            const beginTime = performance.now();

            insertHtmlAfterElement(settingBtn, rotateHtml);
            
            setTimeout(() => {
                window.rotateController = new RotateController();
                const cost = (performance.now() - beginTime).toFixed(1);
                printVersion('1.3.9', cost);
                log('脚本加载完成！功能：旋转、缩放、鼠标中键调节、左键长按500ms后移动才激活拖动（已修复松开退出拖动状态）');
            }, 500);
        } catch (error) {
            console.error('脚本初始化失败:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();