package main

import (
	"context"
	"testing"

	pb "github.com/QuanQLee/e-commerce-project/services/Payment/api"
)

func TestCreatePayment(t *testing.T) {
	s := &server{db: initDB()}
	req := &pb.CreatePaymentRequest{OrderId: "1", Amount: 100}

	resp, err := s.CreatePayment(context.Background(), req)
	if err != nil {
		t.Fatalf("CreatePayment returned error: %v", err)
	}
	if resp.PaymentId != "1" {
		t.Errorf("expected payment_id '1', got %q", resp.PaymentId)
	}
	if resp.Status != "PAID" {
		t.Errorf("expected status 'PAID', got %q", resp.Status)
	}
}
