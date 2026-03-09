// ============================================================================
// WhatsApp Conversation Engine
// ============================================================================

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
 * Procesa mensaje WhatsApp
 */
function processMessage(phone, parsed) {

  const session = getSession(phone);

  // actualizar sesión con datos detectados
  if (parsed.part && !session.pieza) session.pieza = parsed.part;
  if (parsed.brand && !session.marca) session.marca = parsed.brand;
  if (parsed.model && !session.modelo) session.modelo = parsed.model;
  if (parsed.year && !session.anio) session.anio = parsed.year;
  if (parsed.vin && !session.vin) session.vin = parsed.vin;

  // ========================================================================
  // 1️⃣ Verificar si falta información mínima
  // ========================================================================

  if (!session.pieza) {
    return {
      type: "ask",
      message: "¿Qué pieza necesitas?"
    };
  }

  if (!session.marca) {
    return {
      type: "ask",
      message: "¿De qué marca es el coche?"
    };
  }

  if (!session.modelo) {
    return {
      type: "ask",
      message: "¿Qué modelo es?"
    };
  }

  // ========================================================================
  // 2️⃣ Falta año
  // ========================================================================

  if (!session.anio) {

    return {
      type: "ask_year",
      message:
`He detectado:

Pieza: ${session.pieza}
Marca: ${session.marca}
Modelo: ${session.modelo}

¿De qué año es el coche?

Puedes:
• escribir el año
• enviar foto del permiso de circulación
• o escribir "pedido"`
    };
  }

  // ========================================================================
  // 3️⃣ Confirmación pedido
  // ========================================================================

  return {
    type: "confirm",
    message:
`Confirma el pedido:

Pieza: ${session.pieza}
Marca: ${session.marca}
Modelo: ${session.modelo}
Año: ${session.anio}

Escribe "pedido" para confirmar.`
  };
}

module.exports = {
  processMessage,
  clearSession,
  isConfirmation
};
