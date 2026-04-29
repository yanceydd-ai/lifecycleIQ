export interface Location {
  id: string;
  name: string;
  building: string | null;
  room: string | null;
  locationType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLocationInput {
  name: string;
  building?: string;
  room?: string;
  locationType?: string;
}

export interface UpdateLocationInput {
  name?: string;
  building?: string;
  room?: string;
  locationType?: string;
}
