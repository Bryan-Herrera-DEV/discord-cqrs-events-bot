export interface Guild {
  guildId: string;
  name: string;
  ownerId?: string;
  active: boolean;
  joinedAt: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
