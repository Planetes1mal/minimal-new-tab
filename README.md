# 极简新标签页

一个极简的新标签页扩展，适用于 Chrome 与 Microsoft Edge。

## 安装

1. 克隆仓库：`git clone https://github.com/Planetes1mal/minimal-new-tab.git`
2. 打开 `chrome://extensions/`（或 `edge://extensions/`）
3. 启用开发者模式，点击「加载已解压的扩展程序」，选择项目根目录
4. 新开标签页即可使用

## 功能

- 时钟与日期，支持 12 / 24 小时制
- 搜索：Google / Bing 切换，按 `/` 聚焦搜索框
- 快捷链接：添加、编辑、删除、拖拽排序，站点品牌色圆点
- 配色方案：森绿（默认）、碧蓝、琥珀、岩墨，均含浅色与深色变体
- 主题：浅色、深色、跟随系统
- 设置：链接管理、备份导入导出、可自定义快捷键、关于

## 开发

```text
minimal-new-tab/
├── manifest.json    # 扩展配置（Manifest V3）
├── newtab.html      # 新标签页
├── styles.css       # 样式（CSS 变量 + 配色方案）
├── script.js        # 全部逻辑
├── icons/           # 图标
└── CONTEXT.md       # 领域术语表
```

修改后在 `chrome://extensions/` 点击「重新加载」即可生效。

## 许可

[MIT](LICENSE)
