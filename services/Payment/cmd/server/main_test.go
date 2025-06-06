package main

import (
    "context"
    "testing"

    pb "payment/api"
)

func TestCreatePayment(t *testing.T) {
    s := &server{}
    req := &pb.CreatePaymentRequest{OrderId: "1", Amount: 100}

    resp, err := s.CreatePayment(context.Background(), req)
    if err != nil {
        t.Fatalf("CreatePayment returned error: %v", err)
    }
    if resp.PaymentId != "demo" {
        t.Errorf("expected payment_id 'demo', got %q", resp.PaymentId)
    }
    if resp.Status != "created" {
        t.Errorf("expected status 'created', got %q", resp.Status)
    }
}
