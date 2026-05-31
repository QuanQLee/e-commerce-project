package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	gw "github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	pb "github.com/QuanQLee/e-commerce-project/services/Payment/api"
)

var paymentCounter = prometheus.NewCounterVec(
	prometheus.CounterOpts{Name: "payments_total", Help: "Processed payments"},
	[]string{"status"},
)

func init() {
	prometheus.MustRegister(paymentCounter)
}

func envInt(name string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed < 0 {
		return fallback
	}
	return parsed
}

func gormConfig() *gorm.Config {
	return &gorm.Config{
		Logger: gormlogger.New(
			log.New(os.Stdout, "", log.LstdFlags),
			gormlogger.Config{
				SlowThreshold:             time.Duration(envInt("PAYMENT_DB_SLOW_SQL_MS", 2000)) * time.Millisecond,
				LogLevel:                  gormlogger.Error,
				IgnoreRecordNotFoundError: true,
				Colorful:                  false,
			},
		),
	}
}

func configureDBPool(db *gorm.DB) {
	sqlDB, err := db.DB()
	if err != nil {
		return
	}
	sqlDB.SetMaxOpenConns(envInt("PAYMENT_DB_MAX_OPEN_CONNS", 50))
	sqlDB.SetMaxIdleConns(envInt("PAYMENT_DB_MAX_IDLE_CONNS", 25))
	sqlDB.SetConnMaxLifetime(time.Duration(envInt("PAYMENT_DB_CONN_MAX_LIFETIME_SECONDS", 300)) * time.Second)
}

func normalizePostgresDSN(dsn string) string {
	trimmed := strings.TrimSpace(dsn)
	if trimmed == "" {
		return trimmed
	}
	if strings.HasPrefix(trimmed, "postgres://") || strings.HasPrefix(trimmed, "postgresql://") {
		parsed, err := url.Parse(trimmed)
		if err != nil {
			return trimmed
		}
		password, _ := parsed.User.Password()
		values := map[string]string{
			"host":     parsed.Hostname(),
			"port":     parsed.Port(),
			"user":     parsed.User.Username(),
			"password": password,
			"dbname":   strings.TrimPrefix(parsed.Path, "/"),
			"sslmode":  parsed.Query().Get("sslmode"),
		}
		if values["sslmode"] == "" {
			values["sslmode"] = "prefer"
		}
		return postgresDSNFromValues(values)
	}
	if strings.Contains(trimmed, ";") && strings.Contains(strings.ToLower(trimmed), "host=") {
		values := map[string]string{}
		for _, part := range strings.Split(trimmed, ";") {
			key, value, ok := strings.Cut(part, "=")
			if !ok {
				continue
			}
			switch strings.ToLower(strings.TrimSpace(key)) {
			case "host":
				values["host"] = strings.TrimSpace(value)
			case "port":
				values["port"] = strings.TrimSpace(value)
			case "database", "dbname":
				values["dbname"] = strings.TrimSpace(value)
			case "username", "user id", "user":
				values["user"] = strings.TrimSpace(value)
			case "password":
				values["password"] = strings.TrimSpace(value)
			case "ssl mode", "sslmode":
				values["sslmode"] = strings.ToLower(strings.TrimSpace(value))
			}
		}
		if values["sslmode"] == "" {
			values["sslmode"] = "prefer"
		}
		return postgresDSNFromValues(values)
	}
	return trimmed
}

func postgresDSNFromValues(values map[string]string) string {
	keys := []string{"host", "port", "user", "password", "dbname", "sslmode"}
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		if value := strings.TrimSpace(values[key]); value != "" {
			parts = append(parts, fmt.Sprintf("%s=%s", key, value))
		}
	}
	return strings.Join(parts, " ")
}

