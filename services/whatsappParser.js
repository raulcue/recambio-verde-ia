// /services/whatsappParser.js

const VEHICLES = require("../data/vehicles.dataset.js");

const { normalizeText, detectPlate, detectVIN, detectYear, detectEngine } = require('../data/patterns.dataset');
const PARTS = require('../data/parts.dataset');
// ============================================================
// NORMALIZACIÓN EXTRA (para NLP)
// ============================================================

function normalize(text) {
  return text
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detecta marca usando aliases y tolerancia básica
 */
function detectBrand(cleanText) {

  const text = normalizeText(cleanText);
  const words = text.split(" ");

  for (const brand of VEHICLES) {

    const brandName = normalizeText(brand.brand);

    // match directo marca
    if (words.includes(brandName)) {
      return brand.brand;
    }

    // match por alias
    for (const alias of brand.aliases || []) {

      const a = normalizeText(alias);

      if (words.includes(a)) {
        return brand.brand;
      }

    }

  }

  return null;
}
// ============================================================
// DETECTAR PIEZA
// ============================================================

function detectPart(cleanText) {

  const text = normalize(cleanText);

  for (const part of PARTS) {

    for (const alias of part.aliases || []) {

      const a = normalize(alias);

      if (text.includes(a)) {
        return part.name;
      }

    }

  }

  return null;

}
/**
 * Detecta modelo dentro de la marca encontrada
 */
function detectModel(cleanText, detectedBrand) {

  const text = normalizeText(cleanText);
  const words = text.split(" ");

  // si hay marca detectada
  if (detectedBrand) {

    const brand = VEHICLES.find(b => b.brand === detectedBrand);
    if (!brand) return null;

    for (const model of brand.models || []) {

      const m = normalizeText(model);

      if (text.includes(m)) {
        return model;
      }

    }

  } 
  else {

    // buscar modelo en todas las marcas
    for (const brand of VEHICLES) {

      for (const model of brand.models || []) {

        const m = normalizeText(model);

        if (words.includes(m)) {
          return model;
        }

      }

    }

  }

  return null;
}


/**
 * Infiere la marca a partir del modelo
 */
function inferBrandFromModel(model) {

  if (!model) return null;

  const normalizedModel = normalizeText(model);

  for (const brand of VEHICLES) {

    for (const m of brand.models || []) {

      if (normalizeText(m) === normalizedModel) {
        return brand.brand;
      }

    }

  }

  return null;
}

function extractPieceText(original, plate, vin, brand, model) {
  let txt = original;

  if (plate) txt = txt.replace(new RegExp(plate, "ig"), "");
  if (vin) txt = txt.replace(new RegExp(vin, "ig"), "");
  if (brand) txt = txt.replace(new RegExp(brand, "ig"), "");
  if (model) txt = txt.replace(new RegExp(model, "ig"), "");

  return txt
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 🎯 FUNCIÓN PRINCIPAL
 */
function parseWhatsappMessage(message = "") {
  const normalized = normalizeText(message);

  const plate = detectPlate(message);
  const vin = detectVIN(message);
let brand = detectBrand(normalized);
let model = detectModel(normalized, brand);

// inferir marca si no existe pero el modelo sí
if (!brand && model) {
  brand = inferBrandFromModel(model);
}
  const year = detectYear(message);
  const engine = detectEngine(message);

  const part = detectPart(message);
  const piece = extractPieceText(message, plate, vin, brand, model);

	return {
	  original: message,
	  normalized,
	  plate,
	  vin,
	  brand,
	  model,
	  year,
	  engine,
	  part,
	  extractedPiece: piece || message
	};
}

module.exports = {
  parseWhatsappMessage
};
