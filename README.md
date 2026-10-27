# bilibili 桌面版 → 手机适配

手机浏览器（**必须开「请求桌面网站」**）打开 bilibili 网页版时，把 1100px 的桌面布局重排成手机布局。

## 装

1. 手机浏览器装 Tampermonkey（安卓：Firefox / Kiwi / Yandex；iOS：Safari + Userscripts）
2. 打开下面这个链接，Tampermonkey 会弹安装框：

```
https://cdn.jsdelivr.net/gh/Kongdachui/bili-mobile-adapt@main/bilibili-desktop-mobile.user.js
```

装完自动更新走脚本头里的 `@updateURL`（同一个地址），Tampermonkey 会定期检查。

## 做了什么

- 补 viewport + 把 b 站写死的 `min-width:1100px` 归零（否则整页被缩成 35%）
- 顶栏压到 48px，去掉 banner、频道栏、番剧/直播/会员购等入口、大会员、创作中心
- 首页推荐流双列、字体随屏宽自适应（clamp + vw）
- 刷掉番剧推荐位、直播卡、广告卡（含懒加载后出现的）
- 竖屏 2 列 / 横屏 3~4 列
- 播放页上下堆叠、播放器吸顶、横屏默认宽屏、只留播放必需的按钮
- 动态页三栏拆单栏、个人主页顶栏收窄
- 右下角两个小圆点：「手」开关适配，「宽」切宽屏

## 已知限制

- 移动 UA 下 `www.bilibili.com` 会被 302 到 m 站，脚本拦不住，所以必须用桌面 UA
- 广告位类名是逆推出来的，b 站改版可能需要更新
- 只在 512~715px 的桌面浏览器窗口里验证过，真机覆盖不全
