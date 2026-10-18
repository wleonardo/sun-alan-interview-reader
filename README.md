# 长谈阅读室 · 孙宇晨访谈目录

两场独立阅读器，共用一个 GitHub Pages 站点。

- `index.html`：访谈导航。旧的 `#topic-xx` / `#chapter-xx` 链接自动跳到第一场，保留查询参数与锚点。
- `alan.html`：孙宇晨 × 邵艾伦，2026-10-09，4:22:28。16 章、49 个话题、682 段完整对话，全文来自用户提供的逐字稿。
- `jinming.html`：孙宇晨 × 金明，《黄金时代》第二期，2026-10-16，公开视频 47:09。20 个顺序话题的**问题导读版，尚未内置完整对话**。
- 两场均支持搜索、主题筛选、展开、独立已读进度；第一场保留原来的全文搜索与视频时间定位。
- 纯 HTML / CSS / JavaScript，无后端、无第三方依赖。

网站：<https://wleonardo.github.io/sun-alan-interview-reader/>

## 第二场的范围与来源

- 原节目：<https://www.bilibili.com/video/BV1X6JX6sEYJ/>
- 文字来源：<https://www.bidclub.ai/e/justin-sun-deep-interview-btc-nasdaq-ai-20261016>
- 节目背景：<https://www.techflowpost.com/article/34662>
- 权利说明：<https://www.bidclub.ai/readme>
- B 站公开节目资料：<https://api.bilibili.com/x/web-interface/view?bvid=BV1X6JX6sEYJ>

2026-10-18 核验：B 站投稿者为金明 William Joy，`pubdate=1792142635`（2026-10-16），单个公开视频 `duration=2829` 秒。节目介绍的约 3.5 小时是录制时长，不能等同于已公开的片长或本站覆盖范围。BidClub 标注约 47 分钟，来源为 X video + ElevenLabs Scribe v2。

导读遵循转写正文的对话顺序，略过开头预告拼接；不是其重排过的摘要目录。未取得分题时间戳，所以只用顺序编号，不虚构视频定位。问题标题和短摘要是编辑概括；“编辑阅读提示”是独立评论，不冒充访谈对话。所有仓位、操作、技术预测和项目计划均作为受访者表述呈现，并未独立验证。

没有取得第三方全文的再发布许可，故未复制全文。可在第二场页面临时导入自己的 UTF-8 TXT / MD / SRT / VTT（最大 8 MB），安全地以纯文本显示、分页和搜索；不会自动分配到话题，不上传，不持久保存，刷新后清除。获得可使用的逐字稿后，可进一步补齐逐题全文。

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

## 更新第一场文字稿

用对应文件替换 `docs/transcript.md`，再运行：

```bash
npm run build:transcript
npm test
```

该脚本会生成 `docs/transcript.js` 并检查对话数量与话题覆盖。第一场目录与摘要位于 `docs/content.js`，第二场导读位于 `docs/jinming-content.js`。

## 第一场内容来源

- [完整访谈视频](https://www.youtube.com/watch?v=0Z-vhBvBmUY)
- [公开转写来源](https://github.com/LeoLee0812/sunyuchen-alan-interview)
- 本站全文基于用户提供的《完整逐字稿.md》，保留说话人、时间戳、原话及存疑标记。

问题标题和摘要为编辑转述；完整对话为转写文件原文，准确性应结合原视频核对。访谈版权归原作者所有。

两场的阅读进度键分别为 `longtalk-001-read-v1` 与 `longtalk-002-read-v1`；第一场原有 IndexedDB、全文和阅读进度均保持不变。第一场另行导入的替换稿只存储在当前浏览器，不上传。第二场临时导入仅在当前页面内存中保留。
