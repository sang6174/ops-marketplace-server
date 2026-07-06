import { Address, AdministrativeDivision } from './address';
import { BuyerType, UserRole, SubAdminRole, VehicleType } from './enums.enum';

export abstract class User {
  constructor(
    public readonly id: string,
    private _email: string,
    private _fullName: string,
    private _phoneNumber: string,
    private _isActive: boolean,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  get email(): string {
    return this._email;
  }

  get fullName(): string {
    return this._fullName;
  }

  get phoneNumber(): string {
    return this._phoneNumber;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  changeEmail(newEmail: string): void {
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

    if (!newEmail || !emailRegex.test(newEmail)) {
      throw new Error('Invalid email address');
    }
    this._email = newEmail;
    this._touch();
  }

  changeFullName(newName: string): void {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Full name cannot be empty');
    }
    this._fullName = newName.trim();
    this._touch();
  }

  changePhoneNumber(newPhone: string): void {
    const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;
    if (!newPhone || !phoneRegex.test(newPhone)) {
      throw new Error('Invalid phone number format');
    }
    this._phoneNumber = newPhone;
    this._touch();
  }

  activate(): void {
    if (this._isActive) return;
    this._isActive = true;
    this._touch();
  }

  deactivate(): void {
    if (!this._isActive) return;
    this._isActive = false;
    this._touch();
  }

  protected _touch(): void {
    this._updatedAt = new Date();
  }
}

export class Seller extends User {
  constructor(
    id: string,
    email: string,
    fullName: string,
    phoneNumber: string,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
    private _farmName: string,
    private _addresses: Address[],
    private _taxId: string,
    private _businessLicense: string,
    private _bankAccount: string,
    private _isVerified: boolean,
    private _rating: number,
  ) {
    super(id, email, fullName, phoneNumber, isActive, createdAt, updatedAt);
  }

  get farmName(): string {
    return this._farmName;
  }

  get addresses(): Address[] {
    return this._addresses;
  }

  get taxId(): string {
    return this._taxId;
  }

  get businessLicense(): string {
    return this._businessLicense;
  }

  get bankAccount(): string {
    return this._bankAccount;
  }

  get isVerified(): boolean {
    return this._isVerified;
  }

  get rating(): number {
    return this._rating;
  }

  changeFarmName(newFarmName: string): void {
    if (!newFarmName || newFarmName.trim().length === 0) {
      throw new Error('Farm name cannot be empty');
    }
    this._farmName = newFarmName.trim();
    this._touch();
  }

  updateAddresses(newAddresses: Address[]): void {
    this._addresses = newAddresses;
    this._touch();
  }

  changeBankAccount(newBankAccount: string): void {
    if (!newBankAccount || newBankAccount.length < 5) {
      throw new Error('Invalid bank account number');
    }
    this._bankAccount = newBankAccount;
    this._touch();
  }

  verify(): void {
    this._isVerified = true;
    this._touch();
  }

  unverify(): void {
    this._isVerified = false;
    this._touch();
  }

  updateRating(newRating: number): void {
    if (newRating < 0 || newRating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }
    this._rating = newRating;
    this._touch();
  }

  changeBusinessLicense(newLicense: string): void {
    if (!newLicense || newLicense.trim().length === 0) {
      throw new Error('Business license cannot be empty');
    }
    this._businessLicense = newLicense.trim();
    this._touch();
  }

  changeTaxId(newTaxId: string): void {
    const taxIdRegex = /^\d{10}$/;
    if (!newTaxId || !taxIdRegex.test(newTaxId.trim())) {
      throw new Error('Invalid Vietnam tax ID format (must be 10 digits)');
    }
    this._taxId = newTaxId.trim();
    this._touch();
  }
}

export class Buyer extends User {
  constructor(
    id: string,
    email: string,
    fullName: string,
    phoneNumber: string,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
    private _buyerType: BuyerType,
    private _addresses: Address[],
    private _loyaltyPoints: number,
    private _taxId?: string,
    private _companyName?: string,
    private _businessLicense?: string,
  ) {
    super(id, email, fullName, phoneNumber, isActive, createdAt, updatedAt);
  }

  get buyerType(): BuyerType {
    return this._buyerType;
  }

  get addresses(): Address[] {
    return this._addresses;
  }

  get loyaltyPoints(): number {
    return this._loyaltyPoints;
  }

  get taxId(): string | undefined {
    return this._taxId;
  }

  get companyName(): string | undefined {
    return this._companyName;
  }

  get businessLicense(): string | undefined {
    return this._businessLicense;
  }

  updateAddresses(newAddresses: Address[]): void {
    this._addresses = newAddresses;
    this._touch();
  }

  addLoyaltyPoints(points: number): void {
    if (points <= 0) {
      throw new Error('Points must be greater than 0');
    }
    this._loyaltyPoints += points;
    this._touch();
  }

