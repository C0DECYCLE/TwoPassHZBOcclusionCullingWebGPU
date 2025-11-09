/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { UUID } from "../definitions/utils.js";
import { AbstractEventEmitter } from "./AbstractEventEmitter.js";

export type AsyncEventListener = (data: any) => Promise<void>;

export class AsyncEventEmitter extends AbstractEventEmitter<AsyncEventListener> {
    private pending: boolean;

    public constructor() {
        super();
        this.pending = false;
    }

    public override once(listener: AsyncEventListener): UUID {
        const uuid: UUID = this.on(async (data: any) => {
            await listener(data);
            this.off(uuid);
        });
        return uuid;
    }

    public override async emit(data: any = null): Promise<void> {
        this.pending = true;
        for (const [_uuid, listener] of this.listeners) {
            await listener(data);
        }
        this.pending = false;
    }

    public isEmitting(): boolean {
        return this.pending;
    }
}
