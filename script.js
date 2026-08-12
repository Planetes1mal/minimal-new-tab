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
                showSettingsSection('general');
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
                this.save();
                this.saveCurrentEngine();
                storage.remove('searchEngines');
            }

            callback && callback();
        });
    },

    // 保存引擎配置（customEngines + enabledEngines 两键）
    save(callback) {
        storage.set({
            customEngines: this.customEngines,
            enabledEngines: this.enabledIds
        }, callback);
    },

    // 保存当前引擎（searchEngine 键存引擎 id）
    saveCurrentEngine(callback) {
        storage.set({ searchEngine: this.currentEngineId }, callback);
    },

    // 选择引擎
    setEngine(id) {
        if (!this.getEngines().some(e => e.id === id)) return;
        this.currentEngineId = id;
        this.saveCurrentEngine(() => {
            updateEngineIcon();
            engineMenu.close();
        });
    },

    // 循环切换到下一个启用引擎（≤2 个时使用）
    cycleEngine() {
        const engines = this.getEngines();
        if (engines.length < 2) return;
        const currentIndex = engines.findIndex(e => e.id === this.currentEngineId);
        const next = engines[(currentIndex + 1) % engines.length];
        this.currentEngineId = next.id;
        this.saveCurrentEngine(() => {
            updateEngineIcon();
        });
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
            if (this.element.classList.contains('open') &&
                !this.element.contains(e.target) &&
                !document.getElementById('engine-selector').contains(e.target)) {
                this.close();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.element.classList.contains('open')) {
                this.close();
            }
        });
    },

    render() {
        const engines = engineManager.getEngines();
        this.element.innerHTML = '';
        engines.forEach((engine, index) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'engine-menu-item' +
                (engine.id === engineManager.currentEngineId ? ' active' : '');
            item.setAttribute('role', 'menuitem');
            item.setAttribute('aria-label', engine.label);
            item.setAttribute('aria-current', String(engine.id === engineManager.currentEngineId));
            item.appendChild(this.buildIcon(engine));
            const name = document.createElement('span');
            name.textContent = engine.label;
            item.appendChild(name);
            item.addEventListener('click', () => {
                engineManager.setEngine(engine.id);
            });
            item.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const offset = e.key === 'ArrowRight' ? 1 : -1;
                    const nextIndex = (index + offset + engines.length) % engines.length;
                    this.element.querySelectorAll('.engine-menu-item')[nextIndex].focus();
                }
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

    // 在引擎按钮下方打开菜单
    open() {
        this.render();
        const selector = document.getElementById('engine-selector');
        const rect = selector.getBoundingClientRect();
        this.element.classList.add('open');
        this.element.style.left = `${rect.left}px`;
        this.element.style.top = `${rect.bottom + 6}px`;
        const firstItem = this.element.querySelector('.engine-menu-item');
        if (firstItem) firstItem.focus();
    },

    close() {
        this.element.classList.remove('open');
    },

    toggle() {
        if (this.element.classList.contains('open')) {
            this.close();
        } else {
            this.open();
        }
    }
};

// 更新搜索引擎图标与可读文本（title / aria-label）
function updateEngineIcon() {
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
        const label = `切换搜索引擎，当前为 ${engine.label}`;
        engineSelector.setAttribute('aria-label', label);
        engineSelector.title = label;
    }
}

