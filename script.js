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
        const root = document.documentElement;
        const themeToggle = document.getElementById('theme-toggle');

        if (this.currentTheme === 'dark') {
            this.applyDarkTheme();
            themeToggle.classList.add('dark');
            themeToggle.classList.remove('light');
        } else if (this.currentTheme === 'light') {
            this.applyLightTheme();
            themeToggle.classList.add('light');
            themeToggle.classList.remove('dark');
        } else {
            // 跟随系统设置
            this.followSystemTheme();
            themeToggle.classList.remove('light', 'dark');
        }
    },

    // 应用深色主题
    applyDarkTheme() {
        const root = document.documentElement;
        root.style.setProperty('--c-bg', '#121212');
        root.style.setProperty('--c-surface', '#1e1e1e');
        root.style.setProperty('--c-surface-container', '#333333');
        root.style.setProperty('--c-text-primary', '#e0e0e0');
        root.style.setProperty('--c-text-secondary', '#a0a0a0');
        root.style.setProperty('--c-border', '#3a3a3a');
        root.style.setProperty('--c-accent', '#3399ff');
        root.style.setProperty('--c-input-bg', '#2a2a2a');
        root.style.setProperty('--c-input-border', '#3a3a3a');
        root.style.setProperty('--c-button-hover', '#404040');
        root.style.setProperty('--c-segment-bg', '#2a2a2a');
        root.style.setProperty('--c-segment-border', '#3a3a3a');
        root.style.setProperty('--c-segment-divider', '#4a4a4a');
        root.style.setProperty('--c-custom-url-bg', '#2a2a2a');
        root.style.setProperty('--c-custom-url-border', '#3a3a3a');
        root.style.setProperty('--c-theme-toggle-bg', '#333333');
        root.style.setProperty('--c-theme-toggle-border', '#3a3a3a');
        root.style.setProperty('--c-theme-toggle-hover', '#404040');
    },

    // 应用浅色主题
    applyLightTheme() {
        const root = document.documentElement;
        root.style.setProperty('--c-bg', '#ffffff');
        root.style.setProperty('--c-surface', '#ffffff');
        root.style.setProperty('--c-surface-container', '#f5f5f7');
        root.style.setProperty('--c-text-primary', '#1a1a1a');
        root.style.setProperty('--c-text-secondary', '#666666');
        root.style.setProperty('--c-border', '#e1e5e9');
        root.style.setProperty('--c-accent', '#007aff');
        root.style.setProperty('--c-input-bg', '#fafbfc');
        root.style.setProperty('--c-input-border', '#e1e5e9');
        root.style.setProperty('--c-button-hover', '#e5e5e7');
        root.style.setProperty('--c-segment-bg', '#f5f5f7');
        root.style.setProperty('--c-segment-border', '#e1e5e9');
        root.style.setProperty('--c-segment-divider', '#d1d5db');
        root.style.setProperty('--c-custom-url-bg', '#f8f9fa');
        root.style.setProperty('--c-custom-url-border', '#e9ecef');
        root.style.setProperty('--c-theme-toggle-bg', '#f5f5f7');
        root.style.setProperty('--c-theme-toggle-border', '#e1e5e9');
        root.style.setProperty('--c-theme-toggle-hover', '#e5e5e7');
    },

    // 跟随系统主题
    followSystemTheme() {
        // 移除所有手动设置的样式，让CSS媒体查询生效
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);

        // 检查系统是否处于深色模式
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (isDarkMode) {
            this.applyDarkTheme();
        } else {
            this.applyLightTheme();
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

// 显示时间和日期
function updateDateTime() {
    const now = new Date();

    // 更新时间
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeEl = document.getElementById('time');
    // 使用可单独控制的冒号元素，便于动画
    timeEl.innerHTML = `${hours}<span class="colon">:</span>${minutes}`;

    // 更新日期
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[now.getDay()];

    // 更优雅的日期格式：2024年8月20日 周二
    document.getElementById('date').textContent = `${year}年${month}月${day}日 ${weekday}`;
}

// 每秒更新一次时间
updateDateTime();
setInterval(updateDateTime, 1000);

// 处理搜索功能
document.getElementById('search-button').addEventListener('click', performSearch);
document.getElementById('search-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// 根据单选切换，自定义 URL 输入框显示状态
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
    }
});

