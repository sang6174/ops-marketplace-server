import { Address, AdministrativeDivision } from '../value-objects/address';
import { BuyerType, UserRole, SubAdminRole, VehicleType } from './enums.enum';

export class SellerProfile {
  constructor(
    private _farmName: string,
    private _addresses: Address[],
    private _taxId: string,
    private _businessLicense: string,
    private _bankAccount: string,
    private _isVerified: boolean = false,
    private _rating: number = 0,
  ) {}

  // Getters
  get farmName(): string {
    return this._farmName;
  }
  get addresses(): Address[] {
    return [...this._addresses];
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

  changeFarmName(newName: string): void {
    if (!newName || newName.trim().length === 0)
      throw new Error('Farm name cannot be empty');
    this._farmName = newName.trim();
  }

  updateAddresses(addresses: Address[]): void {
    this._addresses = addresses;
  }

  changeBankAccount(account: string): void {
    if (!account || account.length < 5)
      throw new Error('Invalid bank account number');
    this._bankAccount = account;
  }

  changeTaxId(taxId: string): void {
    const regex = /^\d{10}$/;
    if (!regex.test(taxId.trim()))
      throw new Error('Invalid Vietnam tax ID (10 digits)');
    this._taxId = taxId.trim();
  }

  changeBusinessLicense(license: string): void {
    if (!license || license.trim().length === 0)
      throw new Error('Business license cannot be empty');
    this._businessLicense = license.trim();
  }

  verify(): void {
    this._isVerified = true;
  }
  unverify(): void {
    this._isVerified = false;
  }

  updateRating(rating: number): void {
    if (rating < 0 || rating > 5)
      throw new Error('Rating must be between 0 and 5');
    this._rating = rating;
  }
}

export class BuyerProfile {
  constructor(
    private _buyerType: BuyerType,
    private _addresses: Address[],
    private _loyaltyPoints: number = 0,
    private _taxId?: string,
    private _companyName?: string,
    private _businessLicense?: string,
  ) {}

  get buyerType(): BuyerType {
    return this._buyerType;
  }
  get addresses(): Address[] {
    return [...this._addresses];
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

  updateAddresses(addresses: Address[]): void {
    this._addresses = addresses;
  }
  changeBuyerType(type: BuyerType): void {
    this._buyerType = type;
  }
  changeCompanyName(name?: string): void {
    this._companyName = name?.trim() || undefined;
  }
  changeTaxId(id?: string): void {
    this._taxId = id?.trim() || undefined;
  }
  changeBusinessLicense(license?: string): void {
    this._businessLicense = license?.trim() || undefined;
  }

  addLoyaltyPoints(points: number): void {
    if (points <= 0) throw new Error('Points must be greater than 0');
    this._loyaltyPoints += points;
  }

  redeemLoyaltyPoints(points: number): void {
    if (points <= 0) throw new Error('Points must be greater than 0');
    if (points > this._loyaltyPoints)
      throw new Error(`Insufficient points. Available: ${this._loyaltyPoints}`);
    this._loyaltyPoints -= points;
  }
}

export class AdminProfile {
  constructor(private _subRole: SubAdminRole) {}

  get subRole(): SubAdminRole {
    return this._subRole;
  }

  changeSubRole(role: SubAdminRole): void {
    this._subRole = role;
  }
}

export class ShipperProfile {
  constructor(
    private _vehicleType: VehicleType,
    private _licensePlate: string,
    private _driverLicense: string,
    private _vehicleDescription: string | null = null,
    private _operatingAreas: AdministrativeDivision[] = [],
    private _isAvailable: boolean = true,
    private _currentLat: number | null = null,
    private _currentLng: number | null = null,
    private _rating: number | null = null,
    private _totalDeliveries: number = 0,
  ) {}

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

  updateVehicle(
    vehicleType: VehicleType,
    licensePlate: string,
    driverLicense: string,
    description?: string,
  ): void {
    this._vehicleType = vehicleType;
    this._licensePlate = licensePlate;
    this._driverLicense = driverLicense;
    this._vehicleDescription = description ?? null;
  }

  addOperatingArea(area: AdministrativeDivision): void {
    if (!this._operatingAreas.some((a) => a.equals(area))) {
      this._operatingAreas.push(area);
    }
  }

  removeOperatingArea(area: AdministrativeDivision): void {
    this._operatingAreas = this._operatingAreas.filter((a) => !a.equals(area));
  }

  updateLocation(lat: number, lng: number): void {
    this._currentLat = lat;
    this._currentLng = lng;
  }

  setAvailable(): void {
    this._isAvailable = true;
  }
  setUnavailable(): void {
    this._isAvailable = false;
  }

  updateRating(newRating: number): void {
    if (newRating < 1 || newRating > 5)
      throw new Error('Rating must be between 1 and 5');
    const total = this._totalDeliveries;
    const currentTotal = this._rating ? this._rating * total : 0;
    this._rating = (currentTotal + newRating) / (total + 1);
    this._totalDeliveries += 1;
  }
}

export class User {
  private _roles: UserRole[] = [];
  private _updatedAt: Date;

