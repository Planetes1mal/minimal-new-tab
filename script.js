// 主题管理
const themeManager = {
    // 主题状态
    currentTheme: null, // 'light', 'dark', 或 null (跟随系统)

    // 初始化主题
    init() {
        this.loadTheme();
        this.applyTheme();
        this.setupThemeToggle();
    },

    // 加载保存的主题设置
    loadTheme() {
        try {
            const savedTheme = localStorage.getItem('theme');
            this.currentTheme = savedTheme || null;
        } catch (e) {
            console.error('Error loading theme:', e);
            this.currentTheme = null;
        }
    },

    // 保存主题设置
    saveTheme(theme) {
        try {
            if (theme) {
                localStorage.setItem('theme', theme);
            } else {
                localStorage.removeItem('theme');
            }
        } catch (e) {
            console.error('Error saving theme:', e);
        }
    },

    // 应用主题
    applyTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        const body = document.body;

        body.classList.remove('light', 'dark');
        themeToggle.classList.remove('light', 'dark');

        if (this.currentTheme === 'dark') {
            body.classList.add('dark');
            themeToggle.classList.add('dark');
        } else if (this.currentTheme === 'light') {
            body.classList.add('light');
            themeToggle.classList.add('light');
        }
    },

    // 切换主题
    toggleTheme() {
        // 获取当前实际显示的主题（无论是手动设置还是跟随系统）
        const isCurrentlyDark = this.currentTheme === 'dark' ||
            (this.currentTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);

        // 直接切换到相反的主题
        this.currentTheme = isCurrentlyDark ? 'light' : 'dark';

        this.saveTheme(this.currentTheme);
        this.applyTheme();
    },

    // 设置主题切换按钮
    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // 监听系统主题变化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.currentTheme === null) {
                this.applyTheme();
            }
        });
    }
};

// 配色方案管理（与主题模式正交：方案决定色系，主题模式决定明暗变体）
const schemeManager = {
    // 当前方案；forest 为默认方案，不写 data-scheme 属性
    currentScheme: 'forest',
    SCHEMES: {
        forest: '森绿',
        ocean: '碧蓝',
        amber: '琥珀',
        slate: '岩墨'
    },

    init() {
        this.loadScheme();
        this.applyScheme();
        this.setupSchemePicker();
    },

    // 加载保存的方案设置
    loadScheme() {
        try {
            const savedScheme = localStorage.getItem('colorScheme');
            if (savedScheme && this.SCHEMES[savedScheme]) {
                this.currentScheme = savedScheme;
            }
        } catch (e) {
            console.error('Error loading color scheme:', e);
            this.currentScheme = 'forest';
        }
    },

    // 保存方案设置（默认方案不落盘，保持存量用户存储不变）
    saveScheme(scheme) {
        try {
            if (scheme === 'forest') {
                localStorage.removeItem('colorScheme');
            } else {
                localStorage.setItem('colorScheme', scheme);
            }
        } catch (e) {
            console.error('Error saving color scheme:', e);
        }
    },

    // 应用方案：只有非默认方案需要 data-scheme 属性
    applyScheme() {
        if (this.currentScheme === 'forest') {
            delete document.body.dataset.scheme;
        } else {
            document.body.dataset.scheme = this.currentScheme;
        }
    },

    // 选择并应用方案
    selectScheme(scheme) {
        if (!this.SCHEMES[scheme] || scheme === this.currentScheme) {
            return;
        }
        this.currentScheme = scheme;
        this.saveScheme(scheme);
        this.applyScheme();
        this.updateSchemeCards();
    },

    // 同步外观区的方案卡选中态
    updateSchemeCards() {
        const cards = document.querySelectorAll('.scheme-card');
        cards.forEach(card => {
            card.setAttribute('aria-checked', String(card.dataset.scheme === this.currentScheme));
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
                    cards[nextIndex].focus();
                    this.selectScheme(cards[nextIndex].dataset.scheme);
                }
            });
        });
    }
};

// 时间格式：24 小时制（默认）或 12 小时制
let hourFormat = '24';

function loadHourFormat() {
    try {
        if (localStorage.getItem('hourFormat') === '12') {
            hourFormat = '12';
        }
    } catch (e) {
        console.error('Error loading hour format:', e);
    }
}

