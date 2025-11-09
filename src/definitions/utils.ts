/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { Vec2 } from "../utilities/Vec2.js";

export type int = number & { __type?: "int" };

export type float = number & { __type?: "float" };

export type UUID = string & { __type?: "uuid" };

export type Nullable<T> = T | null;

export type FloatArray = float[] | Float32Array | Float64Array;

export type Box = {
    readonly position: Vec2;
    readonly size: Vec2;
};
