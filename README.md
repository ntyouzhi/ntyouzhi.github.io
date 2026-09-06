# 个人网页导航首页

## 使用方式

将 `index.html` 与 `works.json` 一起放到 GitHub 仓库根目录（与其他 HTML 文件同级）。访问 `https://code.ntcyz.cn/` 即可看到导航首页。

## 后续添加作品

1. 将新的 `.html` 文件上传到仓库根目录。
2. 打开 `works.json`，在 `works` 数组中增加一项：
   - `file`：文件名（必须与仓库中的实际文件名一致）
   - `title`：首页显示的作品名
   - `desc`：一句话简介
   - `tag`：分类标签
   - `color`：卡片顶部色彩，可选
3. 提交后刷新首页即可。作品会在新标签页打开，链接固定拼接为 `https://code.ntcyz.cn/` + `file`；如作品位于子目录，可将 `file` 写成 `目录名/index.html`。

首页具备：作品搜索、响应式布局、新标签页打开，以及 `works.json` 加载失败时的内置清单兜底。
