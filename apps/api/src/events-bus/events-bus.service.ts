import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventsBusService {
  private readonly logger = new Logger(EventsBusService.name);

  constructor(private readonly emitter: EventEmitter2) {}

  emit(event: string, payload: unknown): void {
    this.logger.debug(`Emitting event: ${event}`);
    this.emitter.emit(event, payload);
  }
}
