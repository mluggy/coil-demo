import { readFileSync } from "fs";
import yaml from "js-yaml";
import { deriveConfig } from "./derive-config.js";

const raw = yaml.load(readFileSync("podcast.yaml", "utf8"));

export default deriveConfig(raw);
