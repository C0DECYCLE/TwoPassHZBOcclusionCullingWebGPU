/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { IndirectLayout } from "../definitions/helper.js";
import { int, Nullable } from "../definitions/utils.js";
import { assert } from "../utilities/utils.js";

export class IndirectReadback {
    private readonly source: GPUBuffer;
    private readonly capacity: int;

    private readonly buffer: GPUBuffer;

    public constructor(device: GPUDevice, source: GPUBuffer, capacity: int) {
        this.source = source;
        this.capacity = capacity;
        this.buffer = this.createBuffer(device);
    }

    private createBuffer(device: GPUDevice): GPUBuffer {
        return device.createBuffer({
            label: "buffer",
            size: this.source.size * this.capacity,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
    }

    public resolve(encoder: GPUCommandEncoder, index: int): void {
        if (this.buffer.mapState !== "unmapped") {
            return;
        }
        encoder.copyBufferToBuffer(
            this.source,
            0,
            this.buffer,
            this.source.size * index,
            this.source.size,
        );
    }

    public async readback(): Promise<Nullable<int[][]>> {
        if (this.buffer.mapState !== "unmapped") {
            return null;
        }
        await this.buffer.mapAsync(GPUMapMode.READ);
        const data: ArrayBuffer = this.buffer.getMappedRange().slice();
        this.buffer.unmap();
        assert(data.byteLength === this.capacity * this.source.size);
        const indirect: Uint32Array = new Uint32Array(data);
        const instanceCounts: int[][] = [];
        for (let i: int = 0; i < this.capacity; i++) {
            const counts: int[] = [];
            const n: int = indirect.length / (this.capacity * IndirectLayout);
            for (let j: int = 0; j < n; j++) {
                counts.push(indirect[(i * n + j) * IndirectLayout + 1]);
            }
            instanceCounts.push(counts);
        }
        return instanceCounts;
    }
}
