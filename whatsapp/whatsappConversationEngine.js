const sessions = {};

function processMessage(phone, parsed, originalMessage) {

    if (!sessions[phone]) {
        sessions[phone] = {
            part: parsed.part || null,
            brand: parsed.brand || null,
            model: parsed.model || null,
            year: parsed.year || null
        };
    }

    const s = sessions[phone];

    if (!s.part && parsed.part) s.part = parsed.part;
    if (!s.brand && parsed.brand) s.brand = parsed.brand;
    if (!s.model && parsed.model) s.model = parsed.model;
    if (!s.year && parsed.year) s.year = parsed.year;

    // falta pieza
    if (!s.part) {
        return {
            type: "ask",
            message: "¿Qué pieza necesitas?"
        };
    }

    // falta marca
    if (!s.brand) {
        return {
            type: "ask",
            message: "¿De qué marca es el coche?"
        };
    }

    // falta modelo
    if (!s.model) {
        return {
            type: "ask",
            message: "¿Qué modelo es?"
        };
    }

    // falta año
    if (!s.year) {
        return {
            type: "ask_year",
            message: "¿De qué año es el coche?"
        };
    }

    // detectar confirmación del usuario
    if (originalMessage) {

        const txt = originalMessage.toLowerCase();

        if (
            txt.includes("si") ||
            txt.includes("sí") ||
            txt.includes("ok") ||
            txt.includes("vale") ||
            txt.includes("pedido")
        ) {
            return {
                type: "confirm"
            };
        }

    }

    // mostrar resumen antes de confirmar
    return {
        type: "confirm",
        message:
`He detectado:

Pieza: ${s.part}
Marca: ${s.brand}
Modelo: ${s.model}
Año: ${s.year}

Escribe "pedido" para confirmar`
    };
}

function clearSession(phone) {
    delete sessions[phone];
}

module.exports = {
    processMessage,
    clearSession
};
