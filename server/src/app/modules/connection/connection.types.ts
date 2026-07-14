export enum BLOCK_STATUS {
  BLOCKED = 'BLOCKED',
  UNBLOCKED = 'UNBLOCKED',
}

export type TGeMyConnectionRequests = {
  data: {
    friendshipId: string;
    userId: string;
    isPremium: boolean;
    name: string | null;
    avatar: string | null;
    bio: string | null;
    requestedAt: Date;
    connectionStatus: 'PENDING' | 'ACCEPT';
  }[];
  meta: {
    totalRequests: number;
    totalPages: number;
    links: {
      currentPage: number;
      nextPage: number | null;
      previousPage: number | null;
      firstPage: number;
      lastPage: number;
    };
  };
};
