# 极简新标签页插件

[![License：MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个极简风格的新标签页扩展，适用于 Chrome 与 Microsoft Edge（Manifest V3）。

以搜索为视觉锚点的居中构图：大时钟与日期在上，柔和胶囊搜索在中，快捷链接启动器在下。纯原生 HTML/CSS/JS，无框架、无构建步骤。

## 🚀 安装方法

### 开发者模式安装（Chrome / Edge）

1. **下载项目**
   ```bash
   git clone https://github.com/Planetes1mal/minimal-new-tab.git
   cd minimal-new-tab
   ```

2. **打开扩展管理页**
   - Chrome：在地址栏输入 `chrome://extensions/`
   - Edge：在地址栏输入 `edge://extensions/`

3. **启用开发者模式**

4. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择本项目根目录

5. **开始使用**：新开一个标签页即可看到效果

## 📖 使用说明

### 搜索
- 在搜索框中输入关键词，按回车键或点击搜索图标
- 点击左侧图标在 Google / Bing 之间切换，选择会持久化
- 按 `/` 快速聚焦搜索框

### 快捷链接
- **添加**：点击启动器中的"＋"按钮，或进入设置 → 快捷链接
- **编辑**：右键点击链接，或点击设置列表中的行
- **删除**：悬停链接后点击删除按钮（也可在设置列表中删除）
- **排序**：拖拽链接到目标位置（启动器与设置列表均可，显示插入线），或使用键盘 `Alt` 以外的修饰键配合原生行为
- **图标**：品牌色圆点（已知站点）/ 域名稳定色（未知站点），不随配色方案变化

### 配色方案
- 设置 → 外观：森绿（默认）/ 碧蓝 / 琥珀 / 岩墨，每套方案自带浅色与深色变体
- 明暗切换：右下角主题按钮（浅色 / 深色 / 跟随系统）

### 设置
- 设置弹窗分区：通用（时间格式 12/24 小时、打开方式）、外观、快捷链接、备份（导入/导出 JSON）、快捷键、关于
- 快捷键可自定义：聚焦搜索、打开设置、切换主题、关闭弹窗

## 🛠️ 技术特性

### 现代化技术栈
- **纯原生技术**：HTML5 + CSS3 + JavaScript，无构建工具
- **CSS 变量**：完整主题系统 + 四套配色方案（每套含明暗两态）
- **可访问性**：键盘可达、可见焦点态、ARIA 语义、`prefers-reduced-motion` 支持
- **性能优化**：轻量级，快速加载，无远程依赖

### 浏览器兼容性
- ✅ Chrome 88+
- ✅ Microsoft Edge 88+

### 权限说明
- `storage`：保存用户设置和快捷链接

## 📁 项目结构

```
minimal-new-tab/
├── manifest.json       # 扩展配置（Manifest V3）
├── newtab.html         # 新标签页 HTML
├── styles.css          # 样式（CSS 变量 + 配色方案）
├── script.js           # 全部 JavaScript 逻辑
├── icons/              # 图标资源
├── CONTEXT.md          # 领域术语表
└── docs/               # 本地工作文档（技能配置、ADR，不入库）
```

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) 开源。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！
