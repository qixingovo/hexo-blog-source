---
title: 后端 API 设计复盘
date: 2026-04-15 08:00:00
updated: 2026-04-15 08:00:00
categories:
  - 后端
tags:
  - API
cover: /img/default_cover/p4.jpg
description: 统一错误码、分页与幂等的复盘。
---

梳理近期接口设计中踩过的坑。

## 关键点

- 统一错误码与错误信息结构
- 分页参数命名统一
- 幂等接口补充请求标识

结论：接口规范先行，后续维护成本会下降很多。