// 设置时间格式并持久化（24 为默认，不落盘）
function setHourFormat(format) {
    hourFormat = format === '12' ? '12' : '24';
    try {
        if (hourFormat === '12') {
            localStorage.setItem('hourFormat', '12');
        } else {
            localStorage.removeItem('hourFormat');
        }
    } catch (e) {
        console.error('Error saving hour format:', e);
    }
    updateDateTime();
    updateHourFormatControl();
}

// 同步外观面板的时间格式选中态
function updateHourFormatControl() {
    const radio = document.querySelector(`input[name="hour-format"][value="${hourFormat}"]`);
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

const shortcutManager = {
    shortcuts: {},
    recordingAction: null,
    recordingHandler: null,
    STORAGE_KEY: 'customShortcuts',

    init() {
        this.loadShortcuts();
        this.renderShortcutList();
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    },

    // 加载自定义快捷键（默认值不落盘）
    loadShortcuts() {
        this.shortcuts = {};
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.keys(SHORTCUT_ACTIONS).forEach(action => {
                    if (typeof parsed[action] === 'string' && parsed[action]) {
                        this.shortcuts[action] = parsed[action];
                    }
                });
            }
        } catch (e) {
            console.error('Error loading shortcuts:', e);
        }
    },

    saveShortcuts() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.shortcuts));
        } catch (e) {
            console.error('Error saving shortcuts:', e);
        }
    },

    // 当前动作生效的键（自定义优先，回退默认）
    getKey(action) {
        return this.shortcuts[action] || SHORTCUT_ACTIONS[action].defaultKey;
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

    // 全局按键处理：匹配动作并执行；录制态与输入态不处理
    handleKeydown(event) {
        if (this.recordingAction) return;
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
                settingsModal.style.display = 'block';
                showSettingsSection('appearance');
                break;
            case 'toggleTheme':
                themeManager.toggleTheme();
                break;
            case 'closeModal':
                if (settingsModal.style.display === 'block') {
                    closeSettingsModal();
                }
                if (modal.style.display === 'block') {
                    closeModal();
                }
                break;
        }
    },

    // 渲染快捷键列表
    renderShortcutList() {
        const list = document.getElementById('shortcut-list');
        if (!list) return;
        list.innerHTML = '';

        Object.keys(SHORTCUT_ACTIONS).forEach(action => {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'shortcut-row';
            row.dataset.action = action;
            row.setAttribute('aria-label', `修改快捷键：${SHORTCUT_ACTIONS[action].label}`);

            const name = document.createElement('span');
            name.className = 'shortcut-name';
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

    // 开始录制新组合键
    startRecording(action, row) {
        if (this.recordingAction) return;
        this.recordingAction = action;
        row.classList.add('recording');
        const keyEl = row.querySelector('.shortcut-key');
        keyEl.textContent = '按下新按键…';

        this.recordingHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();

            // Escape 取消录制（不绑定）
            if (event.key === 'Escape') {
                this.cancelRecording(row, keyEl);
                return;
            }

            // 纯修饰键按下不结束录制（等待主键）
            if (event.key === 'Control' || event.key === 'Shift' ||
                event.key === 'Alt' || event.key === 'Meta') {
                return;
            }

            const key = this.formatKey(event);

            // 冲突检测：组合键已被其他动作占用
            const conflict = Object.keys(SHORTCUT_ACTIONS).find(a =>
                a !== action && this.getKey(a) === key
            );
            if (conflict) {
                row.classList.remove('recording');
                keyEl.textContent = `冲突：${SHORTCUT_ACTIONS[conflict].label}`;
                setTimeout(() => {
                    keyEl.textContent = this.displayKey(this.getKey(action));
                }, 1500);
                this.finishRecording();
                return;
            }

            this.shortcuts[action] = key;
            this.saveShortcuts();
            row.classList.remove('recording');
            keyEl.textContent = this.displayKey(key);
            this.finishRecording();
        };
        document.addEventListener('keydown', this.recordingHandler);
    },

    cancelRecording(row, keyEl) {
        row.classList.remove('recording');
        keyEl.textContent = this.displayKey(this.getKey(this.recordingAction));
        this.finishRecording();
    },

    finishRecording() {
        document.removeEventListener('keydown', this.recordingHandler);
        this.recordingHandler = null;
        this.recordingAction = null;
    },

    // 恢复默认：清空自定义
    resetShortcuts() {
        this.shortcuts = {};
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (e) {
            console.error('Error resetting shortcuts:', e);
        }
        this.renderShortcutList();
    }
};

// 打开方式：新标签页（默认）或当前标签页
let openInNewTab = true;

function loadOpenBehavior() {
    try {
        openInNewTab = localStorage.getItem('openInNewTab') !== 'false';
    } catch (e) {
        console.error('Error loading open behavior:', e);
    }
}

function setOpenInNewTab(value) {
    openInNewTab = value === 'new';
    try {
        if (openInNewTab) {
            localStorage.removeItem('openInNewTab');
        } else {
            localStorage.setItem('openInNewTab', 'false');
        }
    } catch (e) {
        console.error('Error saving open behavior:', e);
    }
}

function updateOpenBehaviorControl() {
    const radio = document.querySelector(`input[name="open-in-new-tab"][value="${openInNewTab ? 'new' : 'current'}"]`);
    if (radio) {
        radio.checked = true;
    }
}

// 统一打开目的地：搜索提交与快捷链接点击共用
function openDestination(url) {
    if (openInNewTab) {
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
    if (hourFormat === '12') {
        period = hours < 12 ? ' AM' : ' PM';
        hours = hours % 12 || 12;
    }
    const hoursText = hourFormat === '12' ? String(hours) : String(hours).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeEl = document.getElementById('time');
    // 使用可单独控制的冒号元素，便于动画
    timeEl.innerHTML = `${hoursText}<span class="colon">:</span>${minutes}${period}`;

    // 更新日期 - 紧凑大写英文格式，如 MONDAY · AUG 11
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    const dateText = now.toLocaleDateString('en-US', options).toUpperCase().replace(',', ' ·');
    document.getElementById('date').textContent = dateText;
}

// 每秒更新一次时间
loadHourFormat();
updateDateTime();
setInterval(updateDateTime, 1000);

// 搜索引擎图标路径
const engineIcons = {
    google: 'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.04-1.133 8.147-3.253 2.12-2.12 2.793-5.333 2.793-8.267 0-.8-.053-1.467-.173-2.133H12.48z',
    bing: 'M3.3 0v24l8.4-4.6V4.4zm9.5 5.6L18.6 9l-5.8 3.4v4.8l8.2-4.7V6.2z'
};

// 搜索引擎配置
const engines = [
    { name: 'google', label: 'Google', url: 'https://www.google.com/search?q=' },
    { name: 'bing', label: 'Bing', url: 'https://www.bing.com/search?q=' }
];

// 当前搜索引擎索引
let currentEngineIndex = 0;

// 更新搜索引擎图标，并同步按钮的可读文本（title / aria-label）
function updateEngineIcon() {
    const engineIcon = document.getElementById('engine-icon');
    const currentEngine = engines[currentEngineIndex];
    const iconPath = engineIcons[currentEngine.name];

    engineIcon.innerHTML = '';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', iconPath);
    path.setAttribute('fill', 'currentColor');
    engineIcon.appendChild(path);

    const engineSelector = document.getElementById('engine-selector');
    if (engineSelector) {
        const label = `切换搜索引擎，当前为 ${currentEngine.label}`;
        engineSelector.setAttribute('aria-label', label);
        engineSelector.title = label;
    }
}

// 切换搜索引擎
function toggleEngine() {
    currentEngineIndex = (currentEngineIndex + 1) % engines.length;
    storage.set({ 'searchEngine': engines[currentEngineIndex].url }, function () {
        updateEngineIcon();
    });
}

// 处理搜索功能：表单提交覆盖回车键与搜索按钮两种提交方式
document.getElementById('search-form').addEventListener('submit', function (e) {
    e.preventDefault();
    performSearch();
});

// 根据单选切换，自定义 URL 输入框显示状态 / 时间格式
document.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'icon-mode') {
        const customContainer = document.getElementById('custom-url-container');
        if (customContainer) {
            if (e.target.value === 'custom') {
                customContainer.classList.add('show');
            } else {
                customContainer.classList.remove('show');
            }
        }
    } else if (e.target && e.target.name === 'hour-format') {
        setHourFormat(e.target.value);
    } else if (e.target && e.target.name === 'open-in-new-tab') {
        setOpenInNewTab(e.target.value);
    }
});

