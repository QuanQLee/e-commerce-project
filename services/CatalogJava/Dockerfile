FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp dependency:go-offline

COPY src src
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN groupadd --system --gid 10001 appgroup \
    && useradd --system --uid 10001 --gid appgroup appuser
COPY --from=build /workspace/target/catalog-java-*.jar app.jar
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseG1GC"
EXPOSE 8080
USER appuser
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
