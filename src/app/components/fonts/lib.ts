"use client";
import { ENGLISH_FONT_FAMILIES } from "components/fonts/constants";

/**
 * airesume ships English fonts only, so every font family to load is English.
 */
export const getAllFontFamiliesToLoad = () => {
  return [...ENGLISH_FONT_FAMILIES];
};
