# 像素工坊：智能抠图与证件照

这是把「本地抠图工具」与「证件照工具 V1.2.2」整合后的 GitHub Pages 目录（整合验收版 26091003）。
入口只有一个：`index.html`。

## 功能

- 智能抠图：批量导入、自动去背景、SlimSAM 点选/框选修补、换背景、边缘处理、PNG/WebP/JPEG/ZIP 导出。
- 证件照：人脸定位、常用规格、自定义尺寸、红白蓝底、位置与美化微调、大小限制、批量规格/底色导出。
- 打印排版：4R、A6、A5、A4，相纸横竖向、照片横竖向、300 DPI 导出。
- 工作流互通：抠图结果可直接“送到证件照”；证件照成品也可送回抠图工作台。
- 隐私：照片只在浏览器本地处理，不上传服务器。

## 目录

```text
index.html                 统一入口
apps/                      两个功能工作台
assets/                    统一界面资源与测试图
vendor/                    固定版本的浏览器运行库
models/                    本地模型权重与配置
  briaai/RMBG-1.4/         自动抠图
  Xenova/slimsam-77-uniform/ 交互修补
  Xenova/swin2SR-.../      低清照片增强
  face-api/                人脸检测与关键点
  docs/resource-manifest.json  来源、大小、SHA-256
```

## GitHub Pages 部署

1. 把本目录内容提交到仓库根目录；不要只上传 `index.html`。
2. 仓库 Settings → Pages → Deploy from a branch，选择发布分支和根目录。
3. 等待部署完成后打开 Pages 地址。
4. 模型最大单文件约 44.4 MB，低于 GitHub 普通文件 100 MB 上限；整个发布目录约 110 MB，首次访问会下载对应模型。
5. GitHub Pages 必须保持当前相对目录层级，否则模型路径会失效。

## 本地预览

ES Module、Worker、WASM 和模型文件不能可靠地通过 `file://` 双击运行，请使用 HTTP 服务打开。例如在本目录执行：

```bash
python -m http.server 8766
```

然后访问 `http://127.0.0.1:8766/`。
如果浏览器控制台提示 `WebAssembly.instantiate()` 被 CSP 拦截，请确认当前地址是 `http://` 或 `https://`，且承载页面的 `script-src` 允许 `wasm-unsafe-eval`（旧版浏览器可用 `unsafe-eval`）。这不是模型文件缺失；本目录的页面已内置兼容 CSP 声明，但 Tokeny/浏览器扩展等外层沙箱的 CSP 无法由网页自行放宽，需改用普通浏览器窗口访问本地 HTTP 服务或 GitHub Pages 地址。

## 模型与许可提醒

- BRIA RMBG-1.4：官方模型卡声明仅限非商业用途，商业使用需向 BRIA 购买许可。
- SlimSAM ONNX：Apache-2.0。
- 其他运行库与模型的来源见 `THIRD-PARTY-NOTICES.md` 和 `docs/resource-manifest.json`。
- 在公开 GitHub 仓库重新分发模型权重前，请再次核对各模型最新许可；若许可不允许再分发，应把对应权重移出仓库并改用原始来源下载。

## 固定版本

资源清单记录了下载源、上游 commit/version、字节数和 SHA-256，可用于长期备份和完整性核验。
当前整合版日期：2026-09-11，验收批次：26091003；发布整理修订：26091104。
## 界面调整（26091003）

- 统一改为中性蓝灰与深蓝强调色，去除原先偏紫/粉的装饰感。
- 移除抠图结果区与证件照页面中的个人品牌、二维码和宣传文案。

- 证件照新增按当前规格比例裁切：可开启锁定比例裁切，调整上下取景与裁切放大，解决人物上下留白比例不合适的问题；该调整只影响成品，不改原图。
