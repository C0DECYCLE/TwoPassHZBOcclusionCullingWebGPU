/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { float } from "../definitions/utils.js";
import { EventEmitter } from "./EventEmitter.js";
import { Vec3 } from "./Vec3.js";

export class ObservableVec3 extends Vec3 {
    public readonly onChange: EventEmitter;

    public override get x(): float {
        return this._x;
    }

    public override get y(): float {
        return this._y;
    }

    public override get z(): float {
        return this._z;
    }

    public override set x(value: float) {
        this._x = value;
        this.onChange?.emit();
    }

    public override set y(value: float) {
        this._y = value;
        this.onChange?.emit();
    }

    public override set z(value: float) {
        this._z = value;
        this.onChange?.emit();
    }

    public constructor(x: Vec3 | float = 0, y: float = 0, z: float = 0) {
        super(x, y, z);
        this.onChange = new EventEmitter();
    }

    public destroy(): void {
        this.onChange.destroy();
    }
}