function performSearch() {
    const searchInput = document.getElementById('search-input');
    const currentEngine = engines[currentEngineIndex];

    if (searchInput.value.trim() !== '') {
        const searchUrl = currentEngine.url + encodeURIComponent(searchInput.value.trim());
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

// 存储API兼容层
const storage = {
    get: function (key, callback) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            // 使用chrome存储API
            chrome.storage.sync.get(key, callback);
        } else {
            // 使用localStorage作为备选
            try {
                const data = {};
                if (typeof key === 'string') {
                    data[key] = JSON.parse(localStorage.getItem(key));
                } else if (Array.isArray(key)) {
                    key.forEach(k => {
                        data[k] = JSON.parse(localStorage.getItem(k));
                    });
                } else {
                    Object.keys(key).forEach(k => {
                        const value = localStorage.getItem(k);
                        data[k] = value !== null ? JSON.parse(value) : key[k];
                    });
                }
                callback(data);
            } catch (e) {
                console.error('Error getting data from localStorage', e);
                callback({});
            }
        }
    },

    set: function (items, callback) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            // 使用chrome存储API
            chrome.storage.sync.set(items, callback);
        } else {
            // 使用localStorage作为备选
            try {
                Object.keys(items).forEach(key => {
                    localStorage.setItem(key, JSON.stringify(items[key]));
                });
                if (callback) callback();
            } catch (e) {
                console.error('Error saving data to localStorage', e);
                if (callback) callback();
            }
        }
    }
};

