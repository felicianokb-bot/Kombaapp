
export type ViewState = 'home' | 'agita' | 'services' | 'map' | 'chat' | 'profile' | 'wallet' | 'history' | 'boosts' | 'plans' | 'edit_profile' | 'public_profile' | 'payment_methods' | 'security' | 'settings';
export type Language = 'pt' | 'en';
export type BoostTier = 'elite' | 'max' | 'pro' | 'lite' | 'start' | 'none';

export type TransportType = 'plane' | 'car' | 'bus' | 'boat' | 'truck';
export type CapacityUnit = 'kg' | 'liters' | 'items' | 'seats';

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  rating: number;
  verified: boolean;
  isPremium?: boolean;
  location: string;
  phone?: string;
  joinedDate: string;
}

export interface AuthUser extends User {
  token: string;
}

export interface Trip {
  id: string;
  hostId: string; // Foreign Key to User
  host?: User; // Hydrated user object
  origin: string;
  destination: string;
  date: string; // ISO Date
  time: string;
  transportType: TransportType;
  capacity: number;
  capacityUnit: CapacityUnit;
  pricePerUnit: number; // Kz
  currency: string;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  stops?: string[];
}

export interface ServiceProvider {
  id: string;
  userId: string; // Foreign Key to User
  user?: User;
  businessName: string;
  category: 'driver' | 'delivery' | 'barber' | 'tech' | 'beauty' | 'education' | 'events' | 'other';
  description: string;
  rating: number;
  location: string;
  basePrice: number;
  priceUnit: string; // e.g., "per hour", "per trip"
  coverImage: string;
  gallery?: string[];
  tags: string[];
  available: boolean;
  distance?: string; // Calculated field
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'payment' | 'earning';
  status: 'pending' | 'completed' | 'failed';
  date: string;
  reference: string;
}

export interface Job {
  id: string;
  clientId: string;
  origin: string;
  destination: string;
  radiusKm: number;
  createdAt: string;
  status: 'pending' | 'assigned' | 'no_service';
  assignedProviderId?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'other';
  timestamp: Date;
  attachment?: string;
}
