/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { Vec3 } from "../utilities/Vec3.js";
import { float, int, Nullable } from "./utils.js";

export type BoundingBox = {
    readonly min: Vec3;
    readonly max: Vec3;
};

export type BoundingSphere = {
    readonly center: Vec3;
    readonly radius: float;
};

export type GeometryBounds = BoundingBox & BoundingSphere;

export type GPUPassTimestampWrites =
    | GPURenderPassTimestampWrites
    | GPUComputePassTimestampWrites;

export const BYTES64: int = 8;

export type Timestamps = {
    start: Nullable<float>;
    end: Nullable<float>;
};

export const MsToNanos: int = 1_000_000;
