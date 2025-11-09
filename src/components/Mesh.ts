/**
 * Copyright (C) - All Rights Reserved
 * Written by Noah Mattia Bussinger
 */

import { int } from "../definitions/utils.js";
import { Vec3 } from "../utilities/Vec3.js";
import { Geometry } from "./Geometry.js";

export class Mesh {
    public static readonly Layout: int = 3 + 1 + 1 + 3;

    public readonly position: Vec3;
    public readonly geometry: Geometry;

    public constructor(position: Vec3, geometry: Geometry) {
        this.position = position;
        this.geometry = geometry;
    }
}
