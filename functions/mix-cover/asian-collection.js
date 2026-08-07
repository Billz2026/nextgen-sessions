import c1 from "../_mix_cover_data/asian-collection-1.js";
import c2 from "../_mix_cover_data/asian-collection-2.js";
import c3 from "../_mix_cover_data/asian-collection-3.js";
import { webpResponse } from "../_mix_cover_data/respond.js";

export async function onRequestGet() {
  return webpResponse(c1 + c2 + c3);
}
