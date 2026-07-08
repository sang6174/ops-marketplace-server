import {
  ShipmentResponse,
  ShipmentListResponse,
  CreateShipmentInput,
  AssignShipperInput,
  UpdateTrackingInput,
  CancelShipmentInput,
  GetShipmentsInput,
} from '@modules/shipment/interfaces/dtos/shipment.dto';
import { ShipmentStatus } from '@domain/entities/enums.enum';

export interface ICreateShipmentUseCase {
  execute(input: CreateShipmentInput): Promise<ShipmentResponse>;
}

export interface IAssignShipperUseCase {
  execute(input: AssignShipperInput): Promise<ShipmentResponse>;
}

export interface IUpdateShipmentStatusUseCase {
  execute(input: {
    shipmentId: string;
    userId: string;
    status: ShipmentStatus;
    reason?: string;
  }): Promise<ShipmentResponse>;
}

export interface IUpdateTrackingUseCase {
  execute(input: UpdateTrackingInput): Promise<ShipmentResponse>;
}

export interface ICancelShipmentUseCase {
  execute(input: CancelShipmentInput): Promise<ShipmentResponse>;
}

export interface IGetShipmentByIdUseCase {
  execute(shipmentId: string): Promise<ShipmentResponse>;
}

export interface IGetShipmentByOrderIdUseCase {
  execute(orderId: string): Promise<ShipmentResponse>;
}

export interface IGetShipmentsUseCase {
  execute(input: GetShipmentsInput): Promise<ShipmentListResponse>;
}

export interface IAssignPendingShipmentsUseCase {
  execute(): Promise<{ assigned: number; failed: number }>;
}

export interface IShipmentDashboardUseCase {
  execute(): Promise<{
    total: number;
    pending: number;
    assigned: number;
    inTransit: number;
    delivered: number;
    failed: number;
    returned: number;
  }>;
}
