import { Gender } from '@prisma/client';

export interface IProfile {
  name: string | null;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  age: number | null;
  gender: Gender | null;
  location: string | null;
  avatar: string | null;
  bio: string | null;
  countryVisited: string[];
  userId: string;
}