function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchEngine = document.getElementById('search-engine');

    if (searchInput.value.trim() !== '') {
        const searchUrl = searchEngine.value + encodeURIComponent(searchInput.value.trim());
        window.open(searchUrl, '_blank');
    }
}

// 快速链接管理
const defaultLinks = [
    { name: '微博', url: 'https://weibo.com' },
    { name: '知乎', url: 'https://zhihu.com' },
    { name: '哔哩哔哩', url: 'https://bilibili.com' }
];

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

// 从存储中加载链接或使用默认链接，并补齐缺失的图标字段
function loadLinks() {
    storage.get('quickLinks', function (data) {
        let links = data.quickLinks || defaultLinks;

        // 为缺少 icon/iconMode 的项补充，并在有变更时保存
        let mutated = false;
        links = links.map(link => {
            const next = { ...link };
            if (!next.iconMode) {
                next.iconMode = 'favicon';
                mutated = true;
            }
            if (!next.icon && next.iconMode === 'favicon') {
                next.icon = deriveFaviconUrl(next.url);
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

        // 创建图标：优先 favicon 图片，失败回退到首字母
        const iconElement = document.createElement('div');
        iconElement.className = 'quick-link-icon';
        if (link.icon && link.iconMode !== 'letter') {
            const img = document.createElement('img');
            img.src = link.icon;
            img.alt = link.name;

            // 设置加载超时（3秒）
            const timeoutId = setTimeout(() => {
                // 超时后回退为首字母
                iconElement.innerHTML = '';
                iconElement.textContent = link.name.charAt(0).toUpperCase();
            }, 3000);

            img.onload = function () {
                // 加载成功，清除超时
                clearTimeout(timeoutId);
            };

            img.onerror = function () {
                // 图片加载失败时回退为首字母
                clearTimeout(timeoutId);
                iconElement.innerHTML = '';
                iconElement.textContent = link.name.charAt(0).toUpperCase();
            };

            iconElement.appendChild(img);
        } else {
            iconElement.textContent = link.name.charAt(0).toUpperCase();
        }

        // 创建名称
        const nameElement = document.createElement('div');
        nameElement.className = 'quick-link-name';
        nameElement.textContent = link.name;

        // 创建删除按钮
        const deleteElement = document.createElement('div');
        deleteElement.className = 'delete-link';
        deleteElement.textContent = '×';
        deleteElement.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            deleteLink(index);
        };

        linkElement.appendChild(iconElement);
        linkElement.appendChild(nameElement);
        linkElement.appendChild(deleteElement);
        quickLinksContainer.appendChild(linkElement);
    });

    // 重新添加"添加"按钮
    quickLinksContainer.appendChild(addButton);

    // 建立右键编辑
    attachContextMenu(links);

    // 设置拖拽功能
    setupDragAndDrop();
}

// 设置拖拽功能
function setupDragAndDrop() {
    const quickLinksContainer = document.getElementById('quick-links');
    let draggedElement = null;
    let draggedIndex = null;

    // 为所有快捷链接添加拖拽事件监听器
    const linkElements = quickLinksContainer.querySelectorAll('a.quick-link');
    
    linkElements.forEach((linkElement, index) => {
        // 拖拽开始
        linkElement.addEventListener('dragstart', function(e) {
            draggedElement = this;
            draggedIndex = parseInt(this.dataset.index);
            
            // 设置拖拽效果
            this.style.opacity = '0.5';
            this.classList.add('dragging');
            
            // 设置拖拽数据
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.outerHTML);
        });

        // 拖拽结束
        linkElement.addEventListener('dragend', function(e) {
            this.style.opacity = '';
            this.classList.remove('dragging');
            
            // 清理所有拖拽相关的样式
            const allLinks = quickLinksContainer.querySelectorAll('a.quick-link');
            allLinks.forEach(link => {
                link.classList.remove('drag-over');
            });
            
            draggedElement = null;
            draggedIndex = null;
        });

        // 拖拽进入
        linkElement.addEventListener('dragenter', function(e) {
            if (draggedElement && draggedElement !== this) {
                e.preventDefault();
                this.classList.add('drag-over');
            }
        });

        // 拖拽悬停
        linkElement.addEventListener('dragover', function(e) {
            if (draggedElement && draggedElement !== this) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }
        });

        // 拖拽离开
        linkElement.addEventListener('dragleave', function(e) {
            // 只有当鼠标真正离开元素时才移除样式
            if (!this.contains(e.relatedTarget)) {
                this.classList.remove('drag-over');
            }
        });

        // 放置
        linkElement.addEventListener('drop', function(e) {
            if (draggedElement && draggedElement !== this) {
                e.preventDefault();
                
                const dropIndex = parseInt(this.dataset.index);
                
                // 交换位置
                swapLinks(draggedIndex, dropIndex);
                
                this.classList.remove('drag-over');
            }
        });
    });
}

