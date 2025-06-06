FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod .
RUN go mod download
COPY . .
RUN go build -o /payment ./cmd/server

FROM alpine:3.19
WORKDIR /app
COPY --from=build /payment /app/payment
EXPOSE 8080 7001
ENTRYPOINT ["/app/payment"]