  private constructor(
    public readonly id: string,
    private _email: string,
    private _fullName: string,
    private _phoneNumber: string,
    private _isActive: boolean,
    public readonly createdAt: Date,
    private _sellerProfile?: SellerProfile,
    private _buyerProfile?: BuyerProfile,
    private _adminProfile?: AdminProfile,
    private _shipperProfile?: ShipperProfile,
  ) {
    this._updatedAt = new Date();
    if (this._sellerProfile) this._roles.push(UserRole.SELLER);
    if (this._buyerProfile) this._roles.push(UserRole.BUYER);
    if (this._adminProfile) this._roles.push(UserRole.ADMIN);
    if (this._shipperProfile) this._roles.push(UserRole.SHIPPER);
  }

  static createSeller(props: {
    email: string;
    fullName: string;
    phoneNumber: string;
    farmName: string;
    addresses: Address[];
    taxId: string;
    businessLicense: string;
    bankAccount: string;
  }): User {
    const sellerProfile = new SellerProfile(
      props.farmName,
      props.addresses,
      props.taxId,
      props.businessLicense,
      props.bankAccount,
    );
    return new User(
      crypto.randomUUID(),
      props.email,
      props.fullName,
      props.phoneNumber,
      true,
      new Date(),
      sellerProfile,
      undefined,
      undefined,
      undefined,
    );
  }

  static createBuyer(props: {
    email: string;
    fullName: string;
    phoneNumber: string;
    buyerType: BuyerType;
    addresses: Address[];
    taxId?: string;
    companyName?: string;
    businessLicense?: string;
  }): User {
    const buyerProfile = new BuyerProfile(
      props.buyerType,
      props.addresses,
      0,
      props.taxId,
      props.companyName,
      props.businessLicense,
    );
    return new User(
      crypto.randomUUID(),
      props.email,
      props.fullName,
      props.phoneNumber,
      true,
      new Date(),
      undefined,
      buyerProfile,
      undefined,
      undefined,
    );
  }

  static createAdmin(props: {
    email: string;
    fullName: string;
    phoneNumber: string;
    subRole: SubAdminRole;
  }): User {
    const adminProfile = new AdminProfile(props.subRole);
    return new User(
      crypto.randomUUID(),
      props.email,
      props.fullName,
      props.phoneNumber,
      true,
      new Date(),
      undefined,
      undefined,
      adminProfile,
      undefined,
    );
  }

  static createShipper(props: {
    email: string;
    fullName: string;
    phoneNumber: string;
    vehicleType: VehicleType;
    licensePlate: string;
    driverLicense: string;
    vehicleDescription?: string;
    operatingAreas?: AdministrativeDivision[];
  }): User {
    const shipperProfile = new ShipperProfile(
      props.vehicleType,
      props.licensePlate,
      props.driverLicense,
      props.vehicleDescription ?? null,
      props.operatingAreas ?? [],
    );
    return new User(
      crypto.randomUUID(),
      props.email,
      props.fullName,
      props.phoneNumber,
      true,
      new Date(),
      undefined,
      undefined,
      undefined,
      shipperProfile,
    );
  }

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
  get roles(): UserRole[] {
    return [...this._roles];
  }

  hasRole(role: UserRole): boolean {
    return this._roles.includes(role);
  }

  get sellerProfile(): SellerProfile | undefined {
    return this._sellerProfile;
  }
  get buyerProfile(): BuyerProfile | undefined {
    return this._buyerProfile;
  }
  get adminProfile(): AdminProfile | undefined {
    return this._adminProfile;
  }
  get shipperProfile(): ShipperProfile | undefined {
    return this._shipperProfile;
  }

  changeEmail(newEmail: string): void {
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    if (!emailRegex.test(newEmail)) throw new Error('Invalid email address');
    this._email = newEmail;
    this._touch();
  }

  changeFullName(newName: string): void {
    if (!newName || newName.trim().length === 0)
      throw new Error('Full name cannot be empty');
    this._fullName = newName.trim();
    this._touch();
  }

  changePhoneNumber(newPhone: string): void {
    const phoneRegex = /^(\+84|0)[0-9]{9,10}$/;
    if (!phoneRegex.test(newPhone)) throw new Error('Invalid phone number');
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

  addSellerProfile(profile: SellerProfile): void {
    if (this._sellerProfile) throw new Error('Seller profile already exists');
    this._sellerProfile = profile;
    this._roles.push(UserRole.SELLER);
    this._touch();
  }

  addBuyerProfile(profile: BuyerProfile): void {
    if (this._buyerProfile) throw new Error('Buyer profile already exists');
    this._buyerProfile = profile;
    this._roles.push(UserRole.BUYER);
    this._touch();
  }

  addAdminProfile(profile: AdminProfile): void {
    if (this._adminProfile) throw new Error('Admin profile already exists');
    this._adminProfile = profile;
    this._roles.push(UserRole.ADMIN);
    this._touch();
  }

  addShipperProfile(profile: ShipperProfile): void {
    if (this._shipperProfile) throw new Error('Shipper profile already exists');
    this._shipperProfile = profile;
    this._roles.push(UserRole.SHIPPER);
    this._touch();
  }

  removeRole(role: UserRole): void {
    if (role === UserRole.ADMIN) this._adminProfile = undefined;
    else if (role === UserRole.SELLER) this._sellerProfile = undefined;
    else if (role === UserRole.BUYER) this._buyerProfile = undefined;
    else if (role === UserRole.SHIPPER) this._shipperProfile = undefined;
    this._roles = this._roles.filter((r) => r !== role);
    this._touch();
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }

  equals(other: User): boolean {
    return this.id === other.id;
  }
}
