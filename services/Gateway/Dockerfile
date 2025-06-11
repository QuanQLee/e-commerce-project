# -------------------- 1. 构建阶段 --------------------
# 用官方 OpenJDK 17 slim 镜像（改成你用的版本）
FROM openjdk:17-jdk-slim AS build

# 1.1 工作目录
WORKDIR /app

# 1.2 首先拷入 Gradle Wrapper，保证脚本在这里
COPY gradlew ./
COPY gradle/wrapper/ gradle/wrapper/

# 1.3 授可执行权限
RUN chmod +x gradlew

# 1.4 拷入 Gradle 配置文件（build.gradle、settings.gradle）
COPY build.gradle settings.gradle ./

# 1.5 拷源码文件
COPY src/ src/

# 1.6 用 Wrapper 构建 Spring Boot 可执行包
RUN ./gradlew clean bootJar --no-daemon

# -------------------- 2. 运行阶段 --------------------
FROM openjdk:17-jdk-slim

WORKDIR /app

# 2.1 从 build 阶段拷输出的 JAR
COPY --from=build /app/build/libs/*.jar app.jar

# 2.2 暴露端口（改成服务实际端口）
EXPOSE 8080

# 2.3 启动命令
ENTRYPOINT ["java","-jar","app.jar"]
