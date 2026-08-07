import c1 from "../_mix_cover_data/sound-of-summer-1.js";
import c2 from "../_mix_cover_data/sound-of-summer-2.js";
import c3 from "../_mix_cover_data/sound-of-summer-3.js";
import c4 from "../_mix_cover_data/sound-of-summer-4.js";
import c5 from "../_mix_cover_data/sound-of-summer-5.js";
import c6 from "../_mix_cover_data/sound-of-summer-6.js";
import { webpResponse } from "../_mix_cover_data/respond.js";

export async function onRequestGet() {
  return webpResponse(c1 + c2 + c3 + c4 + c5 + c6);
}
