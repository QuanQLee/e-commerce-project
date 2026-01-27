package main

import (
        "context"
        "errors"
        "fmt"
        "log"
        "net"
        "os"
        "strings"
        "time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	gw "github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
	"google.golang.org/grpc"
        "google.golang.org/grpc/codes"
        "google.golang.org/grpc/status"
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
                s.logger.Error("create payment", zap.Error(err))
                return nil, status.Error(codes.Internal, "CREATE_PAYMENT_FAILED")
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
                s.logger.Error("list payments", zap.Error(err))
                return nil, status.Error(codes.Internal, "LIST_PAYMENTS_FAILED")
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
                if errors.Is(err, gorm.ErrRecordNotFound) {
                        return nil, status.Error(codes.NotFound, "PAYMENT_NOT_FOUND")
                }
                s.logger.Error("read payment", zap.Error(err))
                return nil, status.Error(codes.Internal, "READ_PAYMENT_FAILED")
        }
        p.Status = in.Status
        if err := s.db.Save(&p).Error; err != nil {
                s.logger.Error("update payment", zap.Error(err))
                return nil, status.Error(codes.Internal, "UPDATE_PAYMENT_FAILED")
        }
	paymentCounter.WithLabelValues(strings.ToLower(in.Status)).Inc()
	s.logger.Info("payment updated", zap.String("payment_id", fmt.Sprint(p.ID)), zap.String("status", p.Status))
	return &pb.PaymentResponse{PaymentId: fmt.Sprint(p.ID), Status: p.Status}, nil
}

/********** 初始化数据库 **********/
func initDB() *gorm.DB {
    // Prefer POSTGRES_DSN, fall back to ConnectionStrings__PaymentDb
    dsn := os.Getenv("POSTGRES_DSN")
    if dsn == "" {
        dsn = os.Getenv("ConnectionStrings__PaymentDb")
    }

    var db *gorm.DB
    var err error
    if dsn != "" {
        // Retry Postgres connection and migration — helps when DB is not ready yet.
        for i := 0; i < 20; i++ { // ~20 * 1s = 20s max
            db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
            if err == nil {
                if mErr := db.AutoMigrate(&Payment{}); mErr == nil {
                    return db
                } else {
                    // Migration failed, wait and retry
                    log.Printf("migrate failed (try %d/20): %v", i+1, mErr)
                }
            } else {
                log.Printf("postgres connect failed (try %d/20): %v", i+1, err)
            }
            time.Sleep(1 * time.Second)
        }
        // After retries, if still failing, fall back to SQLite to keep the service up
        log.Printf("postgres not available, falling back to sqlite")
    }

    db, err = gorm.Open(sqlite.Open("payment.db"), &gorm.Config{})
    if err != nil {
        log.Fatalf("sqlite connect: %v", err)
    }
    if err := db.AutoMigrate(&Payment{}); err != nil {
        log.Fatalf("migrate: %v", err)
    }
    return db
}

func dbHealthy(db *gorm.DB) bool {
        sqlDB, err := db.DB()
        if err != nil {
                return false
        }
        return sqlDB.Ping() == nil
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
        router.GET("/healthz", func(c *gin.Context) {
                c.JSON(200, gin.H{"status": "ok"})
        })
        router.GET("/readyz", func(c *gin.Context) {
                if dbHealthy(db) {
                        c.JSON(200, gin.H{"status": "ready"})
                } else {
                        c.JSON(503, gin.H{"status": "db unavailable"})
                }
        })
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))
	// Serve the gRPC-Gateway under a dedicated prefix to avoid
	// conflicts with exact routes like /healthz and /metrics.
	router.Any("/v1/*any", gin.WrapH(mux))

	logger.Info("HTTP listening", zap.String("addr", ":8080"))
	if err := router.Run(":8080"); err != nil {
		logger.Fatal("http", zap.Error(err))
	}
}
