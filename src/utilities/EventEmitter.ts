/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { UUID } from "../definitions/utils.js";
import { AbstractEventEmitter } from "./AbstractEventEmitter.js";

export type EventListener = (data: any) => void;

export class EventEmitter extends AbstractEventEmitter<EventListener> {
    public constructor() {
        super();
    }

    public override once(listener: EventListener): UUID {
        const uuid: UUID = this.on((data: any) => {
            listener(data);
            this.off(uuid);
        });
        return uuid;
    }

    public override emit(data: any = null): void {
        for (const [_uuid, listener] of this.listeners) {
            listener(data);
        }
    }
}
