FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /workspace

COPY gradle-8.14.2/gradle-8.14.2-bin.zip gradle-8.14.2/
COPY gradlew gradlew
COPY gradle  gradle
COPY build.gradle settings.gradle ./
COPY src src

RUN --mount=type=cache,target=/root/.gradle \
    chmod +x gradlew \
 && ./gradlew clean bootJar --no-daemon

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=builder /workspace/security.api/build/libs/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java","-jar","app.jar"]
