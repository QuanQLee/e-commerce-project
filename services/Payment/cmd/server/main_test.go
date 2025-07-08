package main

import (
	"context"
	"fmt"
	"testing"

	"github.com/glebarez/sqlite"
	"go.uber.org/zap"
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
	s := &server{db: db, logger: zap.NewNop()}
	req := &pb.CreatePaymentRequest{OrderId: "1", Amount: 100}

	resp, err := s.CreatePayment(context.Background(), req)
	if err != nil {
		t.Fatalf("CreatePayment returned error: %v", err)
	}
	if resp.PaymentId == "" {
		t.Errorf("expected non-empty payment_id")
	}
	if resp.Status != "PENDING" {
		t.Errorf("expected status 'PENDING', got %q", resp.Status)
	}
}

func TestUpdatePaymentStatus(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open db: %v", err)
	}
	if err := db.AutoMigrate(&Payment{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	s := &server{db: db, logger: zap.NewNop()}
	p := Payment{OrderID: "1", Amount: 100, Status: "PENDING"}
	if err := db.Create(&p).Error; err != nil {
		t.Fatalf("insert: %v", err)
	}
	req := &pb.UpdatePaymentStatusRequest{PaymentId: fmt.Sprint(p.ID), Status: "PAID"}
	resp, err := s.UpdatePaymentStatus(context.Background(), req)
	if err != nil {
		t.Fatalf("UpdatePaymentStatus returned error: %v", err)
	}
	if resp.Status != "PAID" {
		t.Errorf("expected status 'PAID', got %q", resp.Status)
	}
}
