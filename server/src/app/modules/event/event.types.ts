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
  description: string;
  startDate: Date;
  startTime: string;
  endTime: string;
  maxParticipantsCount: number;
  eventStatus: EventStatus;
  lat: number;
  long: number;
  isPrivate: boolean;
  interests: string[];
  distanceKm: number;
  participantCount: number;
  spotsLeft: number;
  isOnWaitlist: boolean;
  isJoined: boolean;
  eventTypes: { id: string; title: string; thumbnail: string }[];
  host: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  createdAt: Date;
}
