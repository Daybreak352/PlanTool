# 科幻界面设计参考

本次改版研究了十个公开网站。以下是借鉴的信息组织或动效原则，不使用其商标、图片或现成代码。

| 网站                                                                                              | 观察到的设计方法                                   | 在 PlanTool 中的取舍                                        |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| [NASA Eyes on the Solar System](https://eyes.nasa.gov/apps/solar-system/)                         | 黑色星场、轨道线和少量高对比读数建立任务观察视角。 | 启动画面采用原创 UEG 轨道仪表；进入后把特效让位给任务操作。 |
| [Solar System Scope](https://sites.solarsystemscope.com/)                                         | 行星始终是视觉焦点，周围信息承担导航与解释。       | 地球成为持续运动的背景，而不是挡住内容的独立页面。          |
| [100,000 Stars](https://stars.chromeexperiments.com/)                                             | 星点密度和缓慢位移创造纵深，交互提示保持简短。     | 两层 CSS 星场以不同速度漂移，避免视频背景和额外下载。       |
| [SpaceX Starship](https://new.spacex.com/vehicles/starship)                                       | 大尺度主体配合克制的数字、规格与清晰的操作层级。   | 首页保留清楚的任务入口与四项关键数据。                      |
| [Star Atlas](https://experience.staratlas.com/)                                                   | 宏大场景背后使用高对比、明确的入口组织复杂内容。   | 模块导航仍维持原有功能名称，不把工具变成不可用的展示页。    |
| [SpaceEngine](https://spaceengine.org/)                                                           | 星球光照和深空层次让尺度感成立。                   | 用本地 SVG 贴图、球体光照和缓慢旋转组合成动态地球。         |
| [OpenSpace](https://www.openspaceproject.com/about/about.html)                                    | 复杂空间数据需要清晰的参照系和分层显示。           | 轨道线、状态读数与内容面板使用不同亮度层级。                |
| [Exoplanet Travel Bureau](https://science.nasa.gov/exoplanets/immersive/exoplanet-travel-bureau/) | 富于想象的世界观仍通过明确标题和行动引导使用者。   | 文案使用“航线”“推进”等语汇，但保留任务的真实含义。          |
| [The Size of Space](https://neal.fun/size-of-space/)                                              | 连续的尺度体验依靠节奏，而非同时呈现所有视觉效果。 | 仅在启动与背景中使用持续动效，工作面板以稳定阅读为主。      |
| [Portal Space Systems](https://www.portalsystems.space/)                                          | 航天器主题可用冷色技术界面与暖色推进信号形成反差。 | 青色用于系统状态，琥珀色用于主要操作和推进提示。            |

原则：所有动态效果尊重系统的“减少动态效果”设置；动态地球、星场和启动界面均由本仓库的 CSS/SVG/JS 构成，不依赖网络资源。
