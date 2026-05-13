---
title: 后端 API 设计复盘
date: 2026-04-15 08:00:00
updated: 2026-04-15 08:00:00
categories:
  - 后端
tags:
  - api
cover: /img/default_cover/p4.jpg
description: 统一错误码、分页与幂等的复盘，含具体代码示例。
---

梳理近期接口设计中踩过的坑。三个高频问题：错误信息不一致、分页参数混乱、幂等缺失导致重复写入。

## 一、统一错误码与错误信息结构

最初每个接口各自返回错误格式，前端要写 N 套判断逻辑。后来统一成一层结构：

```json
{
  "code": 40001,
  "message": "参数校验失败",
  "detail": "email 格式不正确"
}
```

错误码分段规则：

| 范围 | 含义 |
|------|------|
| 40001-40099 | 参数校验 |
| 40101-40199 | 认证/授权 |
| 40301-40399 | 权限不足 |
| 40401-40499 | 资源不存在 |
| 50001-50099 | 服务端异常 |

Node.js 中间件统一拦截：

```js
class AppError extends Error {
  constructor(code, message, detail = '') {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.code < 50000 ? 400 : 500).json({
      code: err.code,
      message: err.message,
      detail: err.detail,
    });
  }
  res.status(500).json({ code: 50000, message: '服务器内部错误' });
});
```

## 二、分页参数命名统一

之前有的接口用 `page/pageSize`，有的用 `offset/limit`，有的用 `skip/take`。现在统一为：

```js
// 请求
GET /api/posts?page=1&pageSize=20

// 响应
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

约定 `pageSize` 上限 100，防止单次查询过大。

## 三、幂等接口补充请求标识

支付、创建订单这类接口，网络重试可能造成重复写入。解决方案：前端每次提交带唯一 `idempotencyKey`：

```js
// 前端生成
const idempotencyKey = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

await fetch('/api/orders', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': idempotencyKey },
  body: JSON.stringify(orderData),
});
```

后端以 `idempotencyKey` 为唯一索引，相同 key 的请求直接返回首次结果：

```js
const cached = await redis.get(`idempotent:${idempotencyKey}`);
if (cached) return JSON.parse(cached);

const result = await createOrder(data);
await redis.set(`idempotent:${idempotencyKey}`, JSON.stringify(result), 'EX', 86400);
return result;
```

## 总结

接口规范先行，后续维护成本下降明显。三个原则：

1. 错误格式一处定义，全局复用
2. 分页参数全站统一，文档写清楚默认值
3. 写操作一律支持幂等，用 Redis 缓存去重
