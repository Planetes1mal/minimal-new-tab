// 首屏引导：在样式表与页面内容之前同步执行，把主题模式与配色方案加到 <html> 上，
// 避免新标签页打开时先闪一下默认配色。数据来自 script.js 写入的本地缓存
// （权威数据在 chrome.storage.sync，异步读取，来不及用于首屏）。
(function () {
    const root = document.documentElement;
    let theme = null;
    let scheme = null;
    try {
        const cached = JSON.parse(localStorage.getItem('preferencesCache') || 'null');
        if (cached) {
            theme = cached.theme;
            scheme = cached.colorScheme;
        } else {
            // 旧版本把偏好分散存在 localStorage 各键中，首次升级时从这里读取
            theme = localStorage.getItem('theme');
            scheme = localStorage.getItem('colorScheme');
        }
    } catch (e) {
        console.error('Error reading cached preferences:', e);
    }
    if (theme === 'light' || theme === 'dark') {
        root.classList.add(theme);
    }
    if (scheme === 'ocean' || scheme === 'amber' || scheme === 'slate') {
        root.dataset.scheme = scheme;
    }
})();