  redeemLoyaltyPoints(points: number): void {
    if (points <= 0) {
      throw new Error('Points must be greater than 0');
    }
    if (points > this._loyaltyPoints) {
      throw new Error(
        `Insufficient loyalty points. Available: ${this._loyaltyPoints}`,
      );
    }
    this._loyaltyPoints -= points;
    this._touch();
  }

  changeBuyerType(newType: BuyerType): void {
    this._buyerType = newType;
    this._touch();
  }

  changeCompanyName(newName?: string): void {
    this._companyName = newName?.trim() || undefined;
    this._touch();
  }

  changeTaxId(newTaxId?: string): void {
    this._taxId = newTaxId?.trim() || undefined;
    this._touch();
  }

  changeBusinessLicense(newLicense?: string): void {
    this._businessLicense = newLicense?.trim() || undefined;
    this._touch();
  }
}

export class Admin extends User {
  constructor(
    id: string,
    email: string,
    fullName: string,
    phoneNumber: string,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
    private _role: UserRole,
    private _subRole: SubAdminRole,
  ) {
    super(id, email, fullName, phoneNumber, isActive, createdAt, updatedAt);
  }

  get role(): UserRole {
    return this._role;
  }

  get subRole(): SubAdminRole {
    return this._subRole;
  }

  changeRole(newRole: UserRole): void {
    this._role = newRole;
    this._touch();
  }

  changeSubRole(newSubRole: SubAdminRole): void {
    this._subRole = newSubRole;
    this._touch();
  }
}
export class Shipper {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    private _vehicleType: VehicleType,
    private _licensePlate: string,
    private _driverLicense: string,
    private _vehicleDescription: string | null,
    private _operatingAreas: AdministrativeDivision[],
    private _isAvailable: boolean,
    private _currentLat: number | null,
    private _currentLng: number | null,
    private _rating: number | null,
    private _totalDeliveries: number,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    private _deletedAt: Date | null,
  ) {}

  static create(props: {
    userId: string;
    vehicleType: VehicleType;
    licensePlate: string;
    driverLicense: string;
    vehicleDescription?: string;
    operatingAreas: AdministrativeDivision[];
  }): Shipper {
    return new Shipper(
      crypto.randomUUID(),
      props.userId,
      props.vehicleType,
      props.licensePlate,
      props.driverLicense,
      props.vehicleDescription || null,
      props.operatingAreas,
      true, // mặc định có sẵn
      null,
      null,
      null,
      0,
      new Date(),
      new Date(),
      null,
    );
  }

  get vehicleType(): VehicleType {
    return this._vehicleType;
  }

  get licensePlate(): string {
    return this._licensePlate;
  }

  get driverLicense(): string {
    return this._driverLicense;
  }

  get vehicleDescription(): string | null {
    return this._vehicleDescription;
  }

  get operatingAreas(): AdministrativeDivision[] {
    return [...this._operatingAreas];
  }

  get isAvailable(): boolean {
    return this._isAvailable;
  }

  get currentLocation(): { lat: number | null; lng: number | null } {
    return { lat: this._currentLat, lng: this._currentLng };
  }

  get rating(): number | null {
    return this._rating;
  }

  get totalDeliveries(): number {
    return this._totalDeliveries;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  updateVehicle(
    vehicleType: VehicleType,
    licensePlate: string,
    driverLicense: string,
    vehicleDescription?: string,
  ): void {
    this._vehicleType = vehicleType;
    this._licensePlate = licensePlate;
    this._driverLicense = driverLicense;
    this._vehicleDescription = vehicleDescription || null;
    this._touch();
  }

  addOperatingArea(area: AdministrativeDivision): void {
    if (!this._operatingAreas.includes(area)) {
      this._operatingAreas.push(area);
      this._touch();
    }
  }

  removeOperatingArea(area: AdministrativeDivision): void {
    this._operatingAreas = this._operatingAreas.filter((a) => a !== area);
    this._touch();
  }

  updateLocation(lat: number, lng: number): void {
    this._currentLat = lat;
    this._currentLng = lng;
    this._touch();
  }

  setAvailable(): void {
    this._isAvailable = true;
    this._touch();
  }

  setUnavailable(): void {
    this._isAvailable = false;
    this._touch();
  }

  updateRating(newRating: number): void {
    if (newRating < 1 || newRating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    const total = this._totalDeliveries;
    const currentTotal = this._rating ? this._rating * total : 0;
    this._rating = (currentTotal + newRating) / (total + 1);
    this._totalDeliveries += 1;
    this._touch();
  }

  delete(): void {
    if (this._deletedAt !== null) return;
    this._deletedAt = new Date();
    this._isAvailable = false;
    this._touch();
  }

  restore(): void {
    this._deletedAt = null;
    this._touch();
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }

  equals(other: Shipper): boolean {
    return this.id === other.id;
  }
}
