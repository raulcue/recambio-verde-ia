// ============================================================================
// WhatsApp Conversation Engine
// ============================================================================

const vehicles = require('../data/vehicles.dataset.js');

const sessions = {};

/**
 * Obtiene o crea sesión de conversación
 */
function getSession(phone) {
  if (!sessions[phone]) {
    sessions[phone] = {
      pieza: null,
      marca: null,
      modelo: null,
      anio: null,
      vin: null,
      estado: "new"
    };
  }

  return sessions[phone];
}

/**
 * Limpia sesión después de crear pedido
 */
function clearSession(phone) {
  delete sessions[phone];
}

/**
 * Detecta confirmación simple
 */
function isConfirmation(text) {
  const t = text.toLowerCase();

  return (
    t.includes("si") ||
    t.includes("sí") ||
    t.includes("confirmar") ||
    t.includes("pedido")
  );
}

/**
 * Calcular similitud entre dos palabras
 */
function similarity(a, b) {

  a = a.toLowerCase();
  b = b.toLowerCase();

  let matches = 0;

  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }

  return matches / Math.max(a.length, b.length);
}

/**
 * Inferir marca a partir del modelo usando dataset (con fuzzy matching)
 */
function inferBrandFromModel(model) {

  if (!model) return null;

  const m = model.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const v of vehicles) {

    const datasetModel = v.model.toLowerCase();

    const score = similarity(m, datasetModel);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = v;
    }

  }

  // solo aceptar coincidencias suficientemente buenas
  if (bestScore > 0.6) {
    return bestMatch.brand;
  }

  return null;
}

/**
 * Procesa mensaje WhatsApp
 */
function processMessage(phone, parsed) {

  const session = getSession(phone);

  // ========================================================================
  // Actualizar sesión con datos detectados
  // ========================================================================

  if (parsed.part && !session.pieza) {
    session.pieza = parsed.part;
  }

  if (parsed.brand && !session.marca) {
    session.marca = parsed.brand;
  }

  if (parsed.model && !session.modelo) {

    session.modelo = parsed.model;

    // intentar inferir marca automáticamente
    if (!session.marca) {

      const inferredBrand = inferBrandFromModel(parsed.model);

      if (inferredBrand) {
        session.marca = inferredBrand;
      }

    }
  }

  if (parsed.year && !session.anio) {
    session.anio = parsed.year;
  }

  if (parsed.vin && !session.vin) {
    session.vin = parsed.vin;
  }

  // ========================================================================
  // 1️⃣ Verificar información mínima del coche
  // ========================================================================

  if (!session.marca) {
    return {
      type: "ask",
      message: "¿De qué marca es el coche?"
    };
  }

  if (!session.modelo) {
    return {
      type: "ask",
      message: `¿Qué modelo de ${session.marca}?`
    };
  }

  if (!session.anio) {

    return {
      type: "ask_year",
      message:
`He detectado:

Marca: ${session.marca}
Modelo: ${session.modelo}

¿De qué año es el coche?

Puedes:
• escribir el año
• enviar foto de la ficha técnica
• o escribir "pedido"`
    };
  }

  // ========================================================================
  // 2️⃣ Falta pieza
  // ========================================================================

  if (!session.pieza) {
    return {
      type: "ask",
      message: "¿Qué pieza necesitas?"
    };
  }

  // ========================================================================
  // 3️⃣ Confirmación pedido
  // ========================================================================

  return {
    type: "confirm",
    message:
`He entendido:

🚗 Marca: ${session.marca}
🚗 Modelo: ${session.modelo}
📅 Año: ${session.anio}
🔧 Pieza: ${session.pieza}

¿Confirmas crear el pedido?

Puedes:
• escribir "pedido" para confirmar
• enviar foto de la ficha técnica
• o corregir los datos`
  };

}

module.exports = {
  processMessage,
  clearSession,
  isConfirmation
};
