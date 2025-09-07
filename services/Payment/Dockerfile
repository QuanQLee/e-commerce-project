##################### 1. Build stage #####################
FROM golang:1.23-alpine AS builder

# Ensure module and build caches live in writable locations
ENV GOPROXY=https://goproxy.cn,direct \
    GOPATH=/go \
    GOMODCACHE=/go/pkg/mod \
    GOCACHE=/go/build-cache
WORKDIR /src

# Copy go.mod/go.sum first to leverage cache
COPY go.mod go.sum ./
RUN mkdir -p "$GOMODCACHE" "$GOCACHE" && go mod download

# Copy source code and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /payment ./cmd/server

##################### 2. Runtime stage ###################
FROM alpine:3.19
WORKDIR /app

# Copy the statically built binary from the builder stage
COPY --from=builder /payment .

# Expose service ports
EXPOSE 8080 7001

ENTRYPOINT ["./payment"]
