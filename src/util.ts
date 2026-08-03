import { randomBytes } from "crypto";

export const generateToken = () => randomBytes(32).toString("hex");
