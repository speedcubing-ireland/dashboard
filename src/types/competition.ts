export interface APICompetition {
  id: string;
  name: string;
  city: string;
  country: string;
  date: {
    from: string;
    till: string;
    numberOfDays: number;
  };
  isCanceled: boolean;
  events: string[];
  registrationOpen?: string | null;
  registrationClose?: string | null;
  wcaDelegates: Array<{
    name: string;
    email: string;
  }>;
  organisers: Array<{
    name: string;
    email: string;
  }>;
  venue: {
    name: string;
    address: string;
    details?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  information?: string;
  externalWebsite?: string;
}
