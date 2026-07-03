import { sqlite } from "../src/lib/drizzle.server";
import { bootstrapMotherOfBobV3 } from "../src/lib/character-v3/mob-bootstrap.server";

const result = bootstrapMotherOfBobV3(sqlite);
console.log(JSON.stringify(result, null, 2));
