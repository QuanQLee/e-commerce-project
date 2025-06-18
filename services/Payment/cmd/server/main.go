package main

import (
	"context"
	"fmt"
	"log"
	"net"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	gw "github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/emptypb"
	"gorm.io/gorm"

	pb "github.com/QuanQLee/e-commerce-project/services/Payment/api"
)

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
	db *gorm.DB
}

func (s *server) CreatePayment(ctx context.Context, in *pb.CreatePaymentRequest) (*pb.PaymentResponse, error) {
	p := Payment{
		OrderID: in.OrderId,
		Amount:  in.Amount,
		Status:  "PAID",
	}
	if err := s.db.Create(&p).Error; err != nil {
		return nil, err
	}
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

/********** 初始化数据库 **********/
func initDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open("payment.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("sqlite connect: %v", err)
	}
	if err := db.AutoMigrate(&Payment{}); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	return db
}

/********** 入口 **********/
func main() {
	db := initDB()

	/* ---------- gRPC ---------- */
	svc := &server{db: db}
	grpcSrv := grpc.NewServer()
	pb.RegisterPaymentServiceServer(grpcSrv, svc)

	lis, err := net.Listen("tcp", ":7001")
	if err != nil {
		log.Fatalf("listen: %v", err)
	}
	go func() {
		log.Println("gRPC listening :7001")
		if err := grpcSrv.Serve(lis); err != nil {
			log.Fatalf("gRPC: %v", err)
		}
	}()

	/* ---------- Gateway ---------- */
	ctx := context.Background()
	mux := gw.NewServeMux()
	if err := pb.RegisterPaymentServiceHandlerServer(ctx, mux, svc); err != nil {
		log.Fatalf("gw reg: %v", err)
	}

	/* ---------- Gin ---------- */
	router := gin.Default()
	router.Any("/*any", gin.WrapH(mux))

	log.Println("HTTP listening :8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("http: %v", err)
	}
}
