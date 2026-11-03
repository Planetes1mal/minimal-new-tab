// 存储兼容层：扩展环境用 chrome.storage.sync（跨设备同步），开发环境回退 localStorage。
// 回调统一带上错误对象：get(key, (data, error)) / set(items, (error)) / remove(key, (error))
const HAS_CHROME_STORAGE = typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.sync);
// chrome.storage.sync 单项上限 8192 字节（键名 + JSON 值），超出会写入失败
const SYNC_ITEM_LIMIT = 8192;

const storage = {
    get(key, callback) {
        if (HAS_CHROME_STORAGE) {
            chrome.storage.sync.get(key, (data) => {
                const error = chrome.runtime.lastError;
                if (error) console.error('Error reading chrome.storage:', error.message);
                callback(data || {}, error);
            });
            return;
        }
        try {
            const keys = typeof key === 'string' ? [key] : key;
            const data = {};
            keys.forEach(k => {
                const value = localStorage.getItem(k);
                if (value !== null) data[k] = JSON.parse(value);
            });
            callback(data);
        } catch (e) {
            console.error('Error getting data from localStorage', e);
            callback({}, e);
        }
    },

    set(items, callback) {
        // 提前检查单项大小，给出明确原因（chrome 也会拒绝，但错误信息不友好）
        const oversized = Object.keys(items).find(k =>
            new Blob([k + JSON.stringify(items[k])]).size > SYNC_ITEM_LIMIT
        );
        if (oversized) {
            const error = new Error(`QUOTA_BYTES_PER_ITEM: ${oversized}`);
            error.quota = true;
            console.error('Item too large for sync storage:', oversized);
            if (callback) callback(error);
            return;
        }
        if (HAS_CHROME_STORAGE) {
            chrome.storage.sync.set(items, () => {
                const error = chrome.runtime.lastError;
                if (error) console.error('Error writing chrome.storage:', error.message);
                if (callback) callback(error);
            });
            return;
        }
        try {
            Object.keys(items).forEach(k => {
                localStorage.setItem(k, JSON.stringify(items[k]));
            });
            if (callback) callback();
        } catch (e) {
            console.error('Error saving data to localStorage', e);
            if (callback) callback(e);
        }
    },

    remove(key, callback) {
        if (HAS_CHROME_STORAGE) {
            chrome.storage.sync.remove(key, () => {
                const error = chrome.runtime.lastError;
                if (error) console.error('Error removing chrome.storage key:', error.message);
                if (callback) callback(error);
            });
            return;
        }
        try {
            (Array.isArray(key) ? key : [key]).forEach(k => localStorage.removeItem(k));
            if (callback) callback();
        } catch (e) {
            console.error('Error removing data from localStorage', e);
            if (callback) callback(e);
        }
    },

    // 监听其他标签页（或其他设备同步过来）的修改：callback({ key: newValue })
    onChange(callback) {
        if (HAS_CHROME_STORAGE) {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area !== 'sync') return;
                const values = {};
                Object.keys(changes).forEach(k => { values[k] = changes[k].newValue; });
                callback(values);
            });
            return;
        }
        window.addEventListener('storage', (e) => {
            if (!e.key) return;
            try {
                callback({ [e.key]: e.newValue === null ? undefined : JSON.parse(e.newValue) });
            } catch (err) {
                // 非 JSON 的本地键（如首屏缓存）不属于同步数据，忽略
            }
        });
    }
};

// 写入失败时的统一提示
function describeSaveError(error) {
    if (error && (error.quota || /QUOTA/i.test(error.message || ''))) {
        return '没有保存：数据超出浏览器同步存储的上限（单项 8 KB）。请删除一些快捷链接后重试。';
    }
    return '没有保存：浏览器存储写入失败，请稍后重试。';
}

// 偏好设置：统一存在同步存储的 preferences 键里（跨设备同步、随备份导出）。
// localStorage 的 preferencesCache 只是首屏缓存，供 boot.js 同步读取以避免闪烁。
const PREF_DEFAULTS = {
    theme: null,            // 'light' | 'dark' | null（跟随系统）
    colorScheme: 'forest',  // forest | ocean | amber | slate
    hourFormat: '24',       // '24' | '12'
    openInNewTab: false,    // 默认在当前标签页打开（与浏览器自带新标签页一致）
    shortcuts: {}           // 自定义快捷键：{ action: 'Ctrl+Shift+L' }
};
const PREFS_CACHE_KEY = 'preferencesCache';
const LEGACY_PREF_KEYS = ['theme', 'colorScheme', 'hourFormat', 'openInNewTab', 'customShortcuts'];
const COLOR_SCHEMES = { forest: '森绿', ocean: '碧蓝', amber: '琥珀', slate: '岩墨' };

const prefs = {
    data: { ...PREF_DEFAULTS, shortcuts: {} },

    // 只保留合法值，其余回退默认（存储与备份都可能来自旧版本或被手改）
    sanitize(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const shortcuts = {};
        if (source.shortcuts && typeof source.shortcuts === 'object') {
            Object.keys(SHORTCUT_ACTIONS).forEach(action => {
                const key = source.shortcuts[action];
                if (typeof key === 'string' && key) shortcuts[action] = key;
            });
        }
        return {
            theme: source.theme === 'light' || source.theme === 'dark' ? source.theme : null,
            colorScheme: COLOR_SCHEMES[source.colorScheme] ? source.colorScheme : 'forest',
            hourFormat: source.hourFormat === '12' ? '12' : '24',
            openInNewTab: source.openInNewTab === true,
            shortcuts
        };
    },

    // 旧版本的分散键（均在 localStorage）
    readLegacy() {
        try {
            if (!LEGACY_PREF_KEYS.some(k => localStorage.getItem(k) !== null)) return null;
            let shortcuts = {};
            try {
                shortcuts = JSON.parse(localStorage.getItem('customShortcuts') || '{}') || {};
            } catch (e) {
                shortcuts = {};
            }
            return {
                theme: localStorage.getItem('theme'),
                colorScheme: localStorage.getItem('colorScheme'),
                hourFormat: localStorage.getItem('hourFormat'),
                // 旧版只在用户关闭时存 'false'，缺省表示开启；新版默认关闭（当前标签页），
                // 因此旧值一律按新默认处理
                openInNewTab: false,
                shortcuts
            };
        } catch (e) {
            console.error('Error reading legacy preferences:', e);
            return null;
        }
    },

    clearLegacy() {
        try {
            LEGACY_PREF_KEYS.forEach(k => localStorage.removeItem(k));
        } catch (e) {
            console.error('Error clearing legacy preferences:', e);
        }
    },

    writeCache() {
        try {
            localStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Error caching preferences:', e);
        }
    },

    // 同步阶段：用首屏缓存（或旧键）先渲染，保证首帧正确
    initFromCache() {
        let cached = null;
        try {
            cached = JSON.parse(localStorage.getItem(PREFS_CACHE_KEY) || 'null');
        } catch (e) {
            console.error('Error reading preferences cache:', e);
        }
        this.data = this.sanitize(cached || this.readLegacy());
    },

    // 异步阶段：以同步存储为准；首次运行时把本地偏好迁移过去
    load(callback) {
        storage.get('preferences', (result, error) => {
            if (!error && result.preferences) {
                this.data = this.sanitize(result.preferences);
                this.writeCache();
                this.clearLegacy();
            } else if (!error) {
                this.save();
            }
            if (callback) callback();
        });
    },

    save() {
        this.writeCache();
        storage.set({ preferences: this.data }, (error) => {
            if (error) {
                toast.show(describeSaveError(error));
                return;
            }
            this.clearLegacy();
        });
    },

    // 修改部分偏好并保存
    update(partial) {
        this.data = this.sanitize({ ...this.data, ...partial });
        this.save();
    },

    // 其他标签页或设备修改了偏好
    receive(raw) {
        const next = this.sanitize(raw);
        if (JSON.stringify(next) === JSON.stringify(this.data)) return;
        this.data = next;
        this.writeCache();
        applyPreferences();
    }
};

// 把当前偏好应用到页面各处
function applyPreferences() {
    themeManager.applyTheme();
    schemeManager.applyScheme();
    schemeManager.updateSchemeCards();
    updateDateTime();
    updateHourFormatControl();
    updateOpenBehaviorControl();
    shortcutManager.renderShortcutList();
}

// 主题管理：主题模式加在 <html> 上（与 boot.js 一致），根元素背景随之变化
const themeManager = {
    get currentTheme() {
        return prefs.data.theme;
    },

    init() {
        this.applyTheme();
        this.setupThemeToggle();
    },

    applyTheme() {
        const root = document.documentElement;
        const themeToggle = document.getElementById('theme-toggle');
        root.classList.remove('light', 'dark');
        themeToggle.classList.remove('light', 'dark');
        if (this.currentTheme) {
            root.classList.add(this.currentTheme);
            themeToggle.classList.add(this.currentTheme);
        }
        this.updateThemeModeControl();
    },

    // 设置页选择显示模式：'light' / 'dark' / 'system'（跟随系统存为 null）
    setTheme(mode) {
        prefs.update({ theme: mode === 'light' || mode === 'dark' ? mode : null });
        this.applyTheme();
    },

    // 同步设置页的显示模式选中态
    updateThemeModeControl() {
        const value = this.currentTheme || 'system';
        const radio = document.querySelector(`input[name="theme-mode"][value="${value}"]`);
        if (radio) radio.checked = true;
    },

    // 角落按钮：在浅色与深色之间快速切换（以当前实际显示为准）
    toggleTheme() {
        const isCurrentlyDark = this.currentTheme === 'dark' ||
            (this.currentTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
        this.setTheme(isCurrentlyDark ? 'light' : 'dark');
    },

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }
};

// 配色方案管理（与主题模式正交：方案决定色系，主题模式决定明暗变体）
const schemeManager = {
    get currentScheme() {
        return prefs.data.colorScheme;
    },

    init() {
        this.applyScheme();
        this.setupSchemePicker();
    },

    // 应用方案：只有非默认方案需要 data-scheme 属性（加在 <html> 上）
    applyScheme() {
        const root = document.documentElement;
        if (this.currentScheme === 'forest') {
            delete root.dataset.scheme;
        } else {
            root.dataset.scheme = this.currentScheme;
        }
    },

    selectScheme(scheme) {
        if (!COLOR_SCHEMES[scheme] || scheme === this.currentScheme) {
            return;
        }
        prefs.update({ colorScheme: scheme });
        this.applyScheme();
        this.updateSchemeCards();
    },

    // 同步方案卡选中态；单选组采用 roving tabindex（只有选中项可 Tab 聚焦）
    updateSchemeCards() {
        const cards = document.querySelectorAll('.scheme-card');
        cards.forEach(card => {
            const checked = card.dataset.scheme === this.currentScheme;
            card.setAttribute('aria-checked', String(checked));
            card.tabIndex = checked ? 0 : -1;
        });
    },

    // 绑定方案卡：点击选择，方向键在 2×2 卡阵中移动并选择
    setupSchemePicker() {
        const cards = document.querySelectorAll('.scheme-card');
        cards.forEach((card, index) => {
            card.addEventListener('click', () => {
                this.selectScheme(card.dataset.scheme);
            });

            card.addEventListener('keydown', (e) => {
                const cols = 2;
                let nextIndex = null;
                if (e.key === 'ArrowRight' && index % cols < cols - 1) {
                    nextIndex = index + 1;
                } else if (e.key === 'ArrowLeft' && index % cols > 0) {
                    nextIndex = index - 1;
                } else if (e.key === 'ArrowDown' && index + cols < cards.length) {
                    nextIndex = index + cols;
                } else if (e.key === 'ArrowUp' && index - cols >= 0) {
                    nextIndex = index - cols;
                }
                if (nextIndex !== null) {
                    e.preventDefault();
                    this.selectScheme(cards[nextIndex].dataset.scheme);
                    cards[nextIndex].focus();
                }
            });
        });
        this.updateSchemeCards();
    }
};

// 时间格式：24 小时制（默认）或 12 小时制
function setHourFormat(format) {
    prefs.update({ hourFormat: format === '12' ? '12' : '24' });
    updateDateTime();
    updateHourFormatControl();
}

// 同步通用面板的时间格式选中态
function updateHourFormatControl() {
    const radio = document.querySelector(`input[name="hour-format"][value="${prefs.data.hourFormat}"]`);
    if (radio) {
        radio.checked = true;
    }
}

// 键盘快捷键管理：4 个动作，可自定义组合键，输入框聚焦时不触发
const SHORTCUT_ACTIONS = {
    focusSearch: { label: '聚焦搜索', defaultKey: '/' },
    openSettings: { label: '打开设置', defaultKey: 'Ctrl+,' },
    toggleTheme: { label: '切换主题', defaultKey: 'Ctrl+Shift+L' },
    closeModal: { label: '关闭弹窗', defaultKey: 'Escape' }
};

