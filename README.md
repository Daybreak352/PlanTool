# PlanTool

一个基于原生 HTML、CSS、JavaScript 的离线个人学习与任务规划工具。

## 本地运行

直接在浏览器中打开 `index.html` 即可使用。所有数据保存在浏览器的 `localStorage` 中，支持下载 JSON 备份与导入恢复。

## 在线访问

公开访问地址：[PlanTool 网页](https://daybreak352.github.io/PlanTool/)。GitHub Pages 从 `main` 分支根目录发布；以后将修改推送到 `main`，网页会自动更新。

每位访问者的数据只保存在自己的浏览器中，不会自动同步给其他人或其他设备。需要换设备时，先下载 JSON 备份，再在新设备导入。

当前原型包含：总览、知识树、番茄专注计时、备忘录、每日任务、项目进展、统计与科学总库导入。

## 代码结构

```text
PlanTool/
├─ index.html              页面结构
├─ js/
│  ├─ core.js              默认数据、状态与通用领域函数
│  ├─ views.js             各页面的 DOM 渲染
│  ├─ actions.js           计时器和数据变更操作
│  └─ app.js               事件绑定与应用初始化
└─ styles/
   ├─ base.css             设计变量、基础样式和顶部导航
   ├─ layout.css           页面骨架与通用组件布局
   ├─ pages.css            各业务模块样式
   └─ responsive.css       响应式适配
```
