# 孙宇晨 × 邵艾伦 · 访谈阅读器

按时间顺序浏览这场长谈：16 章、49 个话题、682 段完整对话。

- 点击话题查看核心内容、具体例子与完整对话。
- 支持全文搜索、主题筛选、视频时间定位、已读进度。
- 内置完整逐字稿，可直接阅读和下载；移动端自适应。
- 纯 HTML / CSS / JavaScript，无后端、无第三方依赖。

## GitHub Pages

网站文件位于 `docs/`。在仓库 **Settings → Pages** 中选择：

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/docs**

保存后，GitHub 会显示发布地址。后续更新 `main` 分支中的 `docs/` 会自动重新发布。

## 本地预览

需要 Node.js 18 或以上版本运行检查。网页本身不需要构建。

```bash
npm test
python3 -m http.server 8000 --directory docs
```

在浏览器打开 `http://localhost:8000`。请通过 HTTP 服务预览，避免浏览器限制本地文件的 ES module 加载。

## 更新文字稿

用对应文件替换 `docs/transcript.md`，再运行：

```bash
npm run build:transcript
npm test
```

该脚本会生成 `docs/transcript.js` 并检查对话数量与话题覆盖。目录与摘要位于 `docs/content.js`。

## 内容来源

- [完整访谈视频](https://www.youtube.com/watch?v=0Z-vhBvBmUY)
- [公开转写来源](https://github.com/LeoLee0812/sunyuchen-alan-interview)
- 本站全文基于用户提供的《完整逐字稿.md》，保留说话人、时间戳、原话及存疑标记。

问题标题和摘要为编辑转述；完整对话为转写文件原文，准确性应结合原视频核对。访谈版权归原作者所有。

阅读进度及另行导入的替换稿只存储在当前浏览器，不上传到服务器。
