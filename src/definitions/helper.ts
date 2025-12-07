/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { Vec3 } from "../utilities/Vec3.js";
import { int } from "./utils.js";

export const TextureFormats = {
    canvas: navigator.gpu.getPreferredCanvasFormat(),
    depth: "depth32float",
    hzb: "r32float",
};

export const Requirements: GPUFeatureName[] = [
    "timestamp-query",
    "indirect-first-instance",
    "primitive-index",
] as GPUFeatureName[];

export const IndirectLayout: int = 5;

export const MSAACount: int = 4;

export const ClearColor: Vec3 = new Vec3(1, 1, 1);

export const WORKGROUP_SIZE_1D: int = 64;

export const WORKGROUP_SIZE_2D: int = 8;

export const BlendState: GPUBlendState = {
    color: {
        operation: "add",
        srcFactor: "src-alpha",
        dstFactor: "one-minus-src-alpha",
    } as GPUBlendComponent,
    alpha: {
        operation: "add",
        srcFactor: "src-alpha",
        dstFactor: "one-minus-src-alpha",
    } as GPUBlendComponent,
} as GPUBlendState;
