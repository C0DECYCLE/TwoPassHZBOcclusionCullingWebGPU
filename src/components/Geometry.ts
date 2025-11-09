/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import {
    BoundingBox,
    BoundingSphere,
    GeometryBounds,
} from "../definitions/components.js";
import { float, int } from "../definitions/utils.js";
import { Vec3 } from "../utilities/Vec3.js";

export class Geometry {
    public static readonly Layout: int = 3 + 1 + (3 + 1) * 2;
    public static readonly VertexLayout: int = 3 + 1;

    public readonly id: int;
    public readonly vertices: Float32Array;
    public readonly indices: Uint32Array;
    public readonly bounds: GeometryBounds;

    private constructor(vertices: Float32Array, indices: Uint32Array) {
        this.id = Geometry.Id();
        this.vertices = vertices;
        this.indices = indices;
        this.bounds = this.calculateBounds();
    }

    private calculateBounds(): GeometryBounds {
        const box: BoundingBox = this.calculateBoundingBox();
        const sphere: BoundingSphere = this.calculateBoundingSphere(box);
        return {
            min: box.min,
            max: box.max,
            center: sphere.center,
            radius: sphere.radius,
        } as GeometryBounds;
    }

    private calculateBoundingBox(): BoundingBox {
        const count: int = this.vertices.length / Geometry.VertexLayout;
        const min: Vec3 = new Vec3(Infinity, Infinity, Infinity);
        const max: Vec3 = new Vec3(-Infinity, -Infinity, -Infinity);
        for (let i: int = 0; i < count; i++) {
            const offset: int = i * Geometry.VertexLayout;
            min.x = Math.min(min.x, this.vertices[offset + 0]);
            min.y = Math.min(min.y, this.vertices[offset + 1]);
            min.z = Math.min(min.z, this.vertices[offset + 2]);
            max.x = Math.max(max.x, this.vertices[offset + 0]);
            max.y = Math.max(max.y, this.vertices[offset + 1]);
            max.z = Math.max(max.z, this.vertices[offset + 2]);
        }
        return { min: min, max: max } as BoundingBox;
    }

    private calculateBoundingSphere(box: BoundingBox): BoundingSphere {
        const count: int = this.vertices.length / Geometry.VertexLayout;
        const center: Vec3 = box.min.clone().add(box.max).scale(0.5);
        let radius: float = 0;
        for (let i: int = 0; i < count; i++) {
            const offset: int = i * Geometry.VertexLayout;
            Vec3.Cache.set(
                this.vertices[offset + 0],
                this.vertices[offset + 1],
                this.vertices[offset + 2],
            ).sub(center);
            radius = Math.max(radius, Vec3.Cache.length());
        }
        return { center: center, radius: radius } as BoundingSphere;
    }

    public static async FromPath(path: string): Promise<Geometry> {
        const vs: float[] = [];
        const is: int[] = [];
        const lines: string[] = (await (await fetch(path)).text()).split("\n");
        for (let i: int = 0; i < lines.length; i++) {
            Geometry.ParseLine(lines[i].trim().split(" "), vs, is);
        }
        return new Geometry(new Float32Array(vs), new Uint32Array(is));
    }

    private static ParseLine(data: string[], vs: float[], is: int[]): void {
        if (data[0] === "v") {
            const x: float = parseFloat(data[1]);
            const y: float = parseFloat(data[2]);
            const z: float = parseFloat(data[3]);
            vs.push(x, y, z, 0);
            return;
        }
        if (data[0] === "f") {
            const a: int = parseInt(data[1]) - 1;
            const b: int = parseInt(data[2]) - 1;
            const c: int = parseInt(data[3]) - 1;
            is.push(a, b, c);
            return;
        }
    }

    private static NextId: int = 0;

    public static Id(): int {
        return Geometry.NextId++;
    }
}
