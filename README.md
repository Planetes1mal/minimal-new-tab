# 极简新标签页插件

[English](docs/README.en.md) | 中文

[![License：MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个极简风格的新标签页扩展，适用于 Chrome 与 Microsoft Edge。

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

### 搜索功能
- 在搜索框中输入关键词
- 点击左侧图标切换搜索引擎（谷歌/必应）
- 按回车键或点击搜索图标进行搜索

### 快速链接管理
- **添加链接**：点击"+"按钮，填写名称和网址
- **编辑链接**：右键点击现有链接进行编辑
- **删除链接**：悬停在链接上，点击出现的"×"按钮
- **图标选择**：
  - 极简生成：使用网站名称首字母
  - 网站默认：自动获取网站favicon
  - 指定URL：手动输入图标地址

### 主题切换
- 点击右下角的图标
- 支持浅色模式、深色模式、跟随系统
- 设置会自动保存

## 🛠️ 技术特性

### 现代化技术栈
- **纯原生技术**：HTML5 + CSS3 + JavaScript
- **CSS变量**：完整的主题系统
- **性能优化**：轻量级，快速加载

### 浏览器兼容性
- ✅ Chrome 88+
- ✅ Microsoft Edge 88+

### 权限说明
- `storage`：保存用户设置和快速链接
- `activeTab`：新标签页访问权限

## 📁 项目结构

```
minimal-new-tab/
├── manifest.json         # 扩展配置文件
├── newtab.html           # 新标签页HTML
├── styles.css            # 样式文件（包含主题系统）
├── script.js             # JavaScript逻辑
├── icons/                # 图标资源
│   ├── google.svg        # 谷歌图标
│   ├── bing.svg          # 必应图标
│   ├── search.svg        # 搜索图标
│   ├── sun.svg           # 太阳图标
│   ├── moon.svg          # 月亮图标
│   └── icons/  
│       └── icon*.png     # 扩展图标
├── docs/                 # 文档
│   └── README.en.md      # 英文文档
└── README.md             # 中文文档
```

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) 开源。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

如果你更习惯英文文档，请查看 [README.en.md](docs/README.en.md)。
