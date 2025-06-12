# syntax=docker/dockerfile:1   ← 指定新语法解析器，兼容 BuildKit

##################### ① Build stage #####################
FROM golang:1.23.4-alpine AS builder
ENV GOPROXY=https://goproxy.cn,direct
WORKDIR /src

# 先复制依赖清单并下载依赖，充分利用缓存
COPY go.mod go.sum ./
RUN go mod download

# 再复制源码并编译
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /payment ./cmd/server

##################### ② Runtime stage ###################
FROM alpine:3.19
WORKDIR /app

# 从第一阶段拷贝静态编译好的二进制
COPY --from=builder /payment .

# 如有需要可暴露端口（根据你的服务监听端口决定）
EXPOSE 8080 7001

ENTRYPOINT ["./payment"]