// 不可单独绑定的导航/编辑键：绑定后会破坏键盘导航或文字输入
const RESERVED_KEYS = ['Tab', 'Enter', 'Space', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];

const shortcutManager = {
    recording: null, // { action, row, keyEl, handler }

    init() {
        this.renderShortcutList();
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    },

    // 当前动作生效的键（自定义优先，回退默认）
    getKey(action) {
        return prefs.data.shortcuts[action] || SHORTCUT_ACTIONS[action].defaultKey;
    },

    // 组合键的显示形式（存储/匹配用完整键名，显示层缩写，如 Escape → ESC）
    displayKey(key) {
        return key.replace('Escape', 'ESC');
    },

    // 键盘事件 → 组合键字符串，如 Ctrl+Shift+L、/、Escape
    formatKey(event) {
        const parts = [];
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.shiftKey) parts.push('Shift');
        if (event.altKey) parts.push('Alt');
        if (event.metaKey) parts.push('Meta');
        let key = event.key;
        if (key === ' ') key = 'Space';
        if (key.length === 1) key = key.toUpperCase();
        parts.push(key);
        return parts.join('+');
    },

    // 导航/编辑键在没有 Ctrl/Alt/Meta 时不能作为快捷键（Shift+Tab 同样保留）
    isReserved(event) {
        const key = event.key === ' ' ? 'Space' : event.key;
        const hasCommandModifier = event.ctrlKey || event.altKey || event.metaKey;
        return RESERVED_KEYS.includes(key) && !hasCommandModifier;
    },

    // 全局按键处理：匹配动作并执行；录制态与输入态不处理
    handleKeydown(event) {
        if (this.recording) return;
        // 对话框惯例：Esc 始终关闭最上层弹窗，即使焦点在输入框内
        if (event.key === 'Escape' && closeTopmostModal()) {
            event.preventDefault();
            return;
        }
        const target = event.target;
        const isTyping = target && (
            target.matches('input, textarea, select') || target.isContentEditable
        );
        if (isTyping) return;

        const key = this.formatKey(event);
        for (const action of Object.keys(SHORTCUT_ACTIONS)) {
            if (this.getKey(action) === key) {
                event.preventDefault();
                this.dispatch(action);
                return;
            }
        }
    },

    // 执行动作
    dispatch(action) {
        switch (action) {
            case 'focusSearch': {
                const input = document.getElementById('search-input');
                if (input) input.focus();
                break;
            }
            case 'openSettings':
                openSettings();
                break;
            case 'toggleTheme':
                themeManager.toggleTheme();
                break;
            case 'closeModal':
                closeTopmostModal();
                break;
        }
    },

    // 渲染快捷键列表
    renderShortcutList() {
        const list = document.getElementById('shortcut-list');
        if (!list) return;
        this.cancelRecording();
        list.innerHTML = '';

        Object.keys(SHORTCUT_ACTIONS).forEach(action => {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'settings-row shortcut-row';
            row.dataset.action = action;
            row.setAttribute('aria-label', `修改快捷键：${SHORTCUT_ACTIONS[action].label}`);

            const name = document.createElement('span');
            name.className = 'settings-row-title';
            name.textContent = SHORTCUT_ACTIONS[action].label;

            const key = document.createElement('kbd');
            key.className = 'shortcut-key';
            key.textContent = this.displayKey(this.getKey(action));

            row.appendChild(name);
            row.appendChild(key);
            row.addEventListener('click', () => this.startRecording(action, row));
            list.appendChild(row);
        });
    },

    // 录制失败（冲突或保留键）：短暂显示原因后恢复
    flashRowMessage(row, keyEl, action, message) {
        row.classList.add('conflict');
        keyEl.textContent = message;
        setTimeout(() => {
            row.classList.remove('conflict');
            keyEl.textContent = this.displayKey(this.getKey(action));
        }, 2000);
    },

    // 开始录制新组合键
    startRecording(action, row) {
        if (this.recording) return;
        const keyEl = row.querySelector('.shortcut-key');
        row.classList.add('recording');
        keyEl.textContent = '按下新组合键';

        const handler = (event) => {
            event.preventDefault();
            event.stopPropagation();

            // Escape 取消录制（不绑定）
            if (event.key === 'Escape') {
                this.cancelRecording();
                return;
            }

            // 纯修饰键按下不结束录制（等待主键）
            if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
                return;
            }

            this.stopRecording();

            if (this.isReserved(event)) {
                this.flashRowMessage(row, keyEl, action, '导航键不能单独使用');
                return;
            }

            const key = this.formatKey(event);
            // 冲突检测：组合键已被其他动作占用
            const conflict = Object.keys(SHORTCUT_ACTIONS).find(a =>
                a !== action && this.getKey(a) === key
            );
            if (conflict) {
                this.flashRowMessage(row, keyEl, action, `已被“${SHORTCUT_ACTIONS[conflict].label}”使用`);
                return;
            }

            prefs.update({ shortcuts: { ...prefs.data.shortcuts, [action]: key } });
            keyEl.textContent = this.displayKey(key);
        };

        this.recording = { action, row, keyEl, handler };
        // 捕获阶段监听，先于焦点陷阱等其他按键处理
        document.addEventListener('keydown', handler, true);
    },

    // 结束录制（不改显示）
    stopRecording() {
        if (!this.recording) return;
        document.removeEventListener('keydown', this.recording.handler, true);
        this.recording.row.classList.remove('recording');
        this.recording = null;
    },

    // 取消录制并恢复原显示；关闭设置或切换分区时也会调用
    cancelRecording() {
        if (!this.recording) return;
        const { action, keyEl } = this.recording;
        this.stopRecording();
        keyEl.textContent = this.displayKey(this.getKey(action));
    },

    // 恢复默认：清空自定义
    resetShortcuts() {
        prefs.update({ shortcuts: {} });
        this.renderShortcutList();
        toast.show('已恢复默认快捷键');
    }
};

// 打开方式：默认当前标签页；开启后在新标签页打开
function setOpenInNewTab(value) {
    prefs.update({ openInNewTab: value === true });
}

function updateOpenBehaviorControl() {
    const toggle = document.getElementById('open-in-new-tab');
    if (toggle) {
        toggle.checked = prefs.data.openInNewTab;
    }
}

// 统一打开目的地：搜索提交与快捷链接点击共用
function openDestination(url) {
    if (prefs.data.openInNewTab) {
        window.open(url, '_blank');
    } else {
        window.location.href = url;
    }
}

// 显示时间和日期
function updateDateTime() {
    const now = new Date();

    // 更新时间：24 小时制补零，12 小时制带 AM/PM
    let hours = now.getHours();
    let period = '';
    const hourFormat = prefs.data.hourFormat;
    if (hourFormat === '12') {
        period = hours < 12 ? ' AM' : ' PM';
        hours = hours % 12 || 12;
    }
    const hoursText = hourFormat === '12' ? String(hours) : String(hours).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeEl = document.getElementById('time');
    // 仅在分钟或制式变化时重建 DOM，避免每秒重启冒号的呼吸动画
    const timeKey = `${hoursText}:${minutes}${period}`;
    if (timeEl.dataset.value !== timeKey) {
        timeEl.dataset.value = timeKey;
        const periodHtml = period ? `<span class="period">${period.trim()}</span>` : '';
        timeEl.innerHTML = `${hoursText}<span class="colon">:</span>${minutes}${periodHtml}`;
    }

    // 更新日期 - 中文短句，如 11月3日 星期二
    const weekday = now.toLocaleDateString('zh-CN', { weekday: 'long' });
    const dateText = `${now.getMonth() + 1}月${now.getDate()}日 ${weekday}`;
    const dateEl = document.getElementById('date');
    if (dateEl.textContent !== dateText) {
        dateEl.textContent = dateText;
    }
}

// 首帧：先用本地缓存的偏好渲染，再每秒更新时间
prefs.initFromCache();
updateDateTime();
setInterval(updateDateTime, 1000);

