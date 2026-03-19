# 极简新标签页美化实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复快捷链接重复 bug，并美化页面视觉效果（柔和阴影、精致边框、微过渡动画）

**Architecture:** 
- 修复 script.js 中的事件处理逻辑，通过 modal 状态标记区分编辑/新增模式
- 更新 styles.css 中的阴影、边框、过渡动画样式

**Tech Stack:** 纯 HTML5 + CSS3 + Vanilla JavaScript，无构建工具

---

## Chunk 1: 修复快捷链接重复 Bug

**文件:**
- 修改: `script.js:553-612` (attachContextMenu 函数)

### 修复方案

用 data 属性标记当前模式，避免 onclick 叠加：

```javascript
// 在 modal 上设置模式标记
// modal.dataset.mode = 'add' 或 'edit'
// modal.dataset.editingIndex 存储正在编辑的索引

// 保存按钮的 handler 改为单一函数，内部判断模式
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
            let links = data.quickLinks || defaultLinks;
            
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
```

**改动点：**
1. 删除 `defaultSaveHandler` 和 `updateHandler` 的双 handler 模式
2. 右键编辑时设置 `modal.dataset.mode = 'edit'` 和 `modal.dataset.editingIndex`
3. 点击添加按钮时设置 `modal.dataset.mode = 'add'`
4. 保存按钮始终绑定 `handleSaveLink`

### 验证方式
1. 打开新标签页
2. 右键已有链接，选择编辑
3. 修改名称，点击保存
4. 确认链接只出现一次，且内容已更新

---

## Chunk 2: 搜索框美化

**文件:**
- 修改: `styles.css:123-202`

### 改动内容

```css
/* 搜索框容器 */
.search-wrapper {
    /* 保持现有 backdrop-filter */
    /* 调整边框 */
    border: 0.5px solid var(--c-input-border);
    box-shadow: 0 0 0 1px rgba(0, 122, 255, 0.05); /* 柔和外发光 */
}

/* 聚焦状态：添加柔和光晕 */
.search-wrapper:focus-within {
    border: 1px solid var(--c-input-focus-border);
    box-shadow: 
        0 0 0 2px rgba(0, 122, 255, 0.15),
        0 4px 16px rgba(0, 122, 255, 0.08);
}
```

### 验证方式
1. 打开新标签页
2. 点击搜索框，查看聚焦时的光晕效果
3. 切换浅色/深色模式，确认效果一致

---

## Chunk 3: 快捷链接图标美化

**文件:**
- 修改: `styles.css:230-304`

### 改动内容

```css
/* 快捷链接图标：多层柔和阴影 */
.quick-link-icon {
    box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.08),
        0 4px 16px rgba(0, 0, 0, 0.04);
    border: 0.5px solid var(--c-border);
    transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);
}

/* Hover：阴影加深，微放大 */
.quick-link:hover .quick-link-icon {
    transform: scale(1.05);
    box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.12),
        0 8px 24px rgba(0, 0, 0, 0.08);
}
```

### 验证方式
1. Hover 快捷链接，查看阴影过渡和放大效果
2. 确认动画流畅无卡顿

---

## Chunk 4: 添加按钮美化

**文件:**
- 修改: `styles.css:315-327`

### 改动内容

```css
/* 添加按钮 */
.add-link-button {
    border: 1px dashed rgba(128, 128, 128, 0.4);
    background: rgba(128, 128, 128, 0.05);
    transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);
}

.add-link-button:hover {
    border-color: rgba(128, 128, 128, 0.8);
    background: rgba(128, 128, 128, 0.1);
}
```

---

## Chunk 5: 主题切换按钮美化

**文件:**
- 修改: `styles.css:796-818`

### 改动内容

```css
/* 主题切换按钮 */
.theme-toggle {
    border: 0.5px solid var(--c-theme-toggle-border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);
}

.theme-toggle:hover {
    box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.15),
        0 2px 8px rgba(0, 0, 0, 0.1);
    transform: scale(1.05);
}
```

---

## Chunk 6: 弹窗美化

**文件:**
- 修改: `styles.css:353-376` (modal-content)

### 改动内容

```css
/* 弹窗：更大圆角 + 多层柔和阴影 */
.modal-content {
    border-radius: 24px;
    box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 2px 8px rgba(0, 0, 0, 0.08);
    border: 0.5px solid var(--c-border);
}
```

---

## 验证清单

- [ ] 快捷链接编辑后不再重复
- [ ] 搜索框聚焦有柔和光晕效果
- [ ] 快捷链接 hover 阴影过渡自然
- [ ] 主题切换按钮 hover 动效流畅
- [ ] 弹窗阴影层次分明
- [ ] 浅色/深色模式样式一致
