/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import {
    BYTES64,
    GPUPassTimestampWrites,
    MsToNanos,
    Timestamps,
} from "../definitions/components.js";
import { int, Nullable } from "../definitions/utils.js";

export class TimingQuery {
    private static readonly Capacity: int = 2;

    private readonly querySet: GPUQuerySet;
    private readonly queryBuffer: GPUBuffer;
    private readonly readbackBuffer: GPUBuffer;
    public readonly timestampWrites: GPUPassTimestampWrites;

    public constructor(device: GPUDevice) {
        this.querySet = this.createQuerySet(device);
        this.queryBuffer = this.createQueryBuffer(device);
        this.readbackBuffer = this.createReadbackBuffer(device);
        this.timestampWrites = this.createTimestampWrites();
    }

    private createQuerySet(device: GPUDevice): GPUQuerySet {
        return device.createQuerySet({
            label: "querySet",
            type: "timestamp",
            count: TimingQuery.Capacity,
        } as GPUQuerySetDescriptor);
    }

    private createQueryBuffer(device: GPUDevice): GPUBuffer {
        return device.createBuffer({
            label: "queryBuffer",
            size: TimingQuery.Capacity * BYTES64,
            usage:
                GPUBufferUsage.QUERY_RESOLVE |
                GPUBufferUsage.STORAGE |
                GPUBufferUsage.COPY_SRC |
                GPUBufferUsage.COPY_DST,
        } as GPUBufferDescriptor);
    }

    private createReadbackBuffer(device: GPUDevice): GPUBuffer {
        return device.createBuffer({
            label: "readbackBuffer",
            size: this.queryBuffer.size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
    }

    private createTimestampWrites(): GPUPassTimestampWrites {
        return {
            label: "timestampWrites",
            querySet: this.querySet,
            beginningOfPassWriteIndex: 0,
            endOfPassWriteIndex: 1,
        } as GPUPassTimestampWrites;
    }

    public resolve(encoder: GPUCommandEncoder): void {
        encoder.resolveQuerySet(
            this.querySet,
            0,
            TimingQuery.Capacity,
            this.queryBuffer,
            0,
        );
        if (this.readbackBuffer.mapState !== "unmapped") {
            return;
        }
        encoder.copyBufferToBuffer(
            this.queryBuffer,
            0,
            this.readbackBuffer,
            0,
            this.readbackBuffer.size,
        );
    }

    public async readback(): Promise<Nullable<Timestamps>> {
        if (this.readbackBuffer.mapState !== "unmapped") {
            return null;
        }
        await this.readbackBuffer.mapAsync(GPUMapMode.READ);
        const data: ArrayBuffer = this.readbackBuffer.getMappedRange().slice(0);
        this.readbackBuffer.unmap();
        const nanos: BigInt64Array = new BigInt64Array(data);
        return {
            start: Number(nanos[0]) / MsToNanos,
            end: Number(nanos[1]) / MsToNanos,
        } as Timestamps;
    }
}