// 内置引擎图标（内嵌官方 SVG path，无网络请求；viewBox 统一 0 0 24 24）
const engineIcons = {
    google: '<path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.04-1.133 8.147-3.253 2.12-2.12 2.793-5.333 2.793-8.267 0-.8-.053-1.467-.173-2.133H12.48z" fill="currentColor"/>',
    bing: '<path d="M3.3 0v24l8.4-4.6V4.4zm9.5 5.6L18.6 9l-5.8 3.4v4.8l8.2-4.7V6.2z" fill="currentColor"/>',
    baidu: '<path d="M9.154 0C7.71 0 6.54 1.658 6.54 3.707c0 2.051 1.171 3.71 2.615 3.71 1.446 0 2.614-1.659 2.614-3.71C11.768 1.658 10.6 0 9.154 0zm7.025.594C14.86.58 13.347 2.589 13.2 3.927c-.187 1.745.25 3.487 2.179 3.735 1.933.25 3.175-1.806 3.422-3.364.252-1.555-.995-3.364-2.362-3.674a1.218 1.218 0 0 0-.261-.03zM3.582 5.535a2.811 2.811 0 0 0-.156.008c-2.118.19-2.428 3.24-2.428 3.24-.287 1.41.686 4.425 3.297 3.864 2.617-.561 2.262-3.68 2.183-4.362-.125-1.018-1.292-2.773-2.896-2.75zm16.534 1.753c-2.308 0-2.617 2.119-2.617 3.616 0 1.43.121 3.425 2.988 3.362 2.867-.063 2.553-3.238 2.553-3.988 0-.745-.62-2.99-2.924-2.99zm-8.264 2.478c-1.424.014-2.708.925-3.323 1.947-1.118 1.868-2.863 3.05-3.112 3.363-.25.309-3.61 2.116-2.864 5.42.746 3.301 3.365 3.237 3.365 3.237s1.93.19 4.171-.31c2.24-.495 4.17.123 4.17.123s5.233 1.748 6.665-1.616c1.43-3.364-.808-5.109-.808-5.109s-2.99-2.306-4.736-4.798c-1.072-1.665-2.348-2.268-3.528-2.257zm-2.234 3.84l1.542.024v8.197H7.758c-1.47-.291-2.055-1.292-2.13-1.462-.072-.173-.488-.976-.268-2.343.635-2.049 2.447-2.196 2.447-2.196h1.81zm3.964 2.39v3.881c.096.413.612.488.612.488h1.614v-4.343h1.689v5.782h-3.915c-1.517-.39-1.59-1.465-1.59-1.465v-4.317zm-5.458 1.147c-.66.197-.978.708-1.05.928-.076.22-.247.78-.1 1.269.294 1.095 1.248 1.144 1.248 1.144h1.37v-3.34z" fill="currentColor"/>',
    duckduckgo: '<path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm0 .984C18.083.984 23.016 5.916 23.016 12S18.084 23.016 12 23.016.984 18.084.984 12C.984 5.917 5.916.984 12 .984zm0 .938C6.434 1.922 1.922 6.434 1.922 12c0 4.437 2.867 8.205 6.85 9.55-.237-.82-.776-2.753-1.6-6.052-1.184-4.741-2.064-8.606 2.379-9.813.047-.011.064-.064.03-.093-.514-.467-1.382-.548-2.233-.38a.06.06 0 0 1-.07-.058c0-.011 0-.023.011-.035.205-.286.572-.507.822-.64a1.843 1.843 0 0 0-.607-.335c-.059-.022-.059-.12-.006-.144.006-.006.012-.012.024-.012 1.749-.233 3.586.292 4.49 1.448.011.011.023.017.035.023 2.968.635 3.509 4.837 3.328 5.998a9.607 9.607 0 0 0 2.346-.576c.746-.286 1.008-.222 1.101-.053.1.193-.018.513-.28.81-.496.567-1.393 1.01-2.974 1.137-.546.044-1.029.024-1.445.006-.789-.035-1.339-.059-1.633.39-.192.298-.041.998 1.487 1.22 1.09.157 2.078.047 2.798-.034.643-.07 1.073-.118 1.172.069.21.402-.996 1.207-3.066 1.224-.158 0-.315-.006-.467-.011-1.283-.065-2.227-.414-2.816-.735a.094.094 0 0 1-.035-.017c-.105-.059-.31.045-.188.267.07.134.444.478 1.004.776-.058.466.087 1.184.338 2l.088-.016c.041-.009.087-.019.134-.025.507-.082.775.012.926.175.717-.536 1.913-1.294 2.03-1.154.583.694.66 2.332.53 2.99-.004.012-.017.024-.04.035-.274.117-1.783-.296-1.783-.511-.059-1.075-.26-1.173-.493-1.225h-.156c.006.006.012.018.018.03l.052.12c.093.257.24 1.063.13 1.26-.112.199-.835.297-1.284.303-.443.006-.543-.158-.637-.408-.07-.204-.103-.675-.103-.95a.857.857 0 0 1 .012-.216c-.134.058-.333.193-.397.281-.017.262-.017.682.123 1.149.07.221-1.518 1.164-1.74.99-.227-.181-.634-1.952-.459-2.67-.187.017-.338.075-.42.191-.367.508.093 2.933.582 3.248.257.169 1.54-.553 2.176-1.095.105.145.305.158.553.158.326-.012.782-.06 1.103-.158.192.45.423.972.613 1.388 4.47-1.032 7.803-5.037 7.803-9.82 0-5.566-4.512-10.078-10.078-10.078zm1.791 5.646c-.42 0-.678.146-.795.332-.023.047.047.094.094.07.14-.075.357-.161.701-.156.328.006.516.09.67.159l.023.01c.041.017.088-.03.059-.065-.134-.18-.332-.35-.752-.35zm-5.078.198a1.24 1.24 0 0 0-.522.082c-.454.169-.67.526-.67.76 0 .051.112.057.141.011.081-.123.21-.31.617-.478.408-.17.73-.146.951-.094.047.012.083-.041.041-.07a.989.989 0 0 0-.558-.211zm5.434 1.423a.651.651 0 0 0-.655.647.652.652 0 0 0 1.307 0 .646.646 0 0 0-.652-.647zm.283.262h.008a.17.17 0 0 1 .17.17c0 .093-.077.17-.17.17a.17.17 0 0 1-.17-.17c0-.09.072-.165.162-.17zm-5.358.076a.752.752 0 0 0-.758.758c0 .42.338.758.758.758s.758-.337.758-.758a.756.756 0 0 0-.758-.758zm.328.303h.01c.112 0 .2.089.2.2 0 .11-.088.197-.2.197a.195.195 0 0 1-.197-.198c0-.107.082-.194.187-.199z" fill="currentColor"/>',
    ecosia: '<path d="M15.198 6.818H8.786v10.48h6.412v-3.342h-3.98v-1.262H13.8V11.42h-2.584v-1.261h3.981zM11.972.06A12.003 12.003 0 0 0 0 12.064a12.003 12.003 0 0 0 10.083 11.848c.068-1.277.196-2.723.434-3.652v-.014c0-.005 0-.007-.01-.012 0-.005-.01-.007-.012-.009 0-.002-.01-.002-.014-.002h-.356c-2.307 0-5.943-.333-6.916-3.45-1.458-4.642 2.025-6.314 3.484-4.97 0 .004.012.008.019.008.01 0 .014 0 .02-.005.01-.005.013-.009.015-.016v-.021c-.322-.945-2.148-6.867 2.64-8.496 4.08-1.369 8.07 1.491 7.461 5.265v.017c0 .007.01.012.012.014 0 .002.012.005.016.005 0 0 .012-.002.016-.005.298-.246 1.603-1.186 2.919-.148 1.247.982.844 3.73-1.627 5.003-.01.002-.014.007-.02.014v.023c0 .01.01.014.015.02.01.004.016.004.023.001 1.596-.239 4.316 1.193 2.11 4.375-1.447 2.1-4.71 2.365-6.168 2.365h-1.071s-.01 0-.012.002c0 .002-.01.005-.012.007 0 .002 0 .005-.01.009v.012c-.021.751.331 2.304.693 3.688A12.003 12.003 0 0 0 24 12.063 12.003 12.003 0 0 0 11.997.06a12.003 12.003 0 0 0-.03 0z" fill="currentColor"/>',
    brave: '<path d="M15.68 0l2.096 2.38s1.84-.512 2.709.358c.868.87 1.584 1.638 1.584 1.638l-.562 1.381.715 2.047s-2.104 7.98-2.35 8.955c-.486 1.919-.818 2.66-2.198 3.633-1.38.972-3.884 2.66-4.293 2.916-.409.256-.92.692-1.38.692-.46 0-.97-.436-1.38-.692a185.796 185.796 0 01-4.293-2.916c-1.38-.973-1.712-1.714-2.197-3.633-.247-.975-2.351-8.955-2.351-8.955l.715-2.047-.562-1.381s.716-.768 1.585-1.638c.868-.87 2.708-.358 2.708-.358L8.321 0h7.36zm-3.679 14.936c-.14 0-1.038.317-1.758.69-.72.373-1.242.637-1.409.742-.167.104-.065.301.087.409.152.107 2.194 1.69 2.393 1.866.198.175.489.464.687.464.198 0 .49-.29.688-.464.198-.175 2.24-1.759 2.392-1.866.152-.108.254-.305.087-.41-.167-.104-.689-.368-1.41-.741-.72-.373-1.617-.69-1.757-.69zm0-11.278s-.409.001-1.022.206-1.278.46-1.584.46c-.307 0-2.581-.434-2.581-.434S4.119 7.152 4.119 7.849c0 .697.339.881.68 1.243l2.02 2.149c.192.203.59.511.356 1.066-.235.555-.58 1.26-.196 1.977.384.716 1.042 1.194 1.464 1.115.421-.08 1.412-.598 1.776-.834.364-.237 1.518-1.19 1.518-1.554 0-.365-1.193-1.02-1.413-1.168-.22-.15-1.226-.725-1.247-.95-.02-.227-.012-.293.284-.851.297-.559.831-1.304.742-1.8-.089-.495-.95-.753-1.565-.986-.615-.232-1.799-.671-1.947-.74-.148-.068-.11-.133.339-.175.448-.043 1.719-.212 2.292-.052.573.16 1.552.403 1.632.532.079.13.149.134.067.579-.081.445-.5 2.581-.541 2.96-.04.38-.12.63.288.724.409.094 1.097.256 1.333.256s.924-.162 1.333-.256c.408-.093.329-.344.288-.723-.04-.38-.46-2.516-.541-2.961-.082-.445-.012-.45.067-.579.08-.129 1.059-.372 1.632-.532.573-.16 1.845.009 2.292.052.449.042.487.107.339.175-.148.069-1.332.508-1.947.74-.615.233-1.476.49-1.565.986-.09.496.445 1.241.742 1.8.297.558.304.624.284.85-.02.226-1.026.802-1.247.95-.22.15-1.413.804-1.413 1.169 0 .364 1.154 1.317 1.518 1.554.364.236 1.355.755 1.776.834.422.079 1.08-.4 1.464-1.115.384-.716.039-1.422-.195-1.977-.235-.555.163-.863.355-1.066l2.02-2.149c.341-.362.68-.546.68-1.243 0-.697-2.695-3.96-2.695-3.96s-2.274.436-2.58.436c-.307 0-.972-.256-1.585-.461-.613-.205-1.022-.206-1.022-.206z" fill="currentColor"/>',
    // Yandex 的 viewBox 从 -5.5 开始，用 translate 归一化到 0 0 24 24
    yandex: '<g transform="translate(5.5 0)"><path d="m5.2 24v-7.786l-5.2-13.964h2.616l3.834 10.767 4.41-13.018h2.405l-5.658 16.303v7.697z" fill="currentColor"/></g>'
};

// 内置搜索引擎（URL 统一使用 {q} 占位符）
const BUILTIN_ENGINES = [
    { id: 'google', label: 'Google', url: 'https://www.google.com/search?q={q}' },
    { id: 'bing', label: 'Bing', url: 'https://www.bing.com/search?q={q}' },
    { id: 'baidu', label: '百度', url: 'https://www.baidu.com/s?wd={q}' },
    { id: 'duckduckgo', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q={q}' },
    { id: 'ecosia', label: 'Ecosia', url: 'https://www.ecosia.org/search?q={q}' },
    { id: 'brave', label: 'Brave', url: 'https://search.brave.com/search?q={q}' },
    { id: 'yandex', label: 'Yandex', url: 'https://yandex.com/search/?text={q}' }
];

// 搜索引擎管理：内置 + 自定义，启用列表，当前引擎（含旧数据兼容）
const engineManager = {
    customEngines: [],          // [{ id, label, url }]
    enabledIds: ['google', 'bing'], // 启用顺序（内置在前，自定义按创建顺序）
    currentEngineId: 'google',

    // 当前生效的引擎列表（启用过滤）
    getEngines() {
        const all = [
            ...BUILTIN_ENGINES,
            ...this.customEngines.map(e => ({ ...e, custom: true }))
        ];
        return all.filter(e => this.enabledIds.includes(e.id));
    },

    getCurrentEngine() {
        return this.getEngines().find(e => e.id === this.currentEngineId) || this.getEngines()[0];
    },

    // 加载配置并迁移旧数据：
    // 新结构 customEngines + enabledEngines 两键，searchEngine 存 id；
    // 旧结构 searchEngines 单键（{custom, enabled}）与 URL 值自动迁移并清理。
    load(callback) {
        storage.get(['customEngines', 'enabledEngines', 'searchEngine', 'searchEngines'], (data) => {
            let migrated = false;

            // 自定义引擎：优先新键，回退旧单键
            this.customEngines = Array.isArray(data.customEngines)
                ? data.customEngines
                : (data.searchEngines && Array.isArray(data.searchEngines.custom)
                    ? data.searchEngines.custom
                    : []);
            if (!Array.isArray(data.customEngines) && data.searchEngines) {
                migrated = true;
            }

            const validIds = new Set([
                ...BUILTIN_ENGINES.map(e => e.id),
                ...this.customEngines.map(e => e.id)
            ]);

            // 启用列表：优先新键，回退旧单键，再回退默认
            let savedEnabled = Array.isArray(data.enabledEngines) && data.enabledEngines.length
                ? data.enabledEngines
                : (data.searchEngines && Array.isArray(data.searchEngines.enabled) &&
                    data.searchEngines.enabled.length
                    ? data.searchEngines.enabled
                    : ['google', 'bing']);
            if (!Array.isArray(data.enabledEngines) && data.searchEngines) {
                migrated = true;
            }
            this.enabledIds = savedEnabled.filter(id => validIds.has(id));
            if (!this.enabledIds.length) {
                this.enabledIds = ['google'];
            }

            // 当前引擎：searchEngine 存 id 或旧 URL（映射回 id）
            const savedEngine = data.searchEngine;
            if (typeof savedEngine === 'string' && savedEngine) {
                if (validIds.has(savedEngine)) {
                    this.currentEngineId = savedEngine;
                } else {
                    // 旧数据：URL → id
                    const normalized = savedEngine.replace('{q}', '');
                    const match = this.getEngines().find(e => e.url.replace('{q}', '') === normalized);
                    if (match) {
                        this.currentEngineId = match.id;
                        migrated = true;
                    }
                }
            }
            if (!this.getEngines().some(e => e.id === this.currentEngineId)) {
                this.currentEngineId = this.getEngines()[0].id;
            }

            // 有迁移时写回新结构并清理旧键
            if (migrated) {
                storage.set({
                    customEngines: this.customEngines,
                    enabledEngines: this.enabledIds,
                    searchEngine: this.currentEngineId
                }, (error) => {
                    if (!error) storage.remove('searchEngines');
                });
            }

            callback && callback();
        });
    },

    // 保存引擎配置（自定义引擎、启用列表、当前引擎）；失败时提示并按存储恢复
    save(callback) {
        storage.set({
            customEngines: this.customEngines,
            enabledEngines: this.enabledIds,
            searchEngine: this.currentEngineId
        }, (error) => {
            if (error) {
                toast.show(describeSaveError(error));
                this.load(() => {
                    updateEngineIcon();
                    renderEngineSettings();
                });
                return;
            }
            if (callback) callback();
        });
    },

    // 只保存当前引擎（searchEngine 键存引擎 id）
    saveCurrentEngine() {
        storage.set({ searchEngine: this.currentEngineId }, (error) => {
            if (error) toast.show(describeSaveError(error));
        });
    },

    // 用于判断外部修改是否改变了引擎配置
    snapshot() {
        return JSON.stringify([this.customEngines, this.enabledIds, this.currentEngineId]);
    },

    // 选择引擎
    setEngine(id) {
        if (!this.getEngines().some(e => e.id === id)) return;
        this.currentEngineId = id;
        updateEngineIcon(true);
        this.saveCurrentEngine();
    },

    // 循环切换到下一个启用引擎（≤2 个时使用）
    cycleEngine() {
        const engines = this.getEngines();
        if (engines.length < 2) return;
        const currentIndex = engines.findIndex(e => e.id === this.currentEngineId);
        const next = engines[(currentIndex + 1) % engines.length];
        this.currentEngineId = next.id;
        updateEngineIcon(true);
        this.saveCurrentEngine();
    },

    // 生成自定义引擎 id
    newCustomId() {
        return `custom-${Date.now().toString(36)}`;
    }
};

// 引擎菜单浮层（启用 3 个及以上引擎时使用）
const engineMenu = {
    element: null,

    init() {
        this.element = document.createElement('div');
        this.element.className = 'engine-menu';
        this.element.setAttribute('role', 'menu');
        this.element.setAttribute('aria-label', '选择搜索引擎');
        document.body.appendChild(this.element);

        document.addEventListener('click', (e) => {
            if (this.isOpen() &&
                !this.element.contains(e.target) &&
                !document.getElementById('engine-selector').contains(e.target)) {
                this.close();
            }
        });
        // 菜单内按键：方向键移动、Home/End 跳转、Esc 关闭并回到按钮、Tab 关闭
        this.element.addEventListener('keydown', (e) => {
            const items = Array.from(this.element.querySelectorAll('.engine-menu-item'));
            const index = items.indexOf(document.activeElement);
            let next = null;
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                next = (index + 1) % items.length;
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                next = (index - 1 + items.length) % items.length;
            } else if (e.key === 'Home') {
                next = 0;
            } else if (e.key === 'End') {
                next = items.length - 1;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                this.close(document.getElementById('engine-selector'));
                return;
            } else if (e.key === 'Tab') {
                this.close();
                return;
            }
            if (next !== null) {
                e.preventDefault();
                items[next].focus();
            }
        });
        window.addEventListener('resize', () => this.close());
    },

    isOpen() {
        return !!this.element && this.element.classList.contains('open');
    },

    render() {
        const engines = engineManager.getEngines();
        this.element.innerHTML = '';
        engines.forEach(engine => {
            const checked = engine.id === engineManager.currentEngineId;
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'engine-menu-item' + (checked ? ' active' : '');
            item.setAttribute('role', 'menuitemradio');
            item.setAttribute('aria-checked', String(checked));
            item.tabIndex = -1;
            item.appendChild(this.buildIcon(engine));
            const name = document.createElement('span');
            name.textContent = engine.label;
            item.appendChild(name);
            item.addEventListener('click', () => {
                engineManager.setEngine(engine.id);
                // 选完引擎通常紧接着输入搜索词
                this.close(document.getElementById('search-input'));
            });
            this.element.appendChild(item);
        });
    },

    // 引擎图标：内置用内嵌 SVG 标记，自定义用首字母圆角块
    buildIcon(engine) {
        const iconMarkup = engineIcons[engine.id];
        if (iconMarkup) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('aria-hidden', 'true');
            svg.innerHTML = iconMarkup;
            return svg;
        }
        const letter = document.createElement('span');
        letter.className = 'engine-letter';
        letter.setAttribute('aria-hidden', 'true');
        letter.textContent = (engine.label || '?').charAt(0).toUpperCase();
        return letter;
    },

    // 在引擎按钮下方打开菜单，焦点放在当前引擎上
    open() {
        this.render();
        const selector = document.getElementById('engine-selector');
        const rect = selector.getBoundingClientRect();
        this.element.classList.add('open');
        this.element.style.left = `${rect.left}px`;
        this.element.style.top = `${rect.bottom + 6}px`;
        selector.setAttribute('aria-expanded', 'true');
        const current = this.element.querySelector('[aria-checked="true"]') ||
            this.element.querySelector('.engine-menu-item');
        if (current) current.focus();
    },

    // 关闭菜单；returnFocus 指定关闭后聚焦的元素
    close(returnFocus) {
        if (!this.isOpen()) return;
        this.element.classList.remove('open');
        document.getElementById('engine-selector').setAttribute('aria-expanded', 'false');
        if (returnFocus) returnFocus.focus();
    },

    toggle() {
        if (this.isOpen()) {
            this.close();
        } else {
            this.open();
        }
    }
};