// 交换链接位置
function swapLinks(fromIndex, toIndex) {
    storage.get('quickLinks', function(data) {
        let links = data.quickLinks || defaultLinks;
        
        // 交换数组中的元素
        if (fromIndex >= 0 && fromIndex < links.length && 
            toIndex >= 0 && toIndex < links.length && 
            fromIndex !== toIndex) {
            
            const temp = links[fromIndex];
            links[fromIndex] = links[toIndex];
            links[toIndex] = temp;
            
            // 保存更新后的链接顺序
            saveLinks(links);
        }
    });
}

// 删除链接
function deleteLink(index) {
    storage.get('quickLinks', function (data) {
        let links = data.quickLinks || defaultLinks;
        links.splice(index, 1);
        saveLinks(links);
    });
}

// 右键编辑：打开弹窗并写回
function attachContextMenu(links) {
    const quickLinksContainer = document.getElementById('quick-links');
    const linkNodes = quickLinksContainer.querySelectorAll('a.quick-link');
    linkNodes.forEach((node, idx) => {
        node.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            storage.get('quickLinks', function (data) {
                let all = data.quickLinks || defaultLinks;
                const current = all[idx];

                modal.style.display = 'block';
                document.getElementById('link-name').value = current.name || '';
                document.getElementById('link-url').value = current.url || '';
                const mode = current.iconMode || (current.icon ? 'favicon' : 'letter');
                if (mode === 'letter') {
                    document.getElementById('icon-letter').checked = true;
                } else if (mode === 'custom') {
                    document.getElementById('icon-custom').checked = true;
                } else {
                    document.getElementById('icon-favicon').checked = true;
                }
                const customContainer = document.getElementById('custom-url-container');
                const customInput = document.getElementById('icon-custom-url');
                if (customContainer && customInput) {
                    if (mode === 'custom') {
                        customContainer.classList.add('show');
                        customInput.value = current.icon || '';
                    } else {
                        customContainer.classList.remove('show');
                        customInput.value = '';
                    }
                }

                // 重设保存按钮为更新当前项
                const updateHandler = function () {
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
                        all[idx] = { name: linkName, url: linkUrl, iconMode, icon };
                        saveLinks(all);
                        closeModal();
                        // 恢复默认保存
                        saveLinkButton.onclick = defaultSaveHandler;
                    }
                };

                // 绑定更新处理函数
                saveLinkButton.onclick = updateHandler;
            });
        });
    });
}

// 添加链接模态框
const modal = document.getElementById('add-link-modal');
const addLinkButton = document.getElementById('add-link-button');
const closeButton = document.querySelector('.close-btn');
const cancelButton = document.getElementById('cancel-link');
const saveLinkButton = document.getElementById('save-link');

