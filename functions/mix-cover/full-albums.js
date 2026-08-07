import c1 from "../_mix_cover_data/full-albums-1.js";
import c2 from "../_mix_cover_data/full-albums-2.js";
import c3 from "../_mix_cover_data/full-albums-3.js";
import c4 from "../_mix_cover_data/full-albums-4.js";
import { webpResponse } from "../_mix_cover_data/respond.js";

export async function onRequestGet() {
  return webpResponse(c1 + c2 + c3 + c4);
}
