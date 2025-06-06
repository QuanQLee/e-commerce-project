# Order Service

该服务提供订单管理接口，并依赖 PostgreSQL、Rebus 消息总线以及 Quartz 定时任务。

## 环境变量
- `ConnectionStrings__OrderDb`：PostgreSQL 连接字符串，示例：`Host=pg;Port=5432;Database=catalog;Username=catalog_admin;Password=P@ssw0rd!`。

## 数据库 Schema
默认 schema 为 `order`，包含两张表：
- `orders`：订单主表。
- `order_items`：订单明细表，关联 `orders`。

## Rebus
示例代码中使用内存传输，可根据需要在 `Program.cs` 修改为实际的消息队列。

## Quartz
`Program.cs` 中已注册 Quartz，可在 `Quartz` 任务中实现后台作业。