// 打开模态框
addLinkButton.onclick = function (e) {
    e.preventDefault(); // 阻止链接默认行为
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
};

// 关闭模态框
function closeModal() {
    modal.style.display = 'none';
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
    defaultSaveHandler();
});

// 保存新链接
// 默认保存处理函数，供编辑后恢复
function defaultSaveHandler() {
    const linkName = document.getElementById('link-name').value.trim();
    let linkUrl = document.getElementById('link-url').value.trim();
    const iconMode = document.querySelector('input[name="icon-mode"]:checked')?.value || 'favicon';
    const customIconUrl = document.getElementById('icon-custom-url')?.value.trim();

    if (linkName && linkUrl) {
        // 确保URL格式正确
        if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
            linkUrl = 'https://' + linkUrl;
        }

        storage.get('quickLinks', function (data) {
            let links = data.quickLinks || defaultLinks;
            let icon = '';
            if (iconMode === 'favicon') icon = deriveFaviconUrl(linkUrl);
            if (iconMode === 'custom' && customIconUrl) icon = customIconUrl;
            links.push({ name: linkName, url: linkUrl, iconMode, icon });
            saveLinks(links);
            closeModal();
        });
    }
}

// 绑定默认保存逻辑
saveLinkButton.onclick = defaultSaveHandler;

// 初始化页面
document.addEventListener('DOMContentLoaded', function () {
    // 初始化主题管理器
    themeManager.init();

    // 加载保存的搜索引擎选择
    storage.get('searchEngine', function (data) {
        if (data.searchEngine) {
            document.getElementById('search-engine').value = data.searchEngine;
            updateSearchEngineIcon();
        }
    });

    // 保存搜索引擎选择
    document.getElementById('search-engine').addEventListener('change', function () {
        storage.set({ 'searchEngine': this.value });
        updateSearchEngineIcon();
    });

    // 加载快速链接
    loadLinks();

    // 初始化一次图标（处理未保存过的默认值）
    updateSearchEngineIcon();

    // 初始化自定义下拉
    initEngineDropdown();
});

// 根据选择的搜索引擎切换下拉的图标样式
function updateSearchEngineIcon() {
    const select = document.getElementById('search-engine');
    const value = select.value || '';

    select.classList.remove('google', 'bing');
    if (value.includes('google')) {
        select.classList.add('google');
    } else if (value.includes('bing')) {
        select.classList.add('bing');
    }

    // 同步到自定义按钮图标
    const btnIcon = document.querySelector('.engine-dropdown .engine-icon');
    if (!btnIcon) return;
    btnIcon.classList.remove('google', 'bing');
    if (value.includes('google')) {
        btnIcon.classList.add('google');
    } else if (value.includes('bing')) {
        btnIcon.classList.add('bing');
    }
}

// 自定义下拉的行为
function initEngineDropdown() {
    const dropdown = document.getElementById('engine-dropdown');
    if (!dropdown) return;
    const list = dropdown.querySelector('.engine-list');
    const button = dropdown.querySelector('.engine-btn');
    const select = document.getElementById('search-engine');

    // 打开/关闭
    button.addEventListener('click', function () {
        const willOpen = !list.classList.contains('open');
        document.querySelectorAll('.engine-list.open').forEach(el => el.classList.remove('open'));
        list.classList.toggle('open', willOpen);
        button.setAttribute('aria-expanded', String(willOpen));
    });

    // 点击选项
    list.querySelectorAll('.engine-option').forEach(function (item) {
        item.addEventListener('click', function () {
            const value = this.getAttribute('data-value');
            select.value = value;
            storage.set({ 'searchEngine': value });
            updateSearchEngineIcon();
            list.classList.remove('open');
            button.setAttribute('aria-expanded', 'false');
        });
    });

    // 点击外部收起
    document.addEventListener('click', function (e) {
        if (!dropdown.contains(e.target)) {
            list.classList.remove('open');
            button.setAttribute('aria-expanded', 'false');
        }
    });

    // 根据当前 select 值设置初始图标
    updateSearchEngineIcon();
}