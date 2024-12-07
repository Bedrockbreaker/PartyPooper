import { mkdirSync, rmSync } from "fs";
import { join } from "path";

const dist = join(import.meta.dirname, "..", "dist");

rmSync(dist, {recursive: true, force: true});
mkdirSync(dist);