// 依据 URL 生成 favicon 地址，优先站点自身的 /favicon.ico
function deriveFaviconUrl(linkUrl) {
    try {
        const url = new URL(linkUrl);
        const domain = url.hostname;
        return `${url.protocol}//${domain}/favicon.ico`;
    } catch (e) {
        return '';
    }
}

// 补齐链接缺失的图标字段
function normalizeLink(link) {
    const next = { ...link };
    if (!next.iconMode) {
        next.iconMode = 'favicon';
    }
    if (!next.icon && next.iconMode === 'favicon') {
        next.icon = deriveFaviconUrl(next.url);
    }
    return next;
}

// 从存储中加载链接或使用默认链接，并补齐缺失的图标字段
function loadLinks() {
    storage.get('quickLinks', function (data) {
        const original = data.quickLinks || defaultLinks;
        let mutated = false;
        const links = original.map(link => {
            const next = normalizeLink(link);
            if (next.iconMode !== link.iconMode || next.icon !== link.icon) {
                mutated = true;
            }
            return next;
        });

        if (mutated) {
            saveLinks(links);
        } else {
            renderLinks(links);
        }
    });
}

// 保存链接到存储
function saveLinks(links) {
    storage.set({ 'quickLinks': links }, function () {
        renderLinks(links);
    });
}

