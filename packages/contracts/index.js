const { z } = require("zod");

const MAX_MESSAGE_LENGTH = 1000;

const UUID = () => z.string().uuid();
const ISODate = () => z.string().datetime();

// Entities
const User = z.object({
  id: UUID(),
  externalId: UUID(),
  nickname: z.string().nullable().optional(),
  createdAt: ISODate(),
  lastSeenAt: ISODate().nullable().optional(),
});

const Room = z.object({
  id: UUID(),
  slug: z.string().min(1),
  name: z.string().min(1),
  isPublic: z.boolean().default(true),
  createdAt: ISODateTime(),
});

const RoomMember = z.object({
  roomId: UUID(),
  userId: UUID(),
  joinedAt: ISODateTime(),
  lastReadAt: ISODateTime().nullable().optional(),
});

const Message = z.object({
  id: UUID(),
  roomId: UUID(),
  senderId: UUID(),
  clientTempId: UUID().nullable().optional(),
  text: z.string().min(1).max(MAX_MESSAGE_LENGTH),
  createdAt: ISODateTime(),
  editedAt: ISODateTime().nullable().optional(),
  deletedAt: ISODateTime().nullable().optional(),
});

// Inputs
const MessageSendInput = z.object({
  roomId: UUID(),
  clientTempId: UUID(),
  text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

const JoinRoomInput = z.object({
  roomId: UUID(),
});

const IdentifyInput = z.object({
  id: UUID(),
  nickname: z.string().optional(),
});

// Ack envelope (Socket ACK)
const Ack = z.object({
  ok: z.boolean(),
  event: z.string(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

const Schemas = {
  User,
  Room,
  RoomMember,
  Message,
  MessageSendInput,
  JoinRoomInput,
  IdentifyInput,
  Ack,
};

module.exports = {
  MAX_MESSAGE_LENGTH,
  Schemas,
  UUID,
  ISODate,
};
