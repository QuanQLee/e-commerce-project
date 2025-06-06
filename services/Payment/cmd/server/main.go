package main

import (
    "context"
    "log"
    "net"
    "os"

    "github.com/gin-gonic/gin"
    "google.golang.org/grpc"
    gw "github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"

    pb "payment/api"
)

type server struct {
    pb.UnimplementedPaymentServiceServer
    db *gorm.DB
}

func (s *server) CreatePayment(ctx context.Context, req *pb.CreatePaymentRequest) (*pb.PaymentResponse, error) {
    // demo implementation
    return &pb.PaymentResponse{PaymentId: "demo", Status: "created"}, nil
}

func main() {
    dsn := os.Getenv("ConnectionStrings__PaymentDb")
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatalf("failed to connect database: %v", err)
    }

    svc := &server{db: db}

    grpcServer := grpc.NewServer()
    pb.RegisterPaymentServiceServer(grpcServer, svc)

    lis, err := net.Listen("tcp", ":7001")
    if err != nil {
        log.Fatalf("listen failed: %v", err)
    }

    go func() {
        log.Println("gRPC listening on :7001")
        if err := grpcServer.Serve(lis); err != nil {
            log.Fatalf("gRPC server error: %v", err)
        }
    }()

    ctx := context.Background()
    mux := gw.NewServeMux()
    if err := pb.RegisterPaymentServiceHandlerServer(ctx, mux, svc); err != nil {
        log.Fatalf("gateway register failed: %v", err)
    }

    router := gin.Default()
    router.Any("/*any", gin.WrapH(mux))

    log.Println("HTTP listening on :8080")
    if err := router.Run(":8080"); err != nil {
        log.Fatalf("http server error: %v", err)
    }
}

