package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"go.uber.org/zap"
	"google.golang.org/grpc/metadata"
	"gorm.io/gorm"

	pb "github.com/QuanQLee/e-commerce-project/services/Payment/api"
)

func testServer(t *testing.T) *server {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open db: %v", err)
	}
	if err := db.AutoMigrate(&Payment{}, &Refund{}, &PaymentCallbackLog{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}

	return &server{
		db:             db,
		logger:         zap.NewNop(),
		callbackSecret: "secret-key",
		channels:       newChannelRouter("wechat,alipay"),
	}
}

func TestCreatePayment(t *testing.T) {
	s := testServer(t)
	req := &pb.CreatePaymentRequest{OrderId: "1", Amount: 100}

	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("x-tenant-id", "tenant-a"))
	resp, err := s.CreatePayment(ctx, req)
	if err != nil {
		t.Fatalf("CreatePayment returned error: %v", err)
	}
	if resp.PaymentId == "" {
		t.Errorf("expected non-empty payment_id")
	}
	if resp.Status != "PENDING" {
		t.Errorf("expected status 'PENDING', got %q", resp.Status)
	}

	var payment Payment
	if err := s.db.First(&payment, "id = ?", resp.PaymentId).Error; err != nil {
		t.Fatalf("load payment: %v", err)
	}
	if payment.TenantID != "tenant-a" {
		t.Fatalf("expected tenant-a, got %s", payment.TenantID)
	}
}

func TestUpdatePaymentStatus(t *testing.T) {
	s := testServer(t)

	p := Payment{TenantID: "tenant-a", OrderID: "1", Amount: 100, Status: "PENDING", Channel: "wechat"}
	if err := s.db.Create(&p).Error; err != nil {
		t.Fatalf("insert: %v", err)
	}

	req := &pb.UpdatePaymentStatusRequest{PaymentId: fmt.Sprint(p.ID), Status: "PAID"}
	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("x-tenant-id", "tenant-a"))
	resp, err := s.UpdatePaymentStatus(ctx, req)
	if err != nil {
		t.Fatalf("UpdatePaymentStatus returned error: %v", err)
	}
	if resp.Status != "PAID" {
		t.Errorf("expected status 'PAID', got %q", resp.Status)
	}
}

func TestListPayments_FiltersByTenant(t *testing.T) {
	s := testServer(t)

	payments := []Payment{
		{TenantID: "tenant-a", OrderID: "1", Amount: 100, Status: "PENDING", Channel: "wechat"},
		{TenantID: "tenant-b", OrderID: "2", Amount: 200, Status: "PENDING", Channel: "alipay"},
	}
	if err := s.db.Create(&payments).Error; err != nil {
		t.Fatalf("insert payments: %v", err)
	}

	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("x-tenant-id", "tenant-a"))
	resp, err := s.ListPayments(ctx, nil)
	if err != nil {
		t.Fatalf("ListPayments returned error: %v", err)
	}
	if len(resp.Payments) != 1 {
		t.Fatalf("expected 1 payment, got %d", len(resp.Payments))
	}
}

func TestVerifyCallbackSignature(t *testing.T) {
	s := testServer(t)

	payload := `{"payment_id":1,"status":"PAID"}`
	ts := "1710000000"
	mac := hmac.New(sha256.New, []byte("secret-key"))
	_, _ = mac.Write([]byte(ts + "." + payload))
	sig := hex.EncodeToString(mac.Sum(nil))

	if !s.verifyCallbackSignature(ts, payload, sig) {
		t.Fatalf("expected signature verification pass")
	}
	if s.verifyCallbackSignature(ts, payload, "invalid") {
		t.Fatalf("expected signature verification fail")
	}
}

func TestRefundUsesFallbackChannelWhenPrimaryDown(t *testing.T) {
	s := testServer(t)

	p := Payment{
		TenantID:         "tenant-a",
		OrderID:          "2",
		Amount:           100,
		Status:           "PAID",
		Channel:          "wechat",
		PaidAmount:       100,
		CallbackVerified: true,
	}
	if err := s.db.Create(&p).Error; err != nil {
		t.Fatalf("insert payment: %v", err)
	}

	if err := s.channels.SetHealth("wechat", false); err != nil {
		t.Fatalf("set channel health: %v", err)
	}

	refund, channel, fallbackUsed, err := s.processRefund(p.ID, "tenant-a", 40, "customer request")
	if err != nil {
		t.Fatalf("processRefund: %v", err)
	}
	if refund == nil {
		t.Fatalf("expected refund object")
	}
	if !fallbackUsed {
		t.Fatalf("expected fallback to be used")
	}
	if channel != "alipay" {
		t.Fatalf("expected fallback channel alipay, got %s", channel)
	}

	var updated Payment
	if err := s.db.First(&updated, p.ID).Error; err != nil {
		t.Fatalf("load updated payment: %v", err)
	}
	if updated.Status != "REFUNDED_PARTIAL" {
		t.Fatalf("expected REFUNDED_PARTIAL, got %s", updated.Status)
	}
	if updated.RefundedAmount != 40 {
		t.Fatalf("expected refunded amount 40, got %v", updated.RefundedAmount)
	}
}