// 更新搜索引擎图标与可读文本（title / aria-label）；animate 时播放切换微动画
function updateEngineIcon(animate) {
    const engine = engineManager.getCurrentEngine();
    const engineIcon = document.getElementById('engine-icon');
    const engineLetter = document.getElementById('engine-letter');
    const iconMarkup = engineIcons[engine.id];

    if (iconMarkup) {
        // 内置引擎：内嵌 SVG 标记
        engineLetter.style.display = 'none';
        engineIcon.style.display = '';
        engineIcon.innerHTML = iconMarkup;
    } else {
        // 自定义引擎：首字母圆角块
        engineIcon.style.display = 'none';
        engineLetter.style.display = '';
        engineLetter.textContent = (engine.label || '?').charAt(0).toUpperCase();
    }

    const engineSelector = document.getElementById('engine-selector');
    if (engineSelector) {
        const usesMenu = engineManager.getEngines().length > 2;
        const label = `${usesMenu ? '选择' : '切换'}搜索引擎，当前为 ${engine.label}`;
        engineSelector.setAttribute('aria-label', label);
        engineSelector.title = label;
        if (usesMenu) {
            engineSelector.setAttribute('aria-haspopup', 'menu');
            engineSelector.setAttribute('aria-expanded', String(engineMenu.isOpen()));
        } else {
            engineSelector.removeAttribute('aria-haspopup');
            engineSelector.removeAttribute('aria-expanded');
        }
    }

    if (animate) {
        const visibleIcon = engineIcon.style.display !== 'none' ? engineIcon : engineLetter;
        visibleIcon.classList.remove('engine-icon-flash');
        void visibleIcon.offsetWidth; // 重启动画
        visibleIcon.classList.add('engine-icon-flash');
    }
}

// 引擎按钮点击：≤2 个启用引擎时循环切换，3+ 个时弹出菜单
function handleEngineClick() {
    const engines = engineManager.getEngines();
    if (engines.length <= 2) {
        engineMenu.close();
        engineManager.cycleEngine();
    } else {
        engineMenu.toggle();
    }
}

// 处理搜索功能：表单提交覆盖回车键与搜索按钮两种提交方式
document.getElementById('search-form').addEventListener('submit', function (e) {
    e.preventDefault();
    performSearch();
});

// 设置页控件：时间格式 / 打开方式 / 显示模式
document.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'hour-format') {
        setHourFormat(e.target.value);
    } else if (e.target && e.target.id === 'open-in-new-tab') {
        setOpenInNewTab(e.target.checked);
    } else if (e.target && e.target.name === 'theme-mode') {
        themeManager.setTheme(e.target.value);
    }
});

function performSearch() {
    const searchInput = document.getElementById('search-input');
    const currentEngine = engineManager.getCurrentEngine();

    if (searchInput.value.trim() !== '') {
        const searchUrl = currentEngine.url.replace('{q}', encodeURIComponent(searchInput.value.trim()));
        openDestination(searchUrl);
    }
}

// 搜索框聚焦时，启动器淡出让搜索独处；失焦回位
function setupSearchFocusBlur() {
    const searchInput = document.getElementById('search-input');
    const container = document.querySelector('.container');

    if (searchInput && container) {
        searchInput.addEventListener('focus', function () {
            container.classList.add('search-focused');
        });

        searchInput.addEventListener('blur', function () {
            container.classList.remove('search-focused');
        });
    }
}

// 快速链接管理
const defaultLinks = [
    { name: '微博', url: 'https://weibo.com' },
    { name: '知乎', url: 'https://zhihu.com' },
    { name: '哔哩哔哩', url: 'https://bilibili.com' }
];

const SITE_COLOR_RULES = [
    { domain: 'mail.google.com', color: '#ea4335' },
    { domain: 'google.com', color: '#4285f4' },
    { domain: 'weibo.com', color: '#e6162d' },
    { domain: 'zhihu.com', color: '#056de8' },
    { domain: 'bilibili.com', color: '#00aeec' },
    { domain: 'douyin.com', color: '#fe2c55' },
    { domain: 'tiktok.com', color: '#25f4ee' },
    { domain: 'github.com', color: '#7d8590' },
    { domain: 'chatgpt.com', color: '#10a37f' },
    { domain: 'openai.com', color: '#10a37f' },
    { domain: 'youtube.com', color: '#ff0033' },
    { domain: 'reddit.com', color: '#ff4500' },
    { domain: 'x.com', color: '#1d9bf0' },
    { domain: 'twitter.com', color: '#1d9bf0' },
    { domain: 'discord.com', color: '#5865f2' },
    { domain: 'figma.com', color: '#f24e1e' },
    { domain: 'notion.so', color: '#6f767d' },
    { domain: 'stackoverflow.com', color: '#f48024' }
];

const FALLBACK_SITE_COLORS = [
    '#4f7cff',
    '#db4564',
    '#16a085',
    '#d9822b',
    '#8b5cf6',
    '#0f9fbf',
    '#b65c24',
    '#d23f9a'
];

// 已知站点使用品牌色，未知站点按域名生成稳定的识别色。
function getSiteColor(linkUrl) {
    try {
        const hostname = new URL(linkUrl).hostname.replace(/^www\./, '').toLowerCase();
        const matchedRule = SITE_COLOR_RULES.find(rule =>
            hostname === rule.domain || hostname.endsWith(`.${rule.domain}`)
        );

        if (matchedRule) {
            return matchedRule.color;
        }

        let hash = 0;
        for (const character of hostname) {
            hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
        }
        return FALLBACK_SITE_COLORS[hash % FALLBACK_SITE_COLORS.length];
    } catch (e) {
        return '#6f767d';
    }
}

// 规范化用户输入的网址：补全协议，只接受 http / https；无效时返回 null。
// allowPlaceholder：搜索引擎模板中的 {q} 先替换成示例词再校验
function normalizeHttpUrl(input, allowPlaceholder) {
    let value = String(input || '').trim();
    if (!value || /\s/.test(value.replace(/\{q\}/g, ''))) return null;
    // "localhost:3000" 这类"主机:端口"不算协议；带 :// 或常见非网页协议才算
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ||
        /^(javascript|data|vbscript|file|blob|about|chrome|mailto|tel):/i.test(value);
    if (!hasScheme) {
        value = 'https://' + value;
    }
    try {
        const parsed = new URL(allowPlaceholder ? value.replace(/\{q\}/g, 'test') : value);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        if (!isValidHostname(parsed.hostname, hasScheme)) return null;
        return value;
    } catch (e) {
        return null;
    }
}

