# PlanTool

一个基于原生 HTML、CSS、JavaScript 的离线个人学习与任务规划工具。

## 本地运行

直接在浏览器中打开 `index.html` 即可使用。所有数据保存在浏览器的 `localStorage` 中，支持下载 JSON 备份与导入恢复。

## 在线访问

公开访问地址：[PlanTool 网页](https://daybreak352.github.io/PlanTool/)。当前视觉版从 `流浪地球分支` 根目录发布；原始版本在 `main`，上一版科幻设计在 `codex/sci-fi-redesign`。在 GitHub 仓库的 Settings → Pages 可以切换发布分支。

每位访问者的数据只保存在自己的浏览器中，不会自动同步给其他人或其他设备。需要换设备时，先下载 JSON 备份，再在新设备导入。

当前原型包含：总览、番茄专注计时、备忘录、每日任务、项目进展与统计。知识树和知识库的页面、入口及功能已移除；旧浏览器数据或备份中的历史字段会保留，不参与新界面运作。

新界面依据用户提供的三张视觉模板绘制：主页使用原创行星背景，专注和日程页使用本地 SVG 几何素材。NASA Eyes 式的 UEG 启动动画可跳过，不会读取或修改学习数据；系统开启“减少动态效果”时会立即跳过。入场与页面切换均为轻量动画。

## 代码结构

```text
PlanTool/
├─ index.html              页面结构
├─ assets/
│  ├─ orbit-earth-hero.png 原创行星背景
│  ├─ engine-geometry.svg 专注页几何图形
│  └─ truss-field.svg     日程页结构背景
├─ docs/design-references.md 上一版设计参考记录
├─ js/
│  ├─ core.js              默认数据、状态与通用领域函数
│  ├─ views.js             各页面的 DOM 渲染
│  ├─ actions.js           计时器和数据变更操作
│  ├─ app.js               事件绑定与应用初始化
│  └─ boot.js              启动动画
└─ styles/
   ├─ base.css             设计变量、基础样式和顶部导航
   ├─ layout.css           页面骨架与通用组件布局
   ├─ pages.css            各业务模块样式
   ├─ responsive.css       响应式适配
   ├─ theme-engine.css     当前主题、组件与响应式
   └─ engine-motion.css    启动与轻量动效
```
