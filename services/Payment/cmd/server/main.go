package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	gw "github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/emptypb"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	pb "github.com/QuanQLee/e-commerce-project/services/Payment/api"
)

var paymentCounter = prometheus.NewCounterVec(
	prometheus.CounterOpts{Name: "payments_total", Help: "Processed payments"},
	[]string{"status"},
)

func init() {
	prometheus.MustRegister(paymentCounter)
}

/********** 数据模型 **********/
type Payment struct {
	ID      uint    `gorm:"primaryKey"`
	OrderID string  // 对应 proto 字段 order_id
	Amount  float64 // 对应 proto 字段 amount
	Status  string
}

/********** gRPC Service 实现 **********/
type server struct {
	pb.UnimplementedPaymentServiceServer
	db     *gorm.DB
	logger *zap.Logger
}

func (s *server) CreatePayment(ctx context.Context, in *pb.CreatePaymentRequest) (*pb.PaymentResponse, error) {
	p := Payment{
		OrderID: in.OrderId,
		Amount:  in.Amount,
		Status:  "PENDING",
	}
	if err := s.db.Create(&p).Error; err != nil {
		return nil, err
	}
	paymentCounter.WithLabelValues(strings.ToLower(p.Status)).Inc()
	s.logger.Info("payment created", zap.String("payment_id", fmt.Sprint(p.ID)), zap.String("status", p.Status))
	return &pb.PaymentResponse{
		PaymentId: fmt.Sprint(p.ID),
		Status:    p.Status,
	}, nil
}

func (s *server) ListPayments(ctx context.Context, _ *emptypb.Empty) (*pb.ListPaymentsResponse, error) {
	var entries []Payment
	if err := s.db.Find(&entries).Error; err != nil {
		return nil, err
	}
	res := make([]*pb.PaymentItem, len(entries))
	for i, p := range entries {
		res[i] = &pb.PaymentItem{
			PaymentId: fmt.Sprint(p.ID),
			Amount:    p.Amount,
			Status:    p.Status,
		}
	}
	return &pb.ListPaymentsResponse{Payments: res}, nil
}

func (s *server) UpdatePaymentStatus(ctx context.Context, in *pb.UpdatePaymentStatusRequest) (*pb.PaymentResponse, error) {
	var p Payment
	if err := s.db.First(&p, in.PaymentId).Error; err != nil {
		return nil, err
	}
	p.Status = in.Status
	if err := s.db.Save(&p).Error; err != nil {
		return nil, err
	}
	paymentCounter.WithLabelValues(strings.ToLower(in.Status)).Inc()
	s.logger.Info("payment updated", zap.String("payment_id", fmt.Sprint(p.ID)), zap.String("status", p.Status))
	return &pb.PaymentResponse{PaymentId: fmt.Sprint(p.ID), Status: p.Status}, nil
}

/********** 初始化数据库 **********/
func initDB() *gorm.DB {
	dsn := os.Getenv("ConnectionStrings__PaymentDb")
	var db *gorm.DB
	var err error
	if dsn != "" {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			log.Fatalf("postgres connect: %v", err)
		}
	} else {
		db, err = gorm.Open(sqlite.Open("payment.db"), &gorm.Config{})
		if err != nil {
			log.Fatalf("sqlite connect: %v", err)
		}
	}
	if err := db.AutoMigrate(&Payment{}); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	return db
}

/********** 入口 **********/
func main() {
    logger, _ := zap.NewProduction()
    defer func() { _ = logger.Sync() }()
	db := initDB()

	/* ---------- gRPC ---------- */
	svc := &server{db: db, logger: logger}
	grpcSrv := grpc.NewServer()
	pb.RegisterPaymentServiceServer(grpcSrv, svc)

	lis, err := net.Listen("tcp", ":7001")
	if err != nil {
		logger.Fatal("listen", zap.Error(err))
	}
	go func() {
		logger.Info("gRPC listening", zap.String("addr", ":7001"))
		if err := grpcSrv.Serve(lis); err != nil {
			logger.Fatal("gRPC", zap.Error(err))
		}
	}()

	/* ---------- Gateway ---------- */
	ctx := context.Background()
	mux := gw.NewServeMux()
	if err := pb.RegisterPaymentServiceHandlerServer(ctx, mux, svc); err != nil {
		logger.Fatal("gw reg", zap.Error(err))
	}

	/* ---------- Gin ---------- */
	router := gin.Default()
	router.GET("/healthz", func(c *gin.Context) { c.Status(200) })
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))
	router.Any("/*any", gin.WrapH(mux))

	logger.Info("HTTP listening", zap.String("addr", ":8080"))
	if err := router.Run(":8080"); err != nil {
		logger.Fatal("http", zap.Error(err))
	}
}