// 主机名校验（浏览器的 URL 解析很宽松，会把空格等编码进主机名）。
// 未写协议时要求像域名（含点）或是 localhost / IP；显式写了 http(s):// 时允许内网单名主机
function isValidHostname(host, explicitScheme) {
    if (!host) return false;
    if (host === 'localhost' || /^\[[0-9a-f:.]+\]$/i.test(host) || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
        return true;
    }
    const labels = host.split('.');
    const labelsOk = labels.every(label => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
    return labelsOk && (explicitScheme || labels.length >= 2);
}

// 链接只保存名称与网址（旧版本的图标字段在加载时清理，节省同步空间）
function normalizeLink(link) {
    return { name: String(link.name).trim(), url: String(link.url).trim() };
}

// 校验并规范化链接数组；不是合法数组时返回 null
function sanitizeLinks(value) {
    if (!Array.isArray(value)) return null;
    return value
        .filter(link => link && typeof link.name === 'string' && typeof link.url === 'string' &&
            link.name.trim() && link.url.trim())
        .map(normalizeLink);
}

// 链接身份：名称 + 网址（不依赖位置，避免列表变化后操作到错误的条目）
function linkKey(link) {
    return `${link.url}\n${link.name}`;
}

// 在最新列表中定位条目：优先原位置，位置不符时按身份查找
function findLinkIndex(links, index, key) {
    if (links[index] && linkKey(links[index]) === key) return index;
    return links.findIndex(link => linkKey(link) === key);
}

// 当前渲染中的链接（用于判断外部修改是否需要重渲染）
let currentLinks = [];

// 从存储中加载链接或使用默认链接；清理旧版图标字段
function loadLinks() {
    storage.get('quickLinks', function (data) {
        const stored = data.quickLinks;
        const links = sanitizeLinks(stored) || defaultLinks.slice();
        renderLinks(links);
        if (Array.isArray(stored) && JSON.stringify(stored) !== JSON.stringify(links)) {
            saveLinks(links);
        }
    });
}

// 保存链接；失败时提示原因，并按存储中的实际数据重新渲染
function saveLinks(links, callback) {
    storage.set({ quickLinks: links }, function (error) {
        if (error) {
            toast.show(describeSaveError(error));
            storage.get('quickLinks', function (data) {
                renderLinks(sanitizeLinks(data.quickLinks) || defaultLinks.slice());
            });
        } else {
            renderLinks(links);
        }
        if (callback) callback(error);
    });
}

// 串行修改链接：每次都基于存储中的最新列表，前一次写完再开始下一次，
// 避免连续快速操作时互相覆盖。mutator 返回 false 表示放弃本次修改。
let linksQueue = Promise.resolve();

function mutateLinks(mutator, onSaved) {
    linksQueue = linksQueue.then(() => new Promise(resolve => {
        storage.get('quickLinks', function (data) {
            const links = sanitizeLinks(data.quickLinks) || defaultLinks.slice();
            const result = mutator(links);
            if (result === false) {
                renderLinks(links);
                resolve();
                return;
            }
            saveLinks(links, function (error) {
                if (!error && onSaved) onSaved(result);
                resolve();
            });
        });
    }));
}

// 渲染链接到页面：每个条目是一个包装元素，内含链接与独立的删除按钮
// （不把按钮嵌在链接里，读屏与键盘各自独立）
function renderLinks(links) {
    currentLinks = links.slice();
    const quickLinksContainer = document.getElementById('quick-links');
    const addButton = document.getElementById('add-link-button');

    // 删除后焦点落到同位置的条目（或"添加"按钮）上，不丢失
    const focusedItem = document.activeElement && document.activeElement.closest('.quick-link-item');
    const focusIndex = focusedItem ? parseInt(focusedItem.dataset.index, 10) : null;

    // 记录旧条目 key，新增条目播放入场动画；首次渲染跳过
    const oldKeys = new Set(
        Array.from(quickLinksContainer.querySelectorAll('.quick-link-item'))
            .map(el => el.dataset.key)
    );
    const hadItems = oldKeys.size > 0;

    quickLinksContainer.innerHTML = '';

    links.forEach((link, index) => {
        const key = linkKey(link);
        const item = document.createElement('div');
        item.className = 'quick-link-item';
        item.draggable = true;
        item.dataset.index = index;
        item.dataset.key = key;
        if (hadItems && !oldKeys.has(key)) {
            item.classList.add('entry-in');
        }

        const linkElement = document.createElement('a');
        linkElement.className = 'quick-link';
        linkElement.href = link.url;
        linkElement.title = link.url;
        // 拖拽由外层条目负责，链接本身不作为拖拽源
        linkElement.draggable = false;

        const siteDot = document.createElement('span');
        siteDot.className = 'quick-link-dot';
        siteDot.setAttribute('aria-hidden', 'true');
        siteDot.style.setProperty('--c-site-color', getSiteColor(link.url));

        const nameElement = document.createElement('span');
        nameElement.className = 'quick-link-name';
        nameElement.textContent = link.name;

        linkElement.appendChild(siteDot);
        linkElement.appendChild(nameElement);

        // 尊重打开方式设置；修饰键点击保留浏览器原生行为（新标签页、新窗口）
        linkElement.addEventListener('click', function (e) {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
                return;
            }
            e.preventDefault();
            openDestination(link.url);
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'delete-link';
        deleteButton.setAttribute('aria-label', `删除 ${link.name}`);
        deleteButton.innerHTML = DELETE_ICON_SVG;
        deleteButton.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            deleteLink(index, key);
        });

        item.appendChild(linkElement);
        item.appendChild(deleteButton);
        quickLinksContainer.appendChild(item);
    });

    quickLinksContainer.appendChild(addButton);
    setupDragAndDrop();

    if (focusIndex !== null && !document.activeElement.closest('.quick-link-item')) {
        const items = quickLinksContainer.querySelectorAll('.quick-link-item .quick-link');
        const target = items[Math.min(focusIndex, items.length - 1)] || addButton;
        target.focus();
    }

    // 同步设置页的链接列表
    renderSettingsLinks(links);
}

// 设置页链接列表的行内图标
const EDIT_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 20H8L19 9L15 5L4 16V20Z"></path><path d="M13.5 6.5L17.5 10.5"></path></svg>';
const DELETE_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 7H20M9 7V4H15V7M6.5 7L7.5 20H16.5L17.5 7M10 11V16M14 11V16"></path></svg>';

const DRAG_HANDLE_SVG = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<circle cx="6" cy="4" r="1.2"/><circle cx="10" cy="4" r="1.2"/><circle cx="6" cy="8" r="1.2"/>' +
    '<circle cx="10" cy="8" r="1.2"/><circle cx="6" cy="12" r="1.2"/><circle cx="10" cy="12" r="1.2"/></svg>';

