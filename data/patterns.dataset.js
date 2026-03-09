/**
 * patterns.dataset.js
 * Reglas de detección y normalización de texto
 */

// =============================
// 🚗 MATRÍCULAS ESPAÑOLAS
// =============================

// Formato moderno: 1234ABC, 1234 ABC
const PLATE_MODERN = /\b(\d{4})\s?([A-Z]{3})\b/i;

// Formato antiguo provincial: M-1234-AB, O1234BB, B 1234 ZZ
const PLATE_OLD = /\b([A-Z]{1,2})[-\s]?(\d{3,4})[-\s]?([A-Z]{1,2})\b/i;

// =============================
// 🔐 BASTIDOR / VIN
// =============================

// VIN internacional: 17 caracteres alfanuméricos excepto I,O,Q
const VIN = /\b([A-HJ-NPR-Z0-9]{17})\b/i;

// =============================
// 📅 AÑO VEHÍCULO
// =============================

// Detecta años entre 1950 y 2035
const YEAR = /\b(19[5-9]\d|20[0-3]\d)\b/;


// =============================
// ⚙️ MOTOR / MOTORIZACIÓN
// =============================

// Ejemplos: 2.0 TDI, 1.6 HDI, 320D, 1.9 JTD
const ENGINE = /\b(\d\.\d\s?(TDI|HDI|CDI|JTD|TSI|TFSI|D|I|DCI))\b|\b\d{3}[A-Z]\b/i;
// =============================
// 🧹 NORMALIZACIÓN TEXTO
// =============================

function normalizeText(text = '') {
    return text
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, '')  // eliminar acentos
        .replace(/[^A-Z0-9\s]/g, ' ')     // limpiar símbolos
        .replace(/\s+/g, ' ')             // espacios múltiples
        .trim();
}

// =============================
// 🔍 DETECTORES
// =============================

function detectPlate(text) {
    const clean = normalizeText(text);

    let match = clean.match(PLATE_MODERN);
    if (match) {
        return `${match[1]}${match[2]}`; // 1234ABC
    }

    match = clean.match(PLATE_OLD);
    if (match) {
        return `${match[1]}${match[2]}${match[3]}`; // M1234AB
    }

    return null;
}

function detectVIN(text) {
    const clean = normalizeText(text);
    const match = clean.match(VIN);
    return match ? match[1] : null;
}
function detectYear(text) {
    const clean = normalizeText(text);
    const match = clean.match(YEAR);
    return match ? parseInt(match[1]) : null;
}

function detectEngine(text) {
    const clean = normalizeText(text);
    const match = clean.match(ENGINE);
    return match ? match[0] : null;
}

module.exports = {
    normalizeText,
    detectPlate,
    detectVIN,
    detectYear,
    detectEngine
};
