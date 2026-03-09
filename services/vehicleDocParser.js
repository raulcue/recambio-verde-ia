// /services/whatsappParser.js

const VEHICLES = require("../data/vehicles.dataset.js");

const { normalizeText, detectPlate, detectVIN, detectYear, detectEngine } = require('../data/patterns.dataset');
const PARTS = require('../data/parts.dataset');

/**
 * Normaliza una palabra para comparaciones flexibles
 */
function normalizeToken(str = "") {
  return normalizeText(str)
    .replace(/\s+/g, "")
    .toUpperCase();
}

/**
 * Detecta marca usando aliases y tolerancia básica
 */
function detectBrand(cleanText) {
  const text = normalizeToken(cleanText);

  for (const brand of VEHICLES) {
    const brandName = normalizeToken(brand.brand);

    // Match directo marca
    if (text.includes(brandName)) {
      return brand.brand;
    }

    // Match por alias
    for (const alias of brand.aliases || []) {
      const a = normalizeToken(alias);
      if (text.includes(a)) {
        return brand.brand;
      }
    }
  }

  return null;
}

/**
 * Detecta modelo dentro de la marca encontrada
 */
function detectModel(cleanText, detectedBrand) {
  if (!detectedBrand) return null;

  const text = normalizeToken(cleanText);
  const brand = VEHICLES.find(b => b.brand === detectedBrand);
  if (!brand) return null;

  for (const model of brand.models || []) {
    const m = normalizeToken(model);
    if (text.includes(m)) {
      return model;
    }

    // tolerancia básica: primeras 5 letras
    if (m.length >= 5 && text.includes(m.slice(0, 5))) {
      return model;
    }
  }

  return null;
}

/**
 * Limpia el texto eliminando datos detectados
 */
 function detectPart(text) {
  const clean = normalizeText(text);

  for (const p of PARTS) {
    for (const alias of p.aliases) {
      const a = normalizeText(alias);

      if (clean.includes(a)) {
        return p.part;
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
  const brand = detectBrand(normalized);
  const model = detectModel(normalized, brand);
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
