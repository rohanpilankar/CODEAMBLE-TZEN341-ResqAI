export interface VolunteerLocation {
  latitude: number;
  longitude: number;
  city: string;
}

export interface Volunteer {
  uid: string;
  name: string;
  skills: string[];
  phone: string;
  email: string;
  location: VolunteerLocation;
  availability: boolean;
  assignedReports: string[]; // List of Report IDs
}
