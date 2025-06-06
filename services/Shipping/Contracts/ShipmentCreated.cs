using System;

namespace Shipping.Api.Contracts;

public record ShipmentCreated(Guid ShipmentId, string OrderId);