// 引擎按钮点击：≤2 个启用引擎时循环切换，3+ 个时弹出菜单
function handleEngineClick() {
    const engines = engineManager.getEngines();
    if (engines.length <= 2) {
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
    },

    // 删除键（迁移时清理旧数据）
    remove: function (key, callback) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            // chrome.storage 用 undefined 值删除键
            chrome.storage.sync.set({ [key]: undefined }, callback);
        } else {
            try {
                localStorage.removeItem(key);
                if (callback) callback();
            } catch (e) {
                console.error('Error removing data from localStorage', e);
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

    // 同步设置导航的链接数量徽标
    updateLinksBadge(links.length);

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
    general: document.getElementById('nav-general'),
    appearance: document.getElementById('nav-appearance'),
    links: document.getElementById('nav-links'),
    backup: document.getElementById('nav-backup'),
    shortcuts: document.getElementById('nav-shortcuts'),
    about: document.getElementById('nav-about')
};
const settingsSections = {
    general: document.getElementById('general-section'),
    appearance: document.getElementById('appearance-section'),
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

// 设置导航浮动高亮指示条：跟随选中/悬停项（220ms 过渡）
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
                    this.moveToActive();
                }
            });
            item.addEventListener('blur', () => {
                if (this.hoveredId === item.id) {
                    this.hoveredId = null;
                    this.moveToActive();
                }
            });
        });
        this.nav.addEventListener('mouseleave', () => {
            this.hoveredId = null;
            this.moveToActive();
        });

        this.moveToActive();
    },

    moveTo(item) {
        const navRect = this.nav.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        this.indicator.style.top = `${itemRect.top - navRect.top}px`;
        this.indicator.style.height = `${itemRect.height}px`;
    },

    moveToActive() {
        const active = this.nav.querySelector('.settings-nav-item.active');
        if (active) {
            this.moveTo(active);
        }
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

// 切换设置分区：通用 / 外观 / 快捷链接 / 备份 / 快捷键 / 关于
function showSettingsSection(sectionName) {
    Object.keys(settingsNavItems).forEach(key => {
        const active = key === sectionName;
        settingsNavItems[key].classList.toggle('active', active);
        settingsNavItems[key].setAttribute('aria-selected', String(active));
        settingsSections[key].hidden = !active;
    });
    settingsNavIndicator.moveToActive();

    if (sectionName === 'appearance') {
        schemeManager.updateSchemeCards();
    } else if (sectionName === 'general') {
        updateHourFormatControl();
        updateOpenBehaviorControl();
        renderEngineSettings();
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
        showSettingsSection('general');
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

// 设置区：渲染引擎启用列表（内置固定在前，自定义按创建顺序）
function renderEngineSettings() {
    const list = document.getElementById('engine-list');
    if (!list) return;
    list.innerHTML = '';

    const all = [
        ...BUILTIN_ENGINES.map(e => ({ ...e, custom: false })),
        ...engineManager.customEngines.map(e => ({ ...e, custom: true }))
    ];

    all.forEach(engine => {
        const row = document.createElement('label');
        row.className = 'engine-row';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = engineManager.enabledIds.includes(engine.id);
        checkbox.setAttribute('aria-label', `启用 ${engine.label}`);
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                engineManager.enabledIds.push(engine.id);
            } else {
                // 至少保留一个启用引擎
                if (engineManager.enabledIds.length <= 1) {
                    checkbox.checked = true;
                    return;
                }
                engineManager.enabledIds = engineManager.enabledIds.filter(id => id !== engine.id);
                if (engineManager.currentEngineId === engine.id) {
                    engineManager.currentEngineId = engineManager.getEngines()[0].id;
                }
            }
            engineManager.save(() => {
                updateEngineIcon();
                renderEngineSettings();
            });
        });

        const label = document.createElement('span');
        label.className = 'engine-label';
        label.textContent = engine.label;

        const urlPreview = document.createElement('span');
        urlPreview.className = 'engine-url-preview';
        urlPreview.textContent = engine.url.replace('{q}', '…');

        row.appendChild(checkbox);
        row.appendChild(label);
        row.appendChild(urlPreview);

        if (engine.custom) {
            const actions = document.createElement('span');
            actions.className = 'settings-link-actions';

            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'settings-link-action edit';
            editButton.setAttribute('aria-label', `编辑 ${engine.label}`);
            editButton.innerHTML = EDIT_ICON_SVG;
            editButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openEngineEditor('edit', engine.id);
            });

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'settings-link-action delete';
            deleteButton.setAttribute('aria-label', `删除 ${engine.label}`);
            deleteButton.innerHTML = DELETE_ICON_SVG;
            deleteButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                engineManager.customEngines = engineManager.customEngines.filter(c => c.id !== engine.id);
                engineManager.enabledIds = engineManager.enabledIds.filter(id => id !== engine.id);
                if (!engineManager.getEngines().some(en => en.id === engineManager.currentEngineId)) {
                    engineManager.currentEngineId = engineManager.getEngines()[0].id;
                }
                engineManager.save(() => {
                    updateEngineIcon();
                    renderEngineSettings();
                });
            });

            actions.appendChild(editButton);
            actions.appendChild(deleteButton);
            row.appendChild(actions);
        }

        list.appendChild(row);
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
    engineModal.style.display = 'block';
}

function closeEngineModal() {
    engineModal.style.display = 'none';
    delete engineModal.dataset.editingId;
}

// 保存自定义引擎：名称必填，URL 必须包含 {q} 占位符
function handleSaveEngine() {
    const name = document.getElementById('engine-name').value.trim();
    const url = document.getElementById('engine-url').value.trim();

    if (!name) {
        document.getElementById('engine-name').focus();
        return;
    }
    if (!url || !url.includes('{q}')) {
        document.getElementById('engine-url').focus();
        return;
    }

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
    document.getElementById('save-engine').addEventListener('click', handleSaveEngine);

    const addEngineBtn = document.getElementById('settings-add-engine');
    if (addEngineBtn) {
        addEngineBtn.addEventListener('click', () => openEngineEditor('add'));
    }
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
