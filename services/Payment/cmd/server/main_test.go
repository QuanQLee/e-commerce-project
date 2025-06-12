package main

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	pb "github.com/QuanQLee/e-commerce-project/services/Payment/api"
)

func TestCreatePayment(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open db: %v", err)
	}
	if err := db.AutoMigrate(&Payment{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	s := &server{db: db}
	req := &pb.CreatePaymentRequest{OrderId: "1", Amount: 100}

	resp, err := s.CreatePayment(context.Background(), req)
	if err != nil {
		t.Fatalf("CreatePayment returned error: %v", err)
	}
	if resp.PaymentId == "" {
		t.Errorf("expected non-empty payment_id")
	}
	if resp.Status != "PAID" {
		t.Errorf("expected status 'PAID', got %q", resp.Status)
	}
}
