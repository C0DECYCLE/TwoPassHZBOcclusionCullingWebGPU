/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { EventEmitter } from "./EventEmitter.js";

export class ObservableValue<T> {
    public readonly onChange: EventEmitter;
    private value!: T;

    public constructor(value: T) {
        this.onChange = new EventEmitter();
        this.set(value);
    }

    public get(): T {
        return this.value;
    }

    public set(value: T): void {
        this.value = value;
        this.onChange?.emit();
    }

    public destroy(): void {
        this.onChange.destroy();
    }
}