func ensurePostgresSchema(db *gorm.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS payments (
			id bigserial PRIMARY KEY,
			tenant_id text NOT NULL DEFAULT 'public',
			order_id text NOT NULL DEFAULT '',
			amount double precision NOT NULL DEFAULT 0,
			status text NOT NULL DEFAULT '',
			channel text NOT NULL DEFAULT '',
			gateway_reference text NOT NULL DEFAULT '',
			paid_amount double precision NOT NULL DEFAULT 0,
			refunded_amount double precision NOT NULL DEFAULT 0,
			callback_verified boolean NOT NULL DEFAULT false,
			reconciled_at timestamptz NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments (tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id)`,
		`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status)`,
		`CREATE TABLE IF NOT EXISTS refunds (
			id bigserial PRIMARY KEY,
			tenant_id text NOT NULL DEFAULT 'public',
			payment_id bigint NOT NULL,
			amount double precision NOT NULL DEFAULT 0,
			reason text NOT NULL DEFAULT '',
			status text NOT NULL DEFAULT '',
			processed_channel text NOT NULL DEFAULT '',
			created_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_refunds_tenant_id ON refunds (tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds (payment_id)`,
		`CREATE TABLE IF NOT EXISTS payment_callback_logs (
			id bigserial PRIMARY KEY,
			tenant_id text NOT NULL DEFAULT 'public',
			payment_id bigint NOT NULL,
			event_type text NOT NULL DEFAULT '',
			signature_pass boolean NOT NULL DEFAULT false,
			raw_payload text NOT NULL DEFAULT '',
			created_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_payment_callback_logs_tenant_id ON payment_callback_logs (tenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_payment_callback_logs_payment_id ON payment_callback_logs (payment_id)`,
	}
	for _, statement := range statements {
		if err := db.Exec(statement).Error; err != nil {
			return err
		}
	}
	return nil
}

type Payment struct {
	ID               uint   `gorm:"primaryKey"`
	TenantID         string `gorm:"index"`
	OrderID          string `gorm:"index"`
	Amount           float64
	Status           string `gorm:"index"`
	Channel          string
	GatewayReference string
	PaidAmount       float64
	RefundedAmount   float64
	CallbackVerified bool
	ReconciledAt     *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type Refund struct {
	ID               uint `gorm:"primaryKey"`
	TenantID         string `gorm:"index"`
	PaymentID        uint `gorm:"index"`
	Amount           float64
	Reason           string
	Status           string
	ProcessedChannel string
	CreatedAt        time.Time
}

type PaymentCallbackLog struct {
	ID            uint `gorm:"primaryKey"`
	TenantID      string `gorm:"index"`
	PaymentID     uint `gorm:"index"`
	EventType     string
	SignaturePass bool
	RawPayload    string
	CreatedAt     time.Time
}

type ChannelRouter struct {
	mu       sync.RWMutex
	channels map[string]bool
	order    []string
}

func newChannelRouter(raw string) *ChannelRouter {
	channels := make(map[string]bool)
	order := make([]string, 0)

	source := raw
	if strings.TrimSpace(source) == "" {
		source = "wechat,alipay,stripe"
	}

	for _, item := range strings.Split(source, ",") {
		name := strings.TrimSpace(item)
		if name == "" {
			continue
		}
		channels[name] = true
		order = append(order, name)
	}

	if len(order) == 0 {
		channels["default"] = true
		order = append(order, "default")
	}

	return &ChannelRouter{channels: channels, order: order}
}

func (r *ChannelRouter) Pick() string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, name := range r.order {
		if r.channels[name] {
			return name
		}
	}
	return r.order[0]
}

func (r *ChannelRouter) SetHealth(channel string, healthy bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.channels[channel]; !ok {
		return fmt.Errorf("unknown channel: %s", channel)
	}
	r.channels[channel] = healthy
	return nil
}

func (r *ChannelRouter) IsHealthy(channel string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	healthy, ok := r.channels[channel]
	if !ok {
		return false
	}
	return healthy
}

func (r *ChannelRouter) Snapshot() map[string]bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make(map[string]bool, len(r.channels))
	for k, v := range r.channels {
		out[k] = v
	}
	return out
}

type server struct {
	pb.UnimplementedPaymentServiceServer
	db             *gorm.DB
	logger         *zap.Logger
	callbackSecret string
	channels       *ChannelRouter
}

func normalizeTenantID(raw string) string {
	tenantID := strings.TrimSpace(raw)
	if tenantID == "" {
		return "public"
	}
	return tenantID
}

func tenantIDFromContext(ctx context.Context) string {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "public"
	}
	values := md.Get("x-tenant-id")
	if len(values) == 0 {
		return "public"
	}
	return normalizeTenantID(values[0])
}

func tenantIDFromGin(c *gin.Context) string {
	return normalizeTenantID(c.GetHeader("X-Tenant-Id"))
}

func (s *server) CreatePayment(ctx context.Context, in *pb.CreatePaymentRequest) (*pb.PaymentResponse, error) {
	tenantID := tenantIDFromContext(ctx)
	channel := s.channels.Pick()
	p := Payment{
		TenantID: tenantID,
		OrderID: in.OrderId,
		Amount:  in.Amount,
		Status:  "PENDING",
		Channel: channel,
	}

	if err := s.db.Create(&p).Error; err != nil {
		s.logger.Error("create payment", zap.Error(err))
		return nil, status.Error(codes.Internal, "CREATE_PAYMENT_FAILED")
	}

	paymentCounter.WithLabelValues(strings.ToLower(p.Status)).Inc()
	s.logger.Info(
		"payment created",
		zap.String("payment_id", fmt.Sprint(p.ID)),
		zap.String("tenant_id", tenantID),
		zap.String("status", p.Status),
		zap.String("channel", channel),
	)

	return &pb.PaymentResponse{PaymentId: fmt.Sprint(p.ID), Status: p.Status}, nil
}

func (s *server) ListPayments(ctx context.Context, _ *emptypb.Empty) (*pb.ListPaymentsResponse, error) {
	tenantID := tenantIDFromContext(ctx)
	var entries []Payment
	if err := s.db.Where("tenant_id = ?", tenantID).Find(&entries).Error; err != nil {
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
	tenantID := tenantIDFromContext(ctx)
	var p Payment
	if err := s.db.Where("id = ? AND tenant_id = ?", in.PaymentId, tenantID).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, status.Error(codes.NotFound, "PAYMENT_NOT_FOUND")
		}
		s.logger.Error("read payment", zap.Error(err))
		return nil, status.Error(codes.Internal, "READ_PAYMENT_FAILED")
	}

	p.Status = strings.ToUpper(in.Status)
	if err := s.db.Save(&p).Error; err != nil {
		s.logger.Error("update payment", zap.Error(err))
		return nil, status.Error(codes.Internal, "UPDATE_PAYMENT_FAILED")
	}

	paymentCounter.WithLabelValues(strings.ToLower(p.Status)).Inc()
	s.logger.Info(
		"payment updated",
		zap.String("payment_id", fmt.Sprint(p.ID)),
		zap.String("tenant_id", tenantID),
		zap.String("status", p.Status),
	)

	return &pb.PaymentResponse{PaymentId: fmt.Sprint(p.ID), Status: p.Status}, nil
}

func (s *server) verifyCallbackSignature(timestamp, payload, signature string) bool {
	if s.callbackSecret == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(s.callbackSecret))
	_, _ = mac.Write([]byte(timestamp + "." + payload))
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(strings.ToLower(signature)))
}

type callbackRequest struct {
	PaymentID        uint    `json:"payment_id"`
	Status           string  `json:"status"`
	PaidAmount       float64 `json:"paid_amount"`
	GatewayReference string  `json:"gateway_reference"`
	EventType        string  `json:"event_type"`
}

func (s *server) handleCallback(c *gin.Context) {
	raw, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	timestamp := c.GetHeader("X-Callback-Timestamp")
	signature := strings.ToLower(c.GetHeader("X-Callback-Signature"))
	if !s.verifyCallbackSignature(timestamp, string(raw), signature) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
		return
	}

	var req callbackRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		var p Payment
		if err := tx.First(&p, req.PaymentID).Error; err != nil {
			return err
		}

		p.Status = strings.ToUpper(req.Status)
		p.PaidAmount = req.PaidAmount
		p.GatewayReference = req.GatewayReference
		p.CallbackVerified = true

		if err := tx.Save(&p).Error; err != nil {
			return err
		}

		logEntry := PaymentCallbackLog{
			TenantID:      p.TenantID,
			PaymentID:     p.ID,
			EventType:     req.EventType,
			SignaturePass: true,
			RawPayload:    string(raw),
		}
		if err := tx.Create(&logEntry).Error; err != nil {
			return err
		}

		paymentCounter.WithLabelValues(strings.ToLower(p.Status)).Inc()
		return nil
	})

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "payment not found"})
			return
		}
		s.logger.Error("callback processing failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "callback processing failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "accepted"})
}

type refundRequest struct {
	Amount float64 `json:"amount"`
	Reason string  `json:"reason"`
}

func (s *server) processRefund(paymentID uint, tenantID string, amount float64, reason string) (*Refund, string, bool, error) {
	var result *Refund
	var usedChannel string
	var fallbackUsed bool

	err := s.db.Transaction(func(tx *gorm.DB) error {
		var p Payment
		if err := tx.Where("id = ? AND tenant_id = ?", paymentID, tenantID).First(&p).Error; err != nil {
			return err
		}

		if p.Status != "PAID" && p.Status != "REFUNDED_PARTIAL" && p.Status != "REFUNDED" {
			return fmt.Errorf("payment status %s is not refundable", p.Status)
		}

		remaining := p.PaidAmount - p.RefundedAmount
		if amount <= 0 {
			return errors.New("refund amount must be positive")
		}
		if amount > remaining {
			return fmt.Errorf("refund amount exceeds refundable amount %.2f", remaining)
		}

		channel := p.Channel
		if !s.channels.IsHealthy(channel) {
			channel = s.channels.Pick()
			fallbackUsed = true
		}

		refund := &Refund{
			TenantID:         tenantID,
			PaymentID:        p.ID,
			Amount:           amount,
			Reason:           reason,
			Status:           "SUCCEEDED",
			ProcessedChannel: channel,
		}
		if err := tx.Create(refund).Error; err != nil {
			return err
		}

		p.RefundedAmount += amount
		if p.RefundedAmount == p.PaidAmount {
			p.Status = "REFUNDED"
		} else {
			p.Status = "REFUNDED_PARTIAL"
		}

		if err := tx.Save(&p).Error; err != nil {
			return err
		}

		usedChannel = channel
		result = refund
		paymentCounter.WithLabelValues(strings.ToLower(p.Status)).Inc()
		return nil
	})

	return result, usedChannel, fallbackUsed, err
}

func (s *server) handleRefund(c *gin.Context) {
	tenantID := tenantIDFromGin(c)
	paymentID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payment id"})
		return
	}

	var req refundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	refund, channel, fallback, err := s.processRefund(uint(paymentID), tenantID, req.Amount, req.Reason)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "payment not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tenant_id":        tenantID,
		"refund_id":        refund.ID,
		"payment_id":       refund.PaymentID,
		"status":           refund.Status,
		"amount":           refund.Amount,
		"channel":          channel,
		"fallback_used":    fallback,
		"processed_at_utc": refund.CreatedAt.UTC().Format(time.RFC3339),
	})
}

func (s *server) handleListRefunds(c *gin.Context) {
	tenantID := tenantIDFromGin(c)
	paymentID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payment id"})
		return
	}

	var payment Payment
	if err := s.db.Where("id = ? AND tenant_id = ?", uint(paymentID), tenantID).First(&payment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "payment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read payment"})
		return
	}

	var refunds []Refund
	if err := s.db.Where("payment_id = ? AND tenant_id = ?", uint(paymentID), tenantID).Order("id asc").Find(&refunds).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read refunds"})
		return
	}
	c.JSON(http.StatusOK, refunds)
}

func (s *server) handleReconcile(c *gin.Context) {
	tenantID := tenantIDFromGin(c)
	var payments []Payment
	if err := s.db.Where("tenant_id = ?", tenantID).Order("id asc").Find(&payments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read payments"})
		return
	}

	mismatches := make([]gin.H, 0)
	now := time.Now().UTC()
	reconciled := 0

	for _, p := range payments {
		issue := ""
		if (p.Status == "PAID" || p.Status == "REFUNDED_PARTIAL" || p.Status == "REFUNDED") && !p.CallbackVerified {
			issue = "missing_verified_callback"
		}
		if p.RefundedAmount > p.PaidAmount {
			issue = "refund_exceeds_paid_amount"
		}

		if issue != "" {
			mismatches = append(mismatches, gin.H{
				"payment_id": p.ID,
				"issue":      issue,
			})
			continue
		}

		p.ReconciledAt = &now
		if err := s.db.Save(&p).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update reconciliation"})
			return
		}
		reconciled++
	}

	c.JSON(http.StatusOK, gin.H{
		"tenant_id":  tenantID,
		"total":      len(payments),
		"reconciled": reconciled,
		"mismatches": mismatches,
	})
}

type channelHealthRequest struct {
	Healthy bool `json:"healthy"`
}

func (s *server) handleChannelHealth(c *gin.Context) {
	channel := c.Param("channel")
	var req channelHealthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	if err := s.channels.SetHealth(channel, req.Healthy); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"channel": channel, "healthy": req.Healthy})
}

func (s *server) handleChannelSnapshot(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"channels": s.channels.Snapshot(), "active": s.channels.Pick()})
}

func initDB() *gorm.DB {
	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		dsn = os.Getenv("ConnectionStrings__PaymentDb")
	}

	var db *gorm.DB
	var err error
	if dsn != "" {
		dsn = normalizePostgresDSN(dsn)
		for i := 0; i < 20; i++ {
			db, err = gorm.Open(postgres.New(postgres.Config{
				DSN:                  dsn,
				PreferSimpleProtocol: true,
			}), gormConfig())
			if err == nil {
				configureDBPool(db)
				mErr := ensurePostgresSchema(db)
				if mErr == nil {
					return db
				}
				log.Printf("migrate failed (try %d/20): %v", i+1, mErr)
			} else {
				log.Printf("postgres connect failed (try %d/20): %v", i+1, err)
			}
			time.Sleep(1 * time.Second)
		}
		log.Printf("postgres not available, falling back to sqlite")
	}

	db, err = gorm.Open(sqlite.Open("payment.db"), gormConfig())
	if err != nil {
		log.Fatalf("sqlite connect: %v", err)
	}
	configureDBPool(db)
	if err := db.AutoMigrate(&Payment{}, &Refund{}, &PaymentCallbackLog{}); err != nil {
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

func buildHTTPRouter(db *gorm.DB, svc *server, gwMux *gw.ServeMux) *gin.Engine {
	router := gin.Default()

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	router.GET("/readyz", func(c *gin.Context) {
		if dbHealthy(db) {
			c.JSON(http.StatusOK, gin.H{"status": "ready"})
			return
		}
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "db unavailable"})
	})

	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	router.POST("/webhooks/payment-callback", svc.handleCallback)
	router.GET("/payments/reconcile", svc.handleReconcile)
	router.POST("/payments/:id/refunds", svc.handleRefund)
	router.GET("/payments/:id/refunds", svc.handleListRefunds)

	router.GET("/ops/channels", svc.handleChannelSnapshot)
	router.PUT("/ops/channels/:channel/health", svc.handleChannelHealth)

	// gRPC-Gateway endpoints.
	router.Any("/v1/*any", gin.WrapH(gwMux))
	return router
}

func main() {
	logger, _ := zap.NewProduction()
	defer func() { _ = logger.Sync() }()

	db := initDB()

	channels := newChannelRouter(os.Getenv("PAYMENT_CHANNELS"))
	callbackSecret := os.Getenv("PAYMENT_CALLBACK_SECRET")

	svc := &server{
		db:             db,
		logger:         logger,
		callbackSecret: callbackSecret,
		channels:       channels,
	}

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

	ctx := context.Background()
	gwMux := gw.NewServeMux(gw.WithIncomingHeaderMatcher(func(key string) (string, bool) {
		if strings.EqualFold(key, "X-Tenant-Id") {
			return "x-tenant-id", true
		}
		return gw.DefaultHeaderMatcher(key)
	}))
	if err := pb.RegisterPaymentServiceHandlerServer(ctx, gwMux, svc); err != nil {
		logger.Fatal("gw reg", zap.Error(err))
	}

	router := buildHTTPRouter(db, svc, gwMux)

	logger.Info("HTTP listening", zap.String("addr", ":8080"))
	if err := router.Run(":8080"); err != nil {
		logger.Fatal("http", zap.Error(err))
	}
}
