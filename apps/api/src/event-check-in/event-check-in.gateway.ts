import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { parseCorsWhitelist } from '../lib/cors-origin';

const ROOM = (eventId: string) => `event:${eventId}:checkin`;

@WebSocketGateway({
  namespace: '/check-in',
  cors: {
    origin: parseCorsWhitelist(process.env.CORS_ORIGIN),
    credentials: true,
  },
})
export class CheckInGateway {
  private readonly logger = new Logger(CheckInGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwt: JwtService) {}

  handleConnection(socket: Socket) {
    const token = (socket.handshake.auth?.token || socket.handshake.query?.token) as string;
    if (!token) {
      socket.disconnect(true);
      return;
    }
    try {
      const payload = this.jwt.verify(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.debug(`disconnect ${socket.id}`);
  }

  @SubscribeMessage('joinEvent')
  joinEvent(@MessageBody() body: { eventId: string }, @ConnectedSocket() socket: Socket) {
    if (!body?.eventId) return { ok: false };
    socket.join(ROOM(body.eventId));
    return { ok: true };
  }

  @SubscribeMessage('leaveEvent')
  leaveEvent(@MessageBody() body: { eventId: string }, @ConnectedSocket() socket: Socket) {
    if (!body?.eventId) return { ok: false };
    socket.leave(ROOM(body.eventId));
    return { ok: true };
  }

  broadcastCheckIn(eventId: string, stats: unknown, registration?: unknown) {
    this.server.to(ROOM(eventId)).emit('checkInUpdate', { stats, registration });
  }
}