// 渲染设置页的快捷链接列表（与启动器同存储，双向同步）
function renderSettingsLinks(links) {
    const list = document.getElementById('settings-link-list');
    if (!list) return;

    // 无参调用时从存储加载
    if (!links) {
        storage.get('quickLinks', function (data) {
            renderSettingsLinks(sanitizeLinks(data.quickLinks) || defaultLinks.slice());
        });
        return;
    }

    // 同步设置导航的链接数量徽标
    updateLinksBadge(links.length);

    // 记录旧条目 key，新增条目播放入场动画；首次渲染跳过
    const oldKeys = new Set(
        Array.from(list.querySelectorAll('.settings-link-row[data-index]'))
            .map(el => el.dataset.key)
            .filter(Boolean)
    );
    const hadItems = oldKeys.size > 0;

    list.innerHTML = '';

    if (!links.length) {
        const empty = document.createElement('p');
        empty.className = 'settings-link-empty';
        empty.textContent = '还没有快捷链接。点击“添加链接”把常用网站放到搜索框下方。';
        list.appendChild(empty);
        setupSettingsListDrag();
        return;
    }

    links.forEach((link, index) => {
        const key = linkKey(link);
        const row = document.createElement('div');
        row.className = 'settings-row settings-link-row';
        row.draggable = true;
        row.dataset.index = index;
        row.dataset.key = key;
        if (hadItems && !oldKeys.has(row.dataset.key)) {
            row.classList.add('entry-in');
        }
        row.title = link.url;

        const dot = document.createElement('span');
        dot.className = 'settings-link-dot';
        dot.setAttribute('aria-hidden', 'true');
        dot.style.setProperty('--c-site-color', getSiteColor(link.url));

        // 排序手柄：鼠标拖动整行；键盘聚焦后用方向键 / Home / End 调整位置
        const handle = document.createElement('button');
        handle.type = 'button';
        handle.className = 'drag-handle';
        handle.setAttribute('aria-label', `调整“${link.name}”的顺序，当前第 ${index + 1} 个，共 ${links.length} 个`);
        handle.setAttribute('aria-describedby', 'link-reorder-hint');
        handle.innerHTML = DRAG_HANDLE_SVG;
        // 点击手柄不打开编辑弹窗
        handle.addEventListener('click', function (e) {
            e.stopPropagation();
        });
        handle.addEventListener('keydown', function (e) {
            const moves = { ArrowUp: -1, ArrowDown: 1, Home: 'start', End: 'end' };
            if (!(e.key in moves)) return;
            e.preventDefault();
            moveLink(index, key, moves[e.key]);
        });

        const text = document.createElement('span');
        text.className = 'settings-row-text';
        const name = document.createElement('span');
        name.className = 'settings-row-title';
        name.textContent = link.name;
        const url = document.createElement('span');
        url.className = 'settings-row-desc';
        try {
            url.textContent = new URL(link.url).hostname;
        } catch (e) {
            url.textContent = link.url;
        }
        text.appendChild(name);
        text.appendChild(url);

        const actions = document.createElement('span');
        actions.className = 'settings-link-actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'settings-link-action edit';
        editButton.setAttribute('aria-label', `编辑 ${link.name}`);
        editButton.innerHTML = EDIT_ICON_SVG;
        editButton.addEventListener('click', function (e) {
            e.stopPropagation();
            openLinkEditor('edit', index, key);
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'settings-link-action delete';
        deleteButton.setAttribute('aria-label', `删除 ${link.name}`);
        deleteButton.innerHTML = DELETE_ICON_SVG;
        deleteButton.addEventListener('click', function (e) {
            e.stopPropagation();
            deleteLink(index, key);
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        row.appendChild(handle);
        row.appendChild(dot);
        row.appendChild(text);
        row.appendChild(actions);

        // 点击行主体打开编辑弹窗
        row.addEventListener('click', function () {
            openLinkEditor('edit', index, key);
        });

        list.appendChild(row);
    });

    setupSettingsListDrag();

    // 键盘排序后，焦点回到被移动条目的手柄上
    if (pendingHandleFocusKey !== null) {
        const moved = list.querySelector(`.settings-link-row[data-key="${CSS.escape(pendingHandleFocusKey)}"] .drag-handle`);
        pendingHandleFocusKey = null;
        if (moved) moved.focus();
    }
}

// 键盘排序：重渲染后需要聚焦的条目
let pendingHandleFocusKey = null;

// 用键盘移动链接：step 为 -1 / 1（上移 / 下移）或 'start' / 'end'（移到最前 / 最后）。
// 目标位置在最新列表中按条目当前位置计算，连续快速按键也能逐格移动
function moveLink(index, key, step) {
    mutateLinks(function (links) {
        const from = findLinkIndex(links, index, key);
        if (from === -1) return false;
        // 无论是否移动，列表都会重渲染；焦点都要回到这个手柄
        pendingHandleFocusKey = key;
        let to = step === 'start' ? 0 : step === 'end' ? links.length - 1 : from + step;
        to = Math.max(0, Math.min(to, links.length - 1));
        if (to === from) {
            announce(from === 0 ? '已在第一个' : '已在最后一个');
            return false;
        }
        const moved = links.splice(from, 1)[0];
        links.splice(to, 0, moved);
        return { name: moved.name, position: to + 1, total: links.length };
    }, function (result) {
        announce(`“${result.name}”已移到第 ${result.position} 个，共 ${result.total} 个`);
    });
}

// 通用插入式拖拽：容器内的 [data-index] 子项可拖拽，拖拽时在目标空隙显示
// 插入指示线，松手后回调 onDrop(fromIndex, toIndex)。容器清空重渲染后
// 调用返回对象的 refresh() 重新挂载指示线。
// direction: 'horizontal'（横向排列，竖线，如启动器）| 'vertical'（纵向
// 排列，横线，如设置页链接列表）。
function createInsertionDrag(container, onDrop, direction) {
    const isVertical = direction === 'vertical';
    const indicator = document.createElement('div');
    indicator.className = 'drag-indicator' + (isVertical ? ' drag-indicator-vertical' : '');
    indicator.style.display = 'none';
    container.appendChild(indicator);

    let draggedElement = null;
    let draggedIndex = null;

    // 到子项边缘的最近距离：横向比较左/右边缘，纵向比较上/下边缘；
    // 鼠标在子项另一轴越界时按角点距离计算（多行/多列布局下仍正确）。
    function edgeDistance(clientX, clientY, edgePos, start, end) {
        if (isVertical) {
            const dy = clientY - edgePos;
            if (clientX < start) return Math.hypot(dy, clientX - start);
            if (clientX > end) return Math.hypot(dy, clientX - end);
            return Math.abs(dy);
        }
        const dx = clientX - edgePos;
        if (clientY < start) return Math.hypot(dx, clientY - start);
        if (clientY > end) return Math.hypot(dx, clientY - end);
        return Math.abs(dx);
    }

    // 计算插入位置：返回 0..items.length（items.length 表示末尾）
    function getInsertIndex(clientX, clientY) {
        const items = Array.from(container.querySelectorAll('[data-index]'));
        if (!items.length) return 0;

        let bestDistance = Infinity;
        let bestIndex = 0;
        items.forEach((item, index) => {
            const rect = item.getBoundingClientRect();
            const firstDistance = edgeDistance(clientX, clientY,
                isVertical ? rect.top : rect.left,
                isVertical ? rect.left : rect.top,
                isVertical ? rect.right : rect.bottom);
            const lastDistance = edgeDistance(clientX, clientY,
                isVertical ? rect.bottom : rect.right,
                isVertical ? rect.left : rect.top,
                isVertical ? rect.right : rect.bottom);
            if (firstDistance < bestDistance) {
                bestDistance = firstDistance;
                bestIndex = index;
            }
            if (lastDistance < bestDistance) {
                bestDistance = lastDistance;
                bestIndex = index + 1;
            }
        });
        return bestIndex;
    }

    // 在插入位置显示指示线：横向为行间竖线，纵向为两行之间的横线
    function showIndicator(insertIndex) {
        const items = Array.from(container.querySelectorAll('[data-index]'));
        if (!items.length) return;

        const edgeItem = insertIndex >= items.length ? items[items.length - 1] : items[insertIndex];
        const edgeRect = edgeItem.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (isVertical) {
            // 横线：插到第 insertIndex 行的上边缘（末尾为最后一行下边缘）
            const y = insertIndex >= items.length ? edgeRect.bottom : edgeRect.top;
            indicator.style.left = '0px';
            indicator.style.width = `${containerRect.width}px`;
            indicator.style.top = `${y - containerRect.top - 1}px`;
            indicator.style.height = '2px';
        } else {
            // 竖线：位于目标行的左/右边缘
            const x = insertIndex >= items.length ? edgeRect.right : edgeRect.left;
            indicator.style.top = `${edgeRect.top - containerRect.top}px`;
            indicator.style.height = `${edgeRect.height}px`;
            indicator.style.left = `${x - containerRect.left - 1}px`;
            indicator.style.width = '2px';
        }
        indicator.style.display = 'block';
    }

    container.addEventListener('dragstart', function (e) {
        const item = e.target.closest('[data-index]');
        if (!item) return;
        draggedElement = item;
        draggedIndex = parseInt(item.dataset.index);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', item.outerHTML);
    });

    container.addEventListener('dragover', function (e) {
        if (draggedElement === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        showIndicator(getInsertIndex(e.clientX, e.clientY));
    });

    container.addEventListener('dragleave', function (e) {
        if (!container.contains(e.relatedTarget)) {
            indicator.style.display = 'none';
        }
    });

    container.addEventListener('drop', function (e) {
        if (draggedElement === null) return;
        e.preventDefault();
        const insertIndex = getInsertIndex(e.clientX, e.clientY);
        onDrop(draggedIndex, insertIndex, draggedElement.dataset.key);
        indicator.style.display = 'none';
    });

    container.addEventListener('dragend', function () {
        indicator.style.display = 'none';
        if (draggedElement) {
            draggedElement.classList.remove('dragging');
        }
        draggedElement = null;
        draggedIndex = null;
    });

    return {
        refresh() {
            if (!indicator.isConnected) {
                container.appendChild(indicator);
            }
        }
    };
}

// 启动器拖拽（插入语义，存储层复用 insertLink）
let launcherDrag = null;

function setupDragAndDrop() {
    if (launcherDrag) {
        launcherDrag.refresh();
        return;
    }
    launcherDrag = createInsertionDrag(document.getElementById('quick-links'), insertLink);
}

// 设置页快捷链接列表拖拽（纵向布局，横线指示，与启动器同一存储层）
let settingsListDrag = null;

function setupSettingsListDrag() {
    if (settingsListDrag) {
        settingsListDrag.refresh();
        return;
    }
    settingsListDrag = createInsertionDrag(document.getElementById('settings-link-list'), insertLink, 'vertical');
}

// 插入链接：把 fromIndex 的链接移动到 toIndex（后续条目依次后移）
function insertLink(fromIndex, toIndex, key) {
    mutateLinks(function (links) {
        const from = findLinkIndex(links, fromIndex, key);
        if (from === -1) return false;
        const moved = links.splice(from, 1)[0];
        // 移除后目标位置前移一位
        const target = Math.max(0, Math.min(from < toIndex ? toIndex - 1 : toIndex, links.length));
        links.splice(target, 0, moved);
    });
}

// 删除链接：条目先播退出动画，再在最新列表中按身份删除；提示中可撤销
function deleteLink(index, key) {
    const selector = `[data-key="${CSS.escape(key)}"]`;
    const targets = Array.from(document.querySelectorAll(
        `#quick-links .quick-link-item${selector}, #settings-link-list .settings-link-row${selector}`
    ));

    let executed = false;
    const doDelete = function () {
        if (executed) return;
        executed = true;
        mutateLinks(function (links) {
            const at = findLinkIndex(links, index, key);
            if (at === -1) return false;
            return { link: links.splice(at, 1)[0], at };
        }, function (removed) {
            toast.show(`已删除“${removed.link.name}”`, {
                // 撤销只放回这一条，不覆盖之后的其他修改
                onAction: () => mutateLinks(function (links) {
                    links.splice(Math.min(removed.at, links.length), 0, removed.link);
                })
            });
        });
    };

    if (!targets.length) {
        doDelete();
        return;
    }

    let remaining = targets.length;
    targets.forEach(el => {
        el.classList.add('leaving');
        el.addEventListener('animationend', function handler(e) {
            if (e.animationName !== 'leave-out') return;
            el.removeEventListener('animationend', handler);
            remaining -= 1;
            if (remaining === 0) {
                doDelete();
            }
        });
    });
    // 兜底：动画事件异常时仍完成删除
    setTimeout(doDelete, 350);
}

// 表单字段错误：显示在字段下方，并标记 aria-invalid；message 为空时清除
function setFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(`${inputId}-error`);
    if (!input || !errorEl) return;
    errorEl.textContent = message || '';
    errorEl.hidden = !message;
    if (message) {
        input.setAttribute('aria-invalid', 'true');
    } else {
        input.removeAttribute('aria-invalid');
    }
}

function clearFieldErrors(form) {
    form.querySelectorAll('.field-error').forEach(el => {
        setFieldError(el.id.replace(/-error$/, ''), '');
    });
}

// 保存链接（新增或编辑）：名称必填，网址须为有效的 http(s) 地址
function handleSaveLink() {
    const nameInput = document.getElementById('link-name');
    const urlInput = document.getElementById('link-url');
    const linkName = nameInput.value.trim();
    const linkUrl = normalizeHttpUrl(urlInput.value);

    clearFieldErrors(modal);
    if (!linkName) {
        setFieldError('link-name', '请填写名称');
        nameInput.focus();
        return;
    }
    if (!linkUrl) {
        setFieldError('link-url', urlInput.value.trim()
            ? '请输入有效的网址，例如 https://example.com'
            : '请填写网址');
        urlInput.focus();
        return;
    }

    const isEdit = modal.dataset.mode === 'edit';
    const editingIndex = parseInt(modal.dataset.editingIndex, 10);
    const editingKey = modal.dataset.editingKey;
    const next = { name: linkName, url: linkUrl };

    mutateLinks(function (links) {
        if (isEdit) {
            const at = findLinkIndex(links, editingIndex, editingKey);
            if (at === -1) {
                toast.show('这个链接已在其他地方被修改或删除，没有保存');
                return false;
            }
            links[at] = next;
        } else {
            links.push(next);
        }
    }, function () {
        closeModal();
    });
}

// 打开链接编辑弹窗：mode = 'add' 新增 / 'edit' 编辑（按身份定位最新数据）
function openLinkEditor(mode, index, key) {
    const nameInput = document.getElementById('link-name');
    const urlInput = document.getElementById('link-url');
    clearFieldErrors(modal);

    if (mode === 'edit') {
        storage.get('quickLinks', function (data) {
            const links = sanitizeLinks(data.quickLinks) || defaultLinks.slice();
            const at = findLinkIndex(links, index, key);
            if (at === -1) return;
            modal.dataset.mode = 'edit';
            modal.dataset.editingIndex = at;
            modal.dataset.editingKey = key;
            document.getElementById('link-modal-title').textContent = '编辑快捷链接';
            nameInput.value = links[at].name;
            urlInput.value = links[at].url;
            openModal(modal, nameInput);
        });
        return;
    }

    modal.dataset.mode = 'add';
    delete modal.dataset.editingIndex;
    delete modal.dataset.editingKey;
    document.getElementById('link-modal-title').textContent = '添加快捷链接';
    nameInput.value = '';
    urlInput.value = '';
    openModal(modal, nameInput);
}

// 添加链接模态框
const modal = document.getElementById('add-link-modal');
modal.dataset.mode = 'add';
const addLinkButton = document.getElementById('add-link-button');
const closeButton = modal.querySelector('.close-btn');
const cancelButton = document.getElementById('cancel-link');

// 打开模态框（新增模式）
addLinkButton.addEventListener('click', function () {
    openLinkEditor('add');
});

// 打开中的弹窗栈：后打开的在上层（如设置内再打开"编辑链接"）
const openModalStack = [];
const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]):not([type="file"]), ' +
    'textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// 弹窗内可经 Tab 到达的元素（排除 tabindex=-1，如单选组与导航中未选中的项）
function getFocusableElements(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter(el => el.tabIndex >= 0 && !el.closest('[hidden]') && el.getClientRects().length > 0);
}

// 打开弹窗：清理关闭动画残留，记住触发元素，焦点移入弹窗
// initialFocus：可选，打开后优先聚焦的元素
function openModal(modalElement, initialFocus) {
    modalElement.classList.remove('closing');
    modalElement.style.display = 'block';
    if (!openModalStack.includes(modalElement)) {
        modalElement.returnFocus = document.activeElement;
        openModalStack.push(modalElement);
    }
    const target = initialFocus || getFocusableElements(modalElement)[0];
    if (target) target.focus();
}

// 通用弹窗关闭：播放关闭动画，动画结束后再隐藏，并把焦点还给触发元素
function animateModalClose(modalElement, afterClose) {
    const stackIndex = openModalStack.indexOf(modalElement);
    if (stackIndex !== -1) openModalStack.splice(stackIndex, 1);
    const returnFocus = modalElement.returnFocus;
    modalElement.returnFocus = null;

    modalElement.classList.add('closing');
    modalElement.addEventListener('animationend', function handler(e) {
        if (e.animationName !== 'modal-fade-out') return;
        modalElement.removeEventListener('animationend', handler);
        modalElement.classList.remove('closing');
        modalElement.style.display = 'none';
        if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
        if (afterClose) afterClose();
    });
}

// 关闭最上层弹窗；没有打开的弹窗时返回 false
function closeTopmostModal() {
    const top = openModalStack[openModalStack.length - 1];
    if (!top) return false;
    if (top === settingsModal) {
        closeSettingsModal();
    } else if (top === engineModal) {
        closeEngineModal();
    } else if (top === modal) {
        closeModal();
    }
    return true;
}

// 焦点陷阱：Tab / Shift+Tab 只在最上层弹窗内循环
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    const top = openModalStack[openModalStack.length - 1];
    if (!top) return;
    const focusable = getFocusableElements(top);
    // 可撤销提示出现时，其操作按钮也在 Tab 循环内，键盘用户可以撤销
    const toastAction = document.getElementById('toast-action');
    if (toastAction && !toastAction.hidden && !document.getElementById('toast').hidden) {
        focusable.push(toastAction);
    }
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const inside = focusable.includes(document.activeElement);
    if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
    }
});

// 读屏播报：写入始终存在的实时区域（先清空，保证相同文字也会再次朗读）
function announce(text) {
    const live = document.getElementById('toast-live');
    if (!live) return;
    live.textContent = '';
    setTimeout(() => { live.textContent = text; }, 50);
}

// 操作反馈提示：可附带"撤销"等操作，数秒后自动消失
const toast = {
    timer: null,

    show(text, options) {
        const el = document.getElementById('toast');
        const textEl = document.getElementById('toast-text');
        const actionEl = document.getElementById('toast-action');
        if (!el || !textEl || !actionEl) return;
        const opts = options || {};

        clearTimeout(this.timer);
        textEl.textContent = text;
        announce(text);
        actionEl.hidden = !opts.onAction;
        actionEl.textContent = opts.actionLabel || '撤销';
        actionEl.onclick = opts.onAction ? () => {
            this.hide();
            opts.onAction();
        } : null;

        // 重新触发入场动画
        el.hidden = true;
        void el.offsetWidth;
        el.hidden = false;
        // 带操作时留更长时间，便于用户反应
        this.timer = setTimeout(() => this.hide(), opts.onAction ? 6000 : 3000);
    },

    hide() {
        clearTimeout(this.timer);
        const el = document.getElementById('toast');
        if (el) el.hidden = true;
    }
};

// 关闭模态框
function closeModal() {
    animateModalClose(modal, function () {
        modal.dataset.mode = 'add';
        delete modal.dataset.editingIndex;
        delete modal.dataset.editingKey;
    });
}

closeButton.onclick = closeModal;
cancelButton.onclick = closeModal;

// 点击模态框外部关闭
window.onclick = function (event) {
    if (event.target === modal) {
        closeModal();
    }
};

// 阻止模态框内容区域的点击事件冒泡
document.querySelector('.modal-content').addEventListener('click', function (e) {
    e.stopPropagation();
});

// 处理表单提交（回车或点击"保存"）
modal.querySelector('.modal-form').addEventListener('submit', function (e) {
    e.preventDefault();
    handleSaveLink();
});


