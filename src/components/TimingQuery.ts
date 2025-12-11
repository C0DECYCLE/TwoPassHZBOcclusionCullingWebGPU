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
import { assert } from "../utilities/utils.js";

export class TimingQuery {
    private static readonly Stride: int = 2;

    public readonly capacity: int;

    private readonly querySet: GPUQuerySet;
    private readonly queryBuffer: GPUBuffer;
    private readonly readbackBuffer: GPUBuffer;
    private readonly timestampWrites: GPUPassTimestampWrites[];

    public constructor(device: GPUDevice, capacity: int) {
        this.capacity = capacity;
        this.querySet = this.createQuerySet(device);
        this.queryBuffer = this.createQueryBuffer(device);
        this.readbackBuffer = this.createReadbackBuffer(device);
        this.timestampWrites = this.createTimestampWrites();
    }

    private createQuerySet(device: GPUDevice): GPUQuerySet {
        return device.createQuerySet({
            label: "querySet",
            type: "timestamp",
            count: this.capacity * TimingQuery.Stride,
        } as GPUQuerySetDescriptor);
    }

    private createQueryBuffer(device: GPUDevice): GPUBuffer {
        return device.createBuffer({
            label: "queryBuffer",
            size: this.capacity * TimingQuery.Stride * BYTES64,
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
            size: this.capacity * TimingQuery.Stride * BYTES64,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
    }

    private createTimestampWrites(): GPUPassTimestampWrites[] {
        const writes: GPUPassTimestampWrites[] = [];
        for (let i: int = 0; i < this.capacity; i++) {
            writes.push({
                label: "timestampWrites",
                querySet: this.querySet,
                beginningOfPassWriteIndex: i * TimingQuery.Stride + 0,
                endOfPassWriteIndex: i * TimingQuery.Stride + 1,
            } as GPUPassTimestampWrites);
        }
        return writes;
    }

    public getTimestampWrites(index: int): GPUPassTimestampWrites {
        const writes: GPUPassTimestampWrites = this.timestampWrites[index];
        assert(writes);
        return writes;
    }

    public resolve(encoder: GPUCommandEncoder): void {
        encoder.resolveQuerySet(
            this.querySet,
            0,
            this.capacity * TimingQuery.Stride,
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

    public async readback(): Promise<Nullable<Timestamps[]>> {
        if (this.readbackBuffer.mapState !== "unmapped") {
            return null;
        }
        await this.readbackBuffer.mapAsync(GPUMapMode.READ);
        const data: ArrayBuffer = this.readbackBuffer.getMappedRange().slice(0); // unnecessary?
        this.readbackBuffer.unmap();
        const nanos: BigInt64Array = new BigInt64Array(data);
        assert(nanos.length === this.capacity * TimingQuery.Stride);
        const timestamps: Timestamps[] = [];
        for (let i: int = 0; i < this.capacity; i++) {
            timestamps.push({
                start: Number(nanos[i * TimingQuery.Stride + 0]) / MsToNanos,
                end: Number(nanos[i * TimingQuery.Stride + 1]) / MsToNanos,
            } as Timestamps);
        }
        return timestamps;
    }
}
