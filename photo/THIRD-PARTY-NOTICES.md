# 第三方资源说明

本项目仅整合浏览器端工作流。第三方代码、模型及权重仍归各自权利人所有，请分别遵守其许可证。

## 模型

### BRIA RMBG-1.4

- 用途：自动背景移除。
- 来源：`briaai/RMBG-1.4`。
- 固定提交：`2ceba5a5efaec153162aedea169f76caf9b46cf8`。
- 官方模型卡：该模型为 source-available，非商业用途可用；商业用途需另购许可。
- 许可链接：`https://bria.ai/bria-huggingface-model-license-agreement/`。
- 重要：公开再分发及商业部署前，应以 BRIA 当时有效的完整许可文本为准。

### SlimSAM 77 Uniform（Transformers.js ONNX）

- 用途：点击、框选和局部蒙版修补。
- 来源：`Xenova/slimsam-77-uniform`。
- 固定提交：`5850ab45f587c112167512ffef949107115e26a0`。
- 许可证：Apache-2.0。

### Swin2SR Real-world x4（Transformers.js ONNX）

- 用途：极低清照片的 4 倍增强。
- 来源：`Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr`。
- 固定提交：`d0e9926970c93e472ce2392373d72597fc849027`。
- 模型仓未在元数据中明确标注许可证；公开再分发前请复核上游基础模型许可。

### face-api.js 模型权重

- 用途：Tiny Face Detector 人脸检测、68 点关键点定位。
- 来源：`justadudewhohacks/face-api.js` 的 weights 目录。
- 代码库许可证：MIT；模型权重的具体再分发条件应以上游仓库说明为准。

## 浏览器运行库

| 组件 | 版本 | 用途 | 许可证 |
|---|---:|---|---|
| `@huggingface/transformers` | 3.8.1 | ONNX/WebGPU/WASM 模型推理 | Apache-2.0 |
| `face-api.js` | 0.22.2 | 人脸检测与关键点 | MIT |
| `JSZip` | 3.10.1 | ZIP 打包导出 | MIT 或 GPL-3.0-or-later |
| ONNX Runtime Web | 随 Transformers.js 3.8.1 | WASM/WebGPU 执行 | MIT |

## 完整性

`docs/resource-manifest.json` 逐项保存：

- 本地相对路径；
- 下载来源；
- 固定版本或上游提交；
- 文件字节数；
- SHA-256。

上传 GitHub 前建议保留本文件与资源清单，并在网页页脚或仓库 README 中保留模型来源说明。
