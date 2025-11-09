/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { float } from "../definitions/utils.js";
import { EventEmitter } from "./EventEmitter.js";
import { Vec2 } from "./Vec2.js";

export class ObservableVec2 extends Vec2 {
    public readonly onChange: EventEmitter;

    public override get x(): float {
        return this._x;
    }

    public override get y(): float {
        return this._y;
    }

    public override set x(value: float) {
        this._x = value;
        this.onChange?.emit();
    }

    public override set y(value: float) {
        this._y = value;
        this.onChange?.emit();
    }

    public constructor(x: Vec2 | float = 0, y: float = 0) {
        super(x, y);
        this.onChange = new EventEmitter();
    }

    public destroy(): void {
        this.onChange.destroy();
    }
}
