---
title: 前端渲染优化小记
date: 2026-04-16 08:00:00
updated: 2026-04-16 08:00:00
categories:
  - 前端
tags:
  - react
cover: /img/default_cover/p3.jpg
description: 一次首屏抖动排查与优化记录，含组件拆分、懒加载、memo 代码示例。
---

记录一次页面首屏抖动排查与处理。页面加载时出现明显闪动，滚动过程偶发卡顿。

## 问题定位

用 React DevTools Profiler 录制首屏渲染，发现三点：

1. 首页组件单文件超过 400 行，一次渲染大量 DOM
2. 图表和评论区在首屏就加载，但用户并不立刻看到
3. 列表项没有 memo，父组件 state 变化导致全量重渲染

## 处理方案

### 1. 拆分大组件

把首页拆成独立模块，每个模块只关注自己的渲染：

```jsx
// 之前：一个巨大的 HomePage 组件
function HomePage() {
  return (
    <div>
      <Banner />
      <HotPosts />      {/* 400+ 行内联 */}
      <Sidebar />       {/* 200+ 行内联 */}
      <CommentList />   {/* 150+ 行内联 */}
    </div>
  );
}

// 之后：拆分，每个组件独立文件
function HomePage() {
  return (
    <div>
      <Banner />
      <HotPosts />
      <Sidebar />
      <CommentList />
    </div>
  );
}
```

拆分后每个组件单独维护，首屏只需渲染 Banner + HotPosts。

### 2. 延迟非核心模块

图表和评论区用 `React.lazy` + `Suspense` 延迟加载：

```jsx
const ChartPanel = React.lazy(() => import('./ChartPanel'));
const CommentList = React.lazy(() => import('./CommentList'));

function HomePage() {
  return (
    <div>
      <Banner />
      <HotPosts />
      <Suspense fallback={<Skeleton />}>
        <ChartPanel />
      </Suspense>
      <Suspense fallback={<div>加载中...</div>}>
        <CommentList />
      </Suspense>
    </div>
  );
}
```

### 3. 减少无意义重渲染

列表项用 `React.memo` + 浅比较避免父组件更新时全量重刷：

```jsx
const PostCard = React.memo(function PostCard({ post }) {
  return (
    <div className="post-card">
      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>
    </div>
  );
});
```

同时检查了 `useCallback` 和 `useMemo` 的使用——之前传箭头函数给子组件，每次渲染都生成新引用，memo 等于白做。

## 结果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 首屏渲染时间 | ~2.8s | ~1.1s |
| 首次交互延迟 | 420ms | 180ms |
| 滚动帧率 | 40-50fps | 稳定 60fps |

核心心得：不要过早优化，但组件一旦超过 200 行就该考虑拆分。`memo` 不搭配稳定的 props 引用就是摆设。
