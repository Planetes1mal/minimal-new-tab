// 显示时间和日期
function updateDateTime() {
    const now = new Date();

    // 更新时间
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('time').textContent = `${hours}:${minutes}`;

    // 更新日期
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[now.getDay()];
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

// 从存储中加载链接或使用默认链接
function loadLinks() {
    storage.get('quickLinks', function (data) {
        let links = data.quickLinks || defaultLinks;
        renderLinks(links);
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

        // 创建图标 (使用链接的第一个字母作为图标)
        const iconElement = document.createElement('div');
        iconElement.className = 'quick-link-icon';
        iconElement.textContent = link.name.charAt(0).toUpperCase();

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
}

// 删除链接
function deleteLink(index) {
    storage.get('quickLinks', function (data) {
        let links = data.quickLinks || defaultLinks;
        links.splice(index, 1);
        saveLinks(links);
    });
}

// 添加链接模态框
const modal = document.getElementById('add-link-modal');
const addLinkButton = document.getElementById('add-link-button');
const closeButton = document.querySelector('.close');
const saveLinkButton = document.getElementById('save-link');

// 打开模态框
addLinkButton.onclick = function (e) {
    e.preventDefault(); // 阻止链接默认行为
    modal.style.display = 'block';
    document.getElementById('link-name').value = '';
    document.getElementById('link-url').value = '';
};

// 关闭模态框
closeButton.onclick = function () {
    modal.style.display = 'none';
};

// 点击模态框外部关闭
window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// 保存新链接
saveLinkButton.onclick = function () {
    const linkName = document.getElementById('link-name').value.trim();
    let linkUrl = document.getElementById('link-url').value.trim();

    if (linkName && linkUrl) {
        // 确保URL格式正确
        if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
            linkUrl = 'https://' + linkUrl;
        }

        storage.get('quickLinks', function (data) {
            let links = data.quickLinks || defaultLinks;
            links.push({ name: linkName, url: linkUrl });
            saveLinks(links);
            modal.style.display = 'none';
        });
    }
};

// 初始化页面
document.addEventListener('DOMContentLoaded', function () {
    // 加载保存的搜索引擎选择
    storage.get('searchEngine', function (data) {
        if (data.searchEngine) {
            document.getElementById('search-engine').value = data.searchEngine;
        }
    });

    // 保存搜索引擎选择
    document.getElementById('search-engine').addEventListener('change', function () {
        storage.set({ 'searchEngine': this.value });
    });

    // 加载快速链接
    loadLinks();
}); 