// 渲染链接到页面
function renderLinks(links) {
    const quickLinksContainer = document.getElementById('quick-links');
    // 保存添加按钮元素
    const addButton = document.getElementById('add-link-button');

    // 清空容器，但不包括添加按钮
    quickLinksContainer.innerHTML = '';

    // 首先添加所有链接
    links.forEach((link, index) => {
        const linkElement = document.createElement('a');
        linkElement.className = 'quick-link';
        linkElement.href = link.url;
        linkElement.target = '_blank';
        linkElement.title = link.url;
        linkElement.draggable = true;
        linkElement.dataset.index = index;

        const siteDot = document.createElement('span');
        siteDot.className = 'quick-link-dot';
        siteDot.setAttribute('aria-hidden', 'true');
        siteDot.style.setProperty('--c-site-color', getSiteColor(link.url));

        // 创建名称
        const nameElement = document.createElement('div');
        nameElement.className = 'quick-link-name';
        nameElement.textContent = link.name;

        // 创建删除按钮
        const deleteElement = document.createElement('span');
        deleteElement.className = 'delete-link';
        deleteElement.setAttribute('role', 'button');
        deleteElement.setAttribute('tabindex', '0');
        deleteElement.setAttribute('aria-label', `删除 ${link.name}`);
        deleteElement.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 7H20M9 7V4H15V7M6.5 7L7.5 20H16.5L17.5 7M10 11V16M14 11V16"></path>
            </svg>
        `;

        const handleDelete = function (e) {
            e.preventDefault();
            e.stopPropagation();
            deleteLink(index);
        };
        deleteElement.addEventListener('click', handleDelete);
        deleteElement.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                handleDelete(e);
            }
        });

        linkElement.appendChild(siteDot);
        linkElement.appendChild(nameElement);
        linkElement.appendChild(deleteElement);
        quickLinksContainer.appendChild(linkElement);

        // 尊重打开方式设置；修饰键点击保留浏览器原生行为
        linkElement.addEventListener('click', function (e) {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
                return;
            }
            e.preventDefault();
            openDestination(link.url);
        });
    });

    // 重新添加"添加"按钮
    quickLinksContainer.appendChild(addButton);

    // 建立右键编辑
    attachContextMenu(links);

    // 设置拖拽功能
    setupDragAndDrop();

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

// 渲染设置页的快捷链接列表（与启动器同存储，双向同步）
function renderSettingsLinks(links) {
    const list = document.getElementById('settings-link-list');
    if (!list) return;

    // 无参调用时从存储加载
    if (!links) {
        storage.get('quickLinks', function (data) {
            renderSettingsLinks(data.quickLinks || defaultLinks);
        });
        return;
    }

    list.innerHTML = '';

    if (!links.length) {
        const empty = document.createElement('p');
        empty.className = 'settings-link-empty';
        empty.textContent = '暂无快捷链接，点击上方按钮添加。';
        list.appendChild(empty);
        setupSettingsListDrag();
        return;
    }

    links.forEach((link, index) => {
        const row = document.createElement('div');
        row.className = 'settings-link-row';
        row.draggable = true;
        row.dataset.index = index;
        row.title = link.url;

        const dot = document.createElement('span');
        dot.className = 'settings-link-dot';
        dot.setAttribute('aria-hidden', 'true');
        dot.style.setProperty('--c-site-color', getSiteColor(link.url));

        const name = document.createElement('span');
        name.className = 'settings-link-name';
        name.textContent = link.name;

        const url = document.createElement('span');
        url.className = 'settings-link-url';
        try {
            url.textContent = new URL(link.url).hostname;
        } catch (e) {
            url.textContent = link.url;
        }

        const actions = document.createElement('span');
        actions.className = 'settings-link-actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'settings-link-action edit';
        editButton.setAttribute('aria-label', `编辑 ${link.name}`);
        editButton.innerHTML = EDIT_ICON_SVG;
        editButton.addEventListener('click', function (e) {
            e.stopPropagation();
            openLinkEditor('edit', index);
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'settings-link-action delete';
        deleteButton.setAttribute('aria-label', `删除 ${link.name}`);
        deleteButton.innerHTML = DELETE_ICON_SVG;
        deleteButton.addEventListener('click', function (e) {
            e.stopPropagation();
            deleteLink(index);
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        row.appendChild(dot);
        row.appendChild(name);
        row.appendChild(url);
        row.appendChild(actions);

        // 点击行主体打开编辑弹窗
        row.addEventListener('click', function () {
            openLinkEditor('edit', index);
        });

        list.appendChild(row);
    });

    setupSettingsListDrag();
}

// 通用插入式拖拽：容器内的 [data-index] 子项可拖拽，拖拽时在目标空隙显示
// 插入指示线，松手后回调 onDrop(fromIndex, toIndex)。容器清空重渲染后
// 调用返回对象的 refresh() 重新挂载指示线。
function createInsertionDrag(container, onDrop) {
    const indicator = document.createElement('div');
    indicator.className = 'drag-indicator';
    indicator.style.display = 'none';
    container.appendChild(indicator);

    let draggedElement = null;
    let draggedIndex = null;

    // 鼠标到子项左/右边缘的最近距离（换行布局下按角点距离计算）
    function edgeDistance(clientX, clientY, edgeX, top, bottom) {
        const dx = clientX - edgeX;
        if (clientY < top) return Math.hypot(dx, clientY - top);
        if (clientY > bottom) return Math.hypot(dx, clientY - bottom);
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
            const leftDistance = edgeDistance(clientX, clientY, rect.left, rect.top, rect.bottom);
            const rightDistance = edgeDistance(clientX, clientY, rect.right, rect.top, rect.bottom);
            if (leftDistance < bestDistance) {
                bestDistance = leftDistance;
                bestIndex = index;
            }
            if (rightDistance < bestDistance) {
                bestDistance = rightDistance;
                bestIndex = index + 1;
            }
        });
        return bestIndex;
    }

    // 在插入位置显示指示线
    function showIndicator(insertIndex) {
        const items = Array.from(container.querySelectorAll('[data-index]'));
        if (!items.length) return;

        const edgeItem = insertIndex >= items.length ? items[items.length - 1] : items[insertIndex];
        const edgeRect = edgeItem.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const x = insertIndex >= items.length ? edgeRect.right : edgeRect.left;

        indicator.style.display = 'block';
        indicator.style.top = `${edgeRect.top - containerRect.top}px`;
        indicator.style.height = `${edgeRect.height}px`;
        indicator.style.left = `${x - containerRect.left - 1}px`;
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
        onDrop(draggedIndex, insertIndex);
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

// 设置页快捷链接列表拖拽（与启动器同一存储层）
let settingsListDrag = null;

function setupSettingsListDrag() {
    if (settingsListDrag) {
        settingsListDrag.refresh();
        return;
    }
    settingsListDrag = createInsertionDrag(document.getElementById('settings-link-list'), insertLink);
}

// 插入链接：把 fromIndex 的链接移动到 toIndex（后续条目依次后移）
function insertLink(fromIndex, toIndex) {
    storage.get('quickLinks', function (data) {
        const links = (data.quickLinks || defaultLinks).slice();
        if (fromIndex < 0 || fromIndex >= links.length) return;

        const moved = links.splice(fromIndex, 1)[0];
        let target = toIndex;
        if (fromIndex < toIndex) {
            // 移除后目标位置前移一位
            target -= 1;
        }
        target = Math.max(0, Math.min(target, links.length));
        links.splice(target, 0, moved);
        saveLinks(links);
    });
}

// 删除链接
function deleteLink(index) {
    storage.get('quickLinks', function (data) {
        const links = (data.quickLinks || defaultLinks).slice();
        links.splice(index, 1);
        saveLinks(links);
    });
}

// 统一的保存处理函数，通过 modal.dataset.mode 区分新增/编辑模式
function handleSaveLink() {
    const linkName = document.getElementById('link-name').value.trim();
    let linkUrl = document.getElementById('link-url').value.trim();
    const iconMode = document.querySelector('input[name="icon-mode"]:checked')?.value || 'favicon';
    const customIconUrl = document.getElementById('icon-custom-url')?.value.trim();

    if (linkName && linkUrl) {
        if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
            linkUrl = 'https://' + linkUrl;
        }

        let icon = '';
        if (iconMode === 'favicon') icon = deriveFaviconUrl(linkUrl);
        if (iconMode === 'custom' && customIconUrl) icon = customIconUrl;

        storage.get('quickLinks', function (data) {
            const links = (data.quickLinks || defaultLinks).slice();

            if (modal.dataset.mode === 'edit') {
                // 编辑模式：更新指定索引
                const idx = parseInt(modal.dataset.editingIndex);
                links[idx] = { name: linkName, url: linkUrl, iconMode, icon };
            } else {
                // 新增模式：push 到数组
                links.push({ name: linkName, url: linkUrl, iconMode, icon });
            }

            saveLinks(links);
            closeModal();
        });
    }
}

// 右键编辑：打开编辑弹窗（edit 模式）
function attachContextMenu(links) {
    const quickLinksContainer = document.getElementById('quick-links');
    const linkNodes = quickLinksContainer.querySelectorAll('a.quick-link');
    linkNodes.forEach((node, idx) => {
        node.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            openLinkEditor('edit', idx);
        });
    });
}

// 打开链接编辑弹窗：mode = 'add' 新增 / 'edit' 编辑（填充现有值）
function openLinkEditor(mode, index) {
    if (mode === 'edit') {
        storage.get('quickLinks', function (data) {
            const links = data.quickLinks || defaultLinks;
            const current = links[index];
            if (!current) return;

            modal.dataset.mode = 'edit';
            modal.dataset.editingIndex = index;
            modal.style.display = 'block';
            document.getElementById('link-name').value = current.name || '';
            document.getElementById('link-url').value = current.url || '';
            const iconMode = current.iconMode || (current.icon ? 'favicon' : 'letter');
            if (iconMode === 'letter') {
                document.getElementById('icon-letter').checked = true;
            } else if (iconMode === 'custom') {
                document.getElementById('icon-custom').checked = true;
            } else {
                document.getElementById('icon-favicon').checked = true;
            }
            const customContainer = document.getElementById('custom-url-container');
            const customInput = document.getElementById('icon-custom-url');
            if (customContainer && customInput) {
                if (iconMode === 'custom') {
                    customContainer.classList.add('show');
                    customInput.value = current.icon || '';
                } else {
                    customContainer.classList.remove('show');
                    customInput.value = '';
                }
            }
        });
        return;
    }

    // 新增模式
    modal.dataset.mode = 'add';
    delete modal.dataset.editingIndex;
    modal.style.display = 'block';
    document.getElementById('link-name').value = '';
    document.getElementById('link-url').value = '';
    // 默认选择 favicon
    const radioFavicon = document.getElementById('icon-favicon');
    if (radioFavicon) radioFavicon.checked = true;
    const customContainer = document.getElementById('custom-url-container');
    if (customContainer) {
        customContainer.classList.remove('show');
    }
    const customInput = document.getElementById('icon-custom-url');
    if (customInput) {
        customInput.value = '';
    }
}

// 添加链接模态框
const modal = document.getElementById('add-link-modal');
modal.dataset.mode = 'add';
const addLinkButton = document.getElementById('add-link-button');
const closeButton = modal.querySelector('.close-btn');
const cancelButton = document.getElementById('cancel-link');
const saveLinkButton = document.getElementById('save-link');

// 打开模态框（新增模式）
addLinkButton.onclick = function (e) {
    e.preventDefault();
    openLinkEditor('add');
};

addLinkButton.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        addLinkButton.click();
    }
});

// 关闭模态框
function closeModal() {
    modal.style.display = 'none';
    modal.dataset.mode = 'add';
    delete modal.dataset.editingIndex;
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

// 处理表单提交
document.querySelector('.modal-form').addEventListener('submit', function (e) {
    e.preventDefault();
    handleSaveLink();
});

// 绑定保存逻辑（统一使用 handleSaveLink）
saveLinkButton.onclick = handleSaveLink;

// 设置弹窗相关
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const settingsNavItems = {
    appearance: document.getElementById('nav-appearance'),
    general: document.getElementById('nav-general'),
    links: document.getElementById('nav-links'),
    backup: document.getElementById('nav-backup'),
    shortcuts: document.getElementById('nav-shortcuts'),
    about: document.getElementById('nav-about')
};
const settingsSections = {
    appearance: document.getElementById('appearance-section'),
    general: document.getElementById('general-section'),
    links: document.getElementById('links-section'),
    backup: document.getElementById('backup-section'),
    shortcuts: document.getElementById('shortcuts-section'),
    about: document.getElementById('about-section')
};
const exportPanel = document.getElementById('export-panel');
const exportHint = document.getElementById('export-hint');
const exportClipboardBtn = document.getElementById('export-clipboard-btn');
const exportFileBtn = document.getElementById('export-file-btn');
const importSection = document.getElementById('import-section');
const importJson = document.getElementById('import-json');
const importFile = document.getElementById('import-file');
const importMessage = document.getElementById('import-message');

// 切换设置分区：外观 / 快捷链接 / 备份 / 关于
function showSettingsSection(sectionName) {
    Object.keys(settingsNavItems).forEach(key => {
        const active = key === sectionName;
        settingsNavItems[key].classList.toggle('active', active);
        settingsNavItems[key].setAttribute('aria-selected', String(active));
        settingsSections[key].hidden = !active;
    });

    if (sectionName === 'appearance') {
        schemeManager.updateSchemeCards();
    } else if (sectionName === 'general') {
        updateHourFormatControl();
        updateOpenBehaviorControl();
    } else if (sectionName === 'links') {
        renderSettingsLinks();
    } else if (sectionName === 'backup') {
        storage.get('quickLinks', function (data) {
            const count = (data.quickLinks || defaultLinks).length;
            exportHint.textContent = `将 ${count} 个快捷链接导出为 JSON`;
        });
        importMessage.style.display = 'none';
    } else if (sectionName === 'shortcuts') {
        shortcutManager.renderShortcutList();
    }
}

function initSettings() {
    // 打开设置弹窗，默认停留在外观分区
    settingsBtn.addEventListener('click', function () {
        settingsModal.style.display = 'block';
        showSettingsSection('appearance');
    });

    // 关闭设置弹窗
    settingsCloseBtn.addEventListener('click', closeSettingsModal);
    settingsModal.addEventListener('click', function (e) {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });

    // 分区切换（点击 + 方向键）
    const navList = Object.values(settingsNavItems);
    navList.forEach(function (item, index) {
        item.addEventListener('click', function () {
            showSettingsSection(item.id.replace('nav-', ''));
        });
        item.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const offset = e.key === 'ArrowDown' ? 1 : -1;
                const nextIndex = (index + offset + navList.length) % navList.length;
                navList[nextIndex].focus();
                showSettingsSection(navList[nextIndex].id.replace('nav-', ''));
            }
        });
    });

    // 导出：复制到剪贴板 / 下载文件
    exportClipboardBtn.addEventListener('click', exportToClipboard);
    exportFileBtn.addEventListener('click', exportToFile);

    // 设置页快捷链接列表的添加入口
    const settingsAddLink = document.getElementById('settings-add-link');
    if (settingsAddLink) {
        settingsAddLink.addEventListener('click', function () {
            openLinkEditor('add');
        });
    }

    // 快捷键恢复默认
    const shortcutsResetBtn = document.getElementById('shortcuts-reset-btn');
    if (shortcutsResetBtn) {
        shortcutsResetBtn.addEventListener('click', function () {
            shortcutManager.resetShortcuts();
        });
    }

    // 文件导入
    importFile.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = JSON.parse(e.target.result);
                    handleImportData(data);
                } catch (err) {
                    showImportMessage('JSON 格式错误', 'error');
                }
            };
            reader.readAsText(file);
            // 重置输入值，允许重复选择同一个文件
            importFile.value = '';
        }
    });

    // 粘贴导入
    importJson.addEventListener('input', function () {
        const text = importJson.value.trim();
        if (text) {
            try {
                const data = JSON.parse(text);
                handleImportData(data);
            } catch (err) {
                // 正在输入，不显示错误
            }
        }
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
            versionEl.textContent = '';
        });
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
}

function getExportJson(callback) {
    storage.get('quickLinks', function (data) {
        const json = JSON.stringify({
            version: 1,
            links: data.quickLinks || defaultLinks
        }, null, 2);
        callback(json);
    });
}

function exportToClipboard() {
    getExportJson(function (json) {
        navigator.clipboard.writeText(json).then(function () {
            showImportMessage('已复制到剪贴板', 'success');
        }).catch(function () {
            showImportMessage('复制失败，请重试', 'error');
        });
    });
}

function exportToFile() {
    getExportJson(function (json) {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quick-links-backup.json';
        a.click();
        URL.revokeObjectURL(url);
        showImportMessage('已导出到文件', 'success');
    });
}

function handleImportData(data) {
    if (!data || !data.links || !Array.isArray(data.links)) {
        showImportMessage('JSON 格式错误：缺少 links 数组', 'error');
        return;
    }

    // 验证链接格式
    for (const link of data.links) {
        if (!link.name || !link.url) {
            showImportMessage('JSON 格式错误：链接缺少 name 或 url', 'error');
            return;
        }
    }

    // 保存并更新（自动补齐缺失的图标字段）
    const links = data.links.map(normalizeLink);
    storage.set({ 'quickLinks': links }, function () {
        renderLinks(links);
        showImportMessage('导入成功！', 'success');
        setTimeout(closeSettingsModal, 1500);
    });
}

function showImportMessage(text, type) {
    importMessage.textContent = text;
    importMessage.className = 'import-message ' + type;
    importMessage.style.display = 'block';
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function () {
    // 初始化主题管理器
    themeManager.init();

    // 初始化配色方案管理器
    schemeManager.init();

    // 初始化快捷键与打开方式
    loadOpenBehavior();
    shortcutManager.init();

    // 加载保存的搜索引擎选择
    storage.get('searchEngine', function (data) {
        if (data.searchEngine) {
            const savedUrl = data.searchEngine;
            const index = engines.findIndex(e => e.url === savedUrl);
            if (index !== -1) {
                currentEngineIndex = index;
            }
        }
        updateEngineIcon();
    });

    // 绑定搜索引擎切换事件（原生按钮自带 Enter/Space 触发 click）
    const engineSelector = document.getElementById('engine-selector');
    if (engineSelector) {
        engineSelector.addEventListener('click', toggleEngine);
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
