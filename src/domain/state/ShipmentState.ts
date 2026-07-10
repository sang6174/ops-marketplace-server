import { ShipmentStatus } from '../entities/enums.enum';

export class ShipmentState {
  private constructor(private readonly _value: ShipmentStatus) {}

  static pending(): ShipmentState {
    return new ShipmentState(ShipmentStatus.PENDING);
  }
  static assigned(): ShipmentState {
    return new ShipmentState(ShipmentStatus.ASSIGNED);
  }
  static pickedUp(): ShipmentState {
    return new ShipmentState(ShipmentStatus.PICKED_UP);
  }
  static inTransit(): ShipmentState {
    return new ShipmentState(ShipmentStatus.IN_TRANSIT);
  }
  static delivered(): ShipmentState {
    return new ShipmentState(ShipmentStatus.DELIVERED);
  }
  static failed(): ShipmentState {
    return new ShipmentState(ShipmentStatus.FAILED);
  }
  static returned(): ShipmentState {
    return new ShipmentState(ShipmentStatus.RETURNED);
  }

  get value(): ShipmentStatus {
    return this._value;
  }

  equals(other: ShipmentState): boolean {
    return other instanceof ShipmentState && this._value === other._value;
  }

  isTerminal(): boolean {
    return (
      this._value === ShipmentStatus.DELIVERED ||
      this._value === ShipmentStatus.FAILED ||
      this._value === ShipmentStatus.RETURNED
    );
  }

  canBeCancelled(): boolean {
    return (
      this._value === ShipmentStatus.PENDING ||
      this._value === ShipmentStatus.ASSIGNED
    );
  }

  canTransitionTo(newState: ShipmentState): boolean {
    const transitions: Record<ShipmentStatus, ShipmentStatus[]> = {
      [ShipmentStatus.PENDING]: [
        ShipmentStatus.ASSIGNED,
        ShipmentStatus.FAILED,
      ],
      [ShipmentStatus.ASSIGNED]: [
        ShipmentStatus.PICKED_UP,
        ShipmentStatus.FAILED,
      ],
      [ShipmentStatus.PICKED_UP]: [
        ShipmentStatus.IN_TRANSIT,
        ShipmentStatus.FAILED,
      ],
      [ShipmentStatus.IN_TRANSIT]: [
        ShipmentStatus.DELIVERED,
        ShipmentStatus.FAILED,
      ],
      [ShipmentStatus.DELIVERED]: [ShipmentStatus.RETURNED],
      [ShipmentStatus.FAILED]: [],
      [ShipmentStatus.RETURNED]: [],
    };
    return transitions[this._value]?.includes(newState.value) || false;
  }
}
