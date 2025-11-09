/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { float, int } from "../definitions/utils.js";
import { Mat4 } from "../utilities/Mat4.js";
import { toRadian } from "../utilities/utils.js";
import { Vec3 } from "../utilities/Vec3.js";

export class Camera {
    public static readonly Layout: int = 4 * 4 + 6 * 4;

    public static readonly Near: float = 1;
    public static readonly Far: float = 1024;
    public static readonly FieldOfView: float = 50;

    public readonly position: Vec3;
    public readonly direction: Vec3;
    private readonly up: Vec3;

    private view: Mat4;
    private projection: Mat4;
    private viewProjection: Mat4;

    public constructor(canvas: HTMLCanvasElement) {
        this.position = new Vec3(0, 0, 0);
        this.direction = new Vec3(0, 0, -1);
        this.up = new Vec3(0, 1, 0);
        this.view = new Mat4();
        this.projection = Mat4.Perspective(
            Camera.FieldOfView * toRadian,
            canvas.width / canvas.height,
            Camera.Near,
            Camera.Far,
        );
        this.viewProjection = new Mat4();
    }

    public getViewProjection(): Mat4 {
        this.view.view(
            this.position,
            this.direction.clone().normalize().scale(-1),
            this.up,
        );
        return this.viewProjection.multiply(this.view, this.projection);
    }
}