// 设置弹窗相关
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const settingsCloseBtn = document.getElementById('settings-close-btn');
// 分区顺序即导航顺序；标题显示在内容区顶部
const SETTINGS_SECTIONS = ['general', 'appearance', 'engines', 'links', 'shortcuts', 'backup', 'about'];
const SETTINGS_SECTION_TITLES = {
    general: '通用',
    appearance: '外观',
    engines: '搜索引擎',
    links: '快捷链接',
    shortcuts: '快捷键',
    backup: '备份与恢复',
    about: '关于'
};
const settingsNavItems = {};
const settingsSections = {};
SETTINGS_SECTIONS.forEach(key => {
    settingsNavItems[key] = document.getElementById(`nav-${key}`);
    settingsSections[key] = document.getElementById(`${key}-section`);
});
const exportHint = document.getElementById('export-hint');
const exportClipboardBtn = document.getElementById('export-clipboard-btn');
const exportFileBtn = document.getElementById('export-file-btn');
const importJson = document.getElementById('import-json');
const importFile = document.getElementById('import-file');
const importMessage = document.getElementById('import-message');

// 设置导航浮动高亮指示条：仅跟随悬停/聚焦的导航项，移开后隐藏
const settingsNavIndicator = {
    nav: null,
    indicator: null,
    hoveredId: null,

    init() {
        this.nav = document.querySelector('.settings-nav');
        this.indicator = this.nav.querySelector('.settings-nav-indicator');
        if (!this.nav || !this.indicator) return;

        const items = this.nav.querySelectorAll('.settings-nav-item');
        items.forEach(item => {
            item.addEventListener('mouseenter', () => {
                this.hoveredId = item.id;
                this.moveTo(item);
            });
            item.addEventListener('focus', () => {
                this.hoveredId = item.id;
                this.moveTo(item);
            });
            item.addEventListener('mouseleave', () => {
                if (this.hoveredId === item.id) {
                    this.hoveredId = null;
                    this.hide();
                }
            });
            item.addEventListener('blur', () => {
                if (this.hoveredId === item.id) {
                    this.hoveredId = null;
                    this.hide();
                }
            });
        });
        this.nav.addEventListener('mouseleave', () => {
            this.hoveredId = null;
            this.hide();
        });
    },

    moveTo(item) {
        const navRect = this.nav.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        this.indicator.style.top = `${itemRect.top - navRect.top}px`;
        this.indicator.style.height = `${itemRect.height}px`;
        this.indicator.style.opacity = '1';
    },

    hide() {
        this.indicator.style.opacity = '0';
    }
};

// 更新设置导航的快捷链接数量徽标
function updateLinksBadge(count) {
    const badge = document.getElementById('nav-links-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count;
        badge.hidden = false;
    } else {
        badge.hidden = true;
    }
}

// 切换设置分区；导航采用 roving tabindex（只有当前项可 Tab 聚焦）
function showSettingsSection(sectionName) {
    shortcutManager.cancelRecording();
    SETTINGS_SECTIONS.forEach(key => {
        const active = key === sectionName;
        settingsNavItems[key].classList.toggle('active', active);
        settingsNavItems[key].setAttribute('aria-selected', String(active));
        settingsNavItems[key].tabIndex = active ? 0 : -1;
        settingsSections[key].hidden = !active;
    });
    document.getElementById('settings-section-title').textContent = SETTINGS_SECTION_TITLES[sectionName];
    document.querySelector('.settings-content').scrollTop = 0;
    settingsNavIndicator.hide();

    if (sectionName === 'general') {
        updateHourFormatControl();
        updateOpenBehaviorControl();
    } else if (sectionName === 'appearance') {
        themeManager.updateThemeModeControl();
        schemeManager.updateSchemeCards();
    } else if (sectionName === 'engines') {
        renderEngineSettings();
    } else if (sectionName === 'links') {
        renderSettingsLinks();
    } else if (sectionName === 'backup') {
        updateBackupHints();
        importMessage.hidden = true;
    } else if (sectionName === 'shortcuts') {
        shortcutManager.renderShortcutList();
    }
}

// 打开设置：默认停留在"通用"，焦点放在当前导航项
function openSettings(sectionName) {
    showSettingsSection(sectionName || 'general');
    openModal(settingsModal, settingsNavItems[sectionName || 'general']);
}

function initSettings() {
    settingsBtn.addEventListener('click', function () {
        openSettings();
    });

    // 关闭设置弹窗
    settingsCloseBtn.addEventListener('click', closeSettingsModal);
    settingsModal.addEventListener('click', function (e) {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });

    // 分区切换：点击；方向键（纵向/窄屏横向均可）、Home / End
    SETTINGS_SECTIONS.forEach(function (key, index) {
        const item = settingsNavItems[key];
        item.addEventListener('click', function () {
            showSettingsSection(key);
        });
        item.addEventListener('keydown', function (e) {
            let nextIndex = null;
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                nextIndex = (index + 1) % SETTINGS_SECTIONS.length;
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                nextIndex = (index - 1 + SETTINGS_SECTIONS.length) % SETTINGS_SECTIONS.length;
            } else if (e.key === 'Home') {
                nextIndex = 0;
            } else if (e.key === 'End') {
                nextIndex = SETTINGS_SECTIONS.length - 1;
            }
            if (nextIndex !== null) {
                e.preventDefault();
                const nextKey = SETTINGS_SECTIONS[nextIndex];
                showSettingsSection(nextKey);
                settingsNavItems[nextKey].focus();
            }
        });
    });

    // 导出：复制到剪贴板 / 下载文件
    exportClipboardBtn.addEventListener('click', exportToClipboard);
    exportFileBtn.addEventListener('click', exportToFile);

    // 设置导航浮动指示条
    settingsNavIndicator.init();

    // 设置页快捷链接列表的添加入口
    const settingsAddLink = document.getElementById('settings-add-link');
    if (settingsAddLink) {
        settingsAddLink.addEventListener('click', function () {
            openLinkEditor('add');
        });
    }

    // 搜索引擎设置（添加/编辑弹窗）
    initEngineSettings();

    // 快捷键恢复默认
    const shortcutsResetBtn = document.getElementById('shortcuts-reset-btn');
    if (shortcutsResetBtn) {
        shortcutsResetBtn.addEventListener('click', function () {
            shortcutManager.resetShortcuts();
        });
    }

    // 文件导入：选择文件即导入（选择本身就是明确的操作），可撤销
    importFile.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = JSON.parse(e.target.result);
                    handleImportData(data);
                } catch (err) {
                    showImportMessage('无法读取这个文件：内容不是有效的 JSON。');
                }
            };
            reader.readAsText(file);
            // 重置输入值，允许重复选择同一个文件
            importFile.value = '';
        }
    });

    // "选择文件"是 label，补上键盘触发
    const importFileBtn = document.getElementById('import-file-btn');
    importFileBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            importFile.click();
        }
    });

    // 粘贴导入：有内容时才可点击"导入"，点击后才替换
    const importJsonBtn = document.getElementById('import-json-btn');
    importJson.addEventListener('input', function () {
        importJsonBtn.disabled = !importJson.value.trim();
        importMessage.hidden = true;
    });
    importJsonBtn.addEventListener('click', function () {
        const text = importJson.value.trim();
        if (!text) return;
        try {
            const data = JSON.parse(text);
            if (handleImportData(data)) {
                importJson.value = '';
                importJsonBtn.disabled = true;
            }
        } catch (err) {
            showImportMessage('无法导入：粘贴的内容不是有效的 JSON。');
            importJson.focus();
        }
    });
}

// 备份分区的说明文字：显示当前链接数量，导入前就知道会替换多少
function updateBackupHints() {
    storage.get('quickLinks', function (data) {
        const count = (sanitizeLinks(data.quickLinks) || defaultLinks).length;
        exportHint.textContent = `包含 ${count} 个快捷链接、搜索引擎与偏好设置`;
        document.getElementById('import-hint').textContent =
            `导入会替换当前的 ${count} 个快捷链接；备份中如含搜索引擎与偏好设置，也会一并替换。导入后可以撤销。`;
    });
}

// 关于区：读取扩展版本号（扩展环境用 chrome.runtime，HTTP 测试环境回退 manifest.json）
function loadAboutVersion() {
    const versionEl = document.getElementById('about-version');
    if (!versionEl) return;

    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
            const manifest = chrome.runtime.getManifest();
            if (manifest && manifest.version) {
                versionEl.textContent = `v${manifest.version}`;
                return;
            }
        }
    } catch (e) {
        // 忽略，走回退路径
    }

    fetch('manifest.json')
        .then(function (response) { return response.json(); })
        .then(function (manifest) {
            if (manifest && manifest.version) {
                versionEl.textContent = `v${manifest.version}`;
            }
        })
        .catch(function () {
            versionEl.textContent = '—';
        });
}

// 设置区：渲染引擎启用列表（内置固定在前，自定义按创建顺序）。
// 每行是普通容器：开关自带标签，点击行的其余位置也切换开关；编辑/删除按钮独立。
function renderEngineSettings() {
    const list = document.getElementById('engine-list');
    if (!list) return;
    // 重渲染后把焦点放回原来的控件（键盘切换开关时不丢焦点）
    const focused = document.activeElement;
    const focusEngine = focused && list.contains(focused) ? focused.dataset.engineId : null;
    const focusRole = focused && focused.classList.contains('switch') ? 'switch' : null;
    list.innerHTML = '';

    const all = [
        ...BUILTIN_ENGINES.map(e => ({ ...e, custom: false })),
        ...engineManager.customEngines.map(e => ({ ...e, custom: true }))
    ];
    const onlyOneEnabled = engineManager.enabledIds.length <= 1;

    all.forEach(engine => {
        const enabled = engineManager.enabledIds.includes(engine.id);
        const isCurrent = engine.id === engineManager.currentEngineId;
        const switchId = `engine-switch-${engine.id}`;

        const row = document.createElement('div');
        row.className = 'settings-row settings-row-toggle';

        const icon = document.createElement('span');
        icon.className = 'engine-row-icon';
        icon.appendChild(engineMenu.buildIcon(engine));

        const text = document.createElement('span');
        text.className = 'settings-row-text';
        const title = document.createElement('label');
        title.className = 'settings-row-title';
        title.htmlFor = switchId;
        title.textContent = engine.label;
        if (isCurrent) {
            const tag = document.createElement('span');
            tag.className = 'settings-row-tag';
            tag.textContent = '当前使用';
            title.appendChild(tag);
        }
        text.appendChild(title);
        // 自定义引擎显示网址，便于辨认；内置引擎不显示冗长 URL
        if (engine.custom) {
            const desc = document.createElement('span');
            desc.className = 'settings-row-desc';
            desc.textContent = engine.url;
            text.appendChild(desc);
        }

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.id = switchId;
        toggle.className = 'switch';
        toggle.dataset.engineId = engine.id;
        toggle.setAttribute('role', 'switch');
        toggle.checked = enabled;
        // 至少保留一个启用引擎：最后一个开启的引擎不可关闭
        if (enabled && onlyOneEnabled) {
            toggle.disabled = true;
            row.classList.add('is-disabled');
            row.title = '至少需要开启一个搜索引擎';
        }
        toggle.addEventListener('change', () => setEngineEnabled(engine.id, toggle.checked));

        // 点击行的空白处同样切换（按钮、开关、标签自身的点击除外）
        row.addEventListener('click', (e) => {
            if (e.target.closest('button, input, label') || toggle.disabled) return;
            toggle.click();
        });

        row.appendChild(icon);
        row.appendChild(text);

        if (engine.custom) {
            const actions = document.createElement('span');
            actions.className = 'settings-link-actions';

            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'settings-link-action edit';
            editButton.dataset.engineId = engine.id;
            editButton.setAttribute('aria-label', `编辑 ${engine.label}`);
            editButton.innerHTML = EDIT_ICON_SVG;
            editButton.addEventListener('click', () => openEngineEditor('edit', engine.id));

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'settings-link-action delete';
            deleteButton.setAttribute('aria-label', `删除 ${engine.label}`);
            deleteButton.innerHTML = DELETE_ICON_SVG;
            deleteButton.addEventListener('click', () => deleteCustomEngine(engine.id));

            actions.appendChild(editButton);
            actions.appendChild(deleteButton);
            row.appendChild(actions);
        }

        row.appendChild(toggle);
        list.appendChild(row);
    });

    if (focusEngine) {
        const target = focusRole === 'switch'
            ? document.getElementById(`engine-switch-${focusEngine}`)
            : list.querySelector(`.edit[data-engine-id="${CSS.escape(focusEngine)}"]`);
        if (target) target.focus();
    }
}

