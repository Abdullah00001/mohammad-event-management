import { EventStatus } from "@prisma/client";

export interface EventListingMeta {
  totalEvents: number;
  totalPages: number;
  links: {
    currentPage: number;
    nextPage: number | null;
    previousPage: number | null;
    firstPage: number;
    lastPage: number;
  };
}

export interface EventListingResult {
  data: EventItem[];
  meta: EventListingMeta;
}

export interface EventItem {
  id: string;
  eventName: string;
  startDate: Date;
  maxParticipantsCount: number;
  eventStatus: EventStatus;
  lat: number;
  lng: number;
  distanceKm: number;
  participantCount: number;
  spotsLeft: number;
  isOnWaitList: boolean;
  isJoined: boolean;
  eventType: { id: string; title: string; thumbnail: string };
  createdAt: Date;
}