// 开关某个引擎；关闭当前引擎时切到第一个仍启用的引擎（一并保存）
function setEngineEnabled(engineId, enabled) {
    if (enabled) {
        if (!engineManager.enabledIds.includes(engineId)) engineManager.enabledIds.push(engineId);
    } else {
        if (engineManager.enabledIds.length <= 1) return;
        engineManager.enabledIds = engineManager.enabledIds.filter(id => id !== engineId);
        if (engineManager.currentEngineId === engineId) {
            engineManager.currentEngineId = engineManager.getEngines()[0].id;
        }
    }
    engineManager.save(() => {
        updateEngineIcon();
        renderEngineSettings();
    });
}

// 删除自定义引擎：立即生效，提示中可撤销
function deleteCustomEngine(engineId) {
    const index = engineManager.customEngines.findIndex(c => c.id === engineId);
    if (index === -1) return;
    const removed = engineManager.customEngines[index];
    const wasEnabled = engineManager.enabledIds.includes(engineId);
    const wasCurrent = engineManager.currentEngineId === engineId;

    engineManager.customEngines = engineManager.customEngines.filter(c => c.id !== engineId);
    engineManager.enabledIds = engineManager.enabledIds.filter(id => id !== engineId);
    // 删除后若没有启用的引擎，回退启用第一个内置引擎
    if (!engineManager.enabledIds.length) {
        engineManager.enabledIds = [BUILTIN_ENGINES[0].id];
    }
    if (!engineManager.getEngines().some(en => en.id === engineManager.currentEngineId)) {
        engineManager.currentEngineId = engineManager.getEngines()[0].id;
    }
    const refresh = () => {
        updateEngineIcon();
        renderEngineSettings();
    };
    engineManager.save(refresh);
    // 焦点移到"添加自定义引擎"，避免随被删除的按钮丢失
    document.getElementById('settings-add-engine').focus();
    toast.show(`已删除“${removed.label}”`, {
        // 撤销只放回这一个引擎，不覆盖之后的其他修改
        onAction: () => {
            if (engineManager.customEngines.some(c => c.id === engineId)) return;
            engineManager.customEngines.splice(Math.min(index, engineManager.customEngines.length), 0, removed);
            if (wasEnabled) engineManager.enabledIds.push(engineId);
            if (wasCurrent) engineManager.currentEngineId = engineId;
            engineManager.save(refresh);
        }
    });
}

// 引擎编辑弹窗：mode = 'add' | 'edit'
const engineModal = document.getElementById('engine-modal');

function openEngineEditor(mode, engineId) {
    engineModal.dataset.mode = mode;
    const nameInput = document.getElementById('engine-name');
    const urlInput = document.getElementById('engine-url');

    if (mode === 'edit') {
        const engine = engineManager.customEngines.find(c => c.id === engineId);
        if (!engine) return;
        engineModal.dataset.editingId = engineId;
        nameInput.value = engine.label;
        urlInput.value = engine.url;
    } else {
        delete engineModal.dataset.editingId;
        nameInput.value = '';
        urlInput.value = '';
    }
    clearFieldErrors(engineModal);
    document.getElementById('engine-modal-title').textContent = mode === 'edit' ? '编辑搜索引擎' : '添加搜索引擎';
    openModal(engineModal, nameInput);
}

function closeEngineModal() {
    animateModalClose(engineModal, function () {
        delete engineModal.dataset.editingId;
    });
}

// 校验自定义引擎网址：须为 http(s) 地址并包含 {q}；返回规范化网址或错误文案
function validateEngineUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) return { error: '请填写搜索网址' };
    if (!value.includes('{q}')) return { error: '网址需要包含 {q}，表示搜索词的位置' };
    const url = normalizeHttpUrl(value, true);
    if (!url) return { error: '请输入有效的 http(s) 网址，例如 https://example.com/search?q={q}' };
    return { url };
}

// 保存自定义引擎：名称必填，网址须有效且包含 {q}
function handleSaveEngine() {
    const nameInput = document.getElementById('engine-name');
    const urlInput = document.getElementById('engine-url');
    const name = nameInput.value.trim();
    const checked = validateEngineUrl(urlInput.value);

    clearFieldErrors(engineModal);
    if (!name) {
        setFieldError('engine-name', '请填写名称');
        nameInput.focus();
        return;
    }
    if (checked.error) {
        setFieldError('engine-url', checked.error);
        urlInput.focus();
        return;
    }
    const url = checked.url;

    if (engineModal.dataset.mode === 'edit') {
        const engine = engineManager.customEngines.find(c => c.id === engineModal.dataset.editingId);
        if (engine) {
            engine.label = name;
            engine.url = url;
        }
    } else {
        engineManager.customEngines.push({ id: engineManager.newCustomId(), label: name, url });
        // 新引擎默认启用并设为当前
        engineManager.enabledIds.push(engineManager.customEngines[engineManager.customEngines.length - 1].id);
        engineManager.currentEngineId = engineManager.customEngines[engineManager.customEngines.length - 1].id;
    }

    engineManager.save(() => {
        updateEngineIcon();
        renderEngineSettings();
    });
    closeEngineModal();
}

function initEngineSettings() {
    const engineModalElement = document.getElementById('engine-modal');
    const closeBtn = engineModalElement.querySelector('.close-btn');
    closeBtn.addEventListener('click', closeEngineModal);
    engineModalElement.addEventListener('click', (e) => {
        if (e.target === engineModalElement) closeEngineModal();
    });
    document.getElementById('cancel-engine').addEventListener('click', closeEngineModal);
    engineModalElement.querySelector('.modal-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleSaveEngine();
    });

    const addEngineBtn = document.getElementById('settings-add-engine');
    if (addEngineBtn) {
        addEngineBtn.addEventListener('click', () => openEngineEditor('add'));
    }
}

function closeSettingsModal() {
    shortcutManager.cancelRecording();
    animateModalClose(settingsModal);
}

// 备份格式 v2：快捷链接 + 搜索引擎 + 偏好设置（v1 只有 links，仍可导入）
function getExportJson(callback) {
    storage.get('quickLinks', function (data) {
        const json = JSON.stringify({
            version: 2,
            links: sanitizeLinks(data.quickLinks) || defaultLinks.slice(),
            searchEngines: {
                custom: engineManager.customEngines,
                enabled: engineManager.enabledIds,
                current: engineManager.currentEngineId
            },
            preferences: prefs.data
        }, null, 2);
        callback(json);
    });
}

function exportToClipboard() {
    getExportJson(function (json) {
        navigator.clipboard.writeText(json).then(function () {
            toast.show('已复制到剪贴板');
        }).catch(function () {
            toast.show('复制失败：浏览器拒绝访问剪贴板，请改用“下载文件”');
        });
    });
}

const BACKUP_FILE_NAME = 'minimal-new-tab-backup.json';

function exportToFile() {
    getExportJson(function (json) {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = BACKUP_FILE_NAME;
        a.click();
        // 稍后再释放，确保下载已开始
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.show(`已下载 ${BACKUP_FILE_NAME}`);
    });
}

// 校验备份内容；返回 { links, engines?, preferences? } 或 { error }
function parseBackup(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.links)) {
        return { error: '无法导入：缺少 links 数组。请使用本扩展导出的备份文件。' };
    }
    const links = [];
    for (const link of data.links) {
        if (!link || typeof link.name !== 'string' || !link.name.trim() || typeof link.url !== 'string') {
            return { error: '无法导入：有链接缺少名称或网址。' };
        }
        const url = normalizeHttpUrl(link.url);
        if (!url) {
            return { error: `无法导入：“${link.name.trim()}”的网址无效，只支持 http 和 https。` };
        }
        links.push({ name: link.name.trim(), url });
    }

    const result = { links };
    const engines = data.searchEngines;
    if (engines && typeof engines === 'object') {
        const custom = [];
        for (const engine of Array.isArray(engines.custom) ? engines.custom : []) {
            const checked = engine && typeof engine.label === 'string' && engine.label.trim()
                ? validateEngineUrl(engine.url) : { error: true };
            if (checked.error || typeof engine.id !== 'string' || !engine.id) {
                return { error: '无法导入：备份中的自定义搜索引擎格式不正确。' };
            }
            custom.push({ id: engine.id, label: engine.label.trim(), url: checked.url });
        }
        const validIds = new Set([...BUILTIN_ENGINES.map(e => e.id), ...custom.map(e => e.id)]);
        const enabled = (Array.isArray(engines.enabled) ? engines.enabled : []).filter(id => validIds.has(id));
        result.engines = {
            custom,
            enabled: enabled.length ? enabled : [BUILTIN_ENGINES[0].id],
            current: validIds.has(engines.current) ? engines.current : null
        };
    }
    if (data.preferences && typeof data.preferences === 'object') {
        result.preferences = prefs.sanitize(data.preferences);
    }
    return result;
}

// 应用搜索引擎配置（导入或撤销导入时使用）
function applyEngineConfig(config) {
    engineManager.customEngines = config.custom.slice();
    engineManager.enabledIds = config.enabled.slice();
    engineManager.currentEngineId = config.current && config.enabled.includes(config.current)
        ? config.current
        : config.enabled[0];
    engineManager.save(() => {
        updateEngineIcon();
        renderEngineSettings();
    });
}

// 应用偏好设置（导入或撤销导入时使用）
function applyPreferenceConfig(next) {
    prefs.data = prefs.sanitize(next);
    prefs.save();
    applyPreferences();
}

// 校验并导入；成功返回 true。导入替换对应数据，提示中可撤销
function handleImportData(data) {
    const backup = parseBackup(data);
    if (backup.error) {
        showImportMessage(backup.error);
        return false;
    }
    importMessage.hidden = true;

    const previousEngines = {
        custom: engineManager.customEngines.slice(),
        enabled: engineManager.enabledIds.slice(),
        current: engineManager.currentEngineId
    };
    const previousPreferences = { ...prefs.data, shortcuts: { ...prefs.data.shortcuts } };

    let previousLinks = null;
    mutateLinks(function (links) {
        previousLinks = links.slice();
        links.splice(0, links.length, ...backup.links);
    }, function () {
        if (backup.engines) applyEngineConfig(backup.engines);
        if (backup.preferences) applyPreferenceConfig(backup.preferences);
        updateBackupHints();
        const parts = [`${backup.links.length} 个快捷链接`];
        if (backup.engines) parts.push('搜索引擎');
        if (backup.preferences) parts.push('偏好设置');
        toast.show(`已导入${parts.join('、')}`, {
            onAction: () => {
                mutateLinks(function (links) {
                    links.splice(0, links.length, ...previousLinks);
                }, updateBackupHints);
                if (backup.engines) applyEngineConfig(previousEngines);
                if (backup.preferences) applyPreferenceConfig(previousPreferences);
            }
        });
    });
    return true;
}

// 导入错误：就近显示在导入区下方
function showImportMessage(text) {
    importMessage.textContent = text;
    importMessage.hidden = false;
}

// 同步存储被其他标签页（或其他设备）修改时，刷新本页显示
function handleExternalChange(changes) {
    if ('preferences' in changes && changes.preferences) {
        prefs.receive(changes.preferences);
    }
    if ('quickLinks' in changes) {
        const links = sanitizeLinks(changes.quickLinks) || defaultLinks.slice();
        if (JSON.stringify(links) !== JSON.stringify(currentLinks)) {
            renderLinks(links);
        }
    }
    if ('customEngines' in changes || 'enabledEngines' in changes || 'searchEngine' in changes) {
        const before = engineManager.snapshot();
        engineManager.load(function () {
            if (engineManager.snapshot() === before) return;
            updateEngineIcon();
            if (!settingsSections.engines.hidden) renderEngineSettings();
        });
    }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function () {
    // 主题、配色方案、快捷键先按本地缓存初始化（首帧正确），
    // 再以同步存储中的偏好为准（首次运行时迁移旧版本地偏好）
    themeManager.init();
    schemeManager.init();
    shortcutManager.init();
    prefs.load(applyPreferences);

    // 其他标签页或设备的修改：偏好、快捷链接、搜索引擎
    storage.onChange(handleExternalChange);

    // 加载搜索引擎配置（自定义引擎 + 启用列表 + 当前引擎）
    engineManager.load(function () {
        updateEngineIcon();
    });
    engineMenu.init();

    // 绑定搜索引擎切换事件（原生按钮自带 Enter/Space 触发 click）
    const engineSelector = document.getElementById('engine-selector');
    if (engineSelector) {
        engineSelector.addEventListener('click', handleEngineClick);
    }

    // 加载快速链接
    loadLinks();

    // 搜索框聚焦时启动器淡出
    setupSearchFocusBlur();

    // 设置按钮
    initSettings();

    // 关于区的版本号
    loadAboutVersion();

    // 页面加载动画
    requestAnimationFrame(() => {
        document.body.classList.add('loaded');
    });
});
