/**
 * vehicles.dataset.js
 * Dataset base de marcas + alias + estructura de modelos
 */

function normalizeWord(word = "") {
    return word
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9 ]/g, '')
        .trim();
}

const VEHICLES = [
    { brand: "Toyota", aliases: ["TOYOTA", "TOY", "TOYTA", "TYOTA"] },
    { brand: "Volkswagen", aliases: ["VW", "VOLKSWAGEN", "VOLK"] },
    { brand: "BMW", aliases: ["BMW", "B M W"] },
    { brand: "Mercedes-Benz", aliases: ["MERCEDES", "MB", "BENZ", "MERCEDES BENZ"] },
    { brand: "Audi", aliases: ["AUDI"] },
    { brand: "Renault", aliases: ["RENAULT", "RENAU", "RENO"] },
    { brand: "Peugeot", aliases: ["PEUGEOT", "PEUGOT", "PYO"] },
    { brand: "Citroën", aliases: ["CITROEN", "CITROËN", "CITRO"] },
    { brand: "Ford", aliases: ["FORD"] },
    { brand: "Opel", aliases: ["OPEL", "OPEL GM"] },
    { brand: "Seat", aliases: ["SEAT"] },
    { brand: "Skoda", aliases: ["SKODA", "ŠKODA"] },
    { brand: "Hyundai", aliases: ["HYUNDAI", "HYUNDAY"] },
    { brand: "Kia", aliases: ["KIA"] },
    { brand: "Nissan", aliases: ["NISSAN", "NISAN"] },
    { brand: "Mazda", aliases: ["MAZDA"] },
    { brand: "Honda", aliases: ["HONDA"] },
    { brand: "Mitsubishi", aliases: ["MITSUBISHI", "MITSU"] },
    { brand: "Subaru", aliases: ["SUBARU"] },
    { brand: "Suzuki", aliases: ["SUZUKI", "SUZUKI MOTOR"] },
    { brand: "Fiat", aliases: ["FIAT"] },
    { brand: "Alfa Romeo", aliases: ["ALFA", "ALFA ROMEO"] },
    { brand: "Jeep", aliases: ["JEEP"] },
    { brand: "Volvo", aliases: ["VOLVO"] },
    { brand: "Mini", aliases: ["MINI", "MINI COOPER"] },
    { brand: "Tesla", aliases: ["TESLA"] },
    { brand: "Porsche", aliases: ["PORSCHE"] },
    { brand: "Lexus", aliases: ["LEXUS"] },
    { brand: "Land Rover", aliases: ["LAND ROVER", "RANGE ROVER"] },
    { brand: "Jaguar", aliases: ["JAGUAR"] },
    { brand: "Dacia", aliases: ["DACIA"] },
    { brand: "Chevrolet", aliases: ["CHEVROLET", "CHEVY"] },
    { brand: "Chrysler", aliases: ["CHRYSLER"] },
    { brand: "Dodge", aliases: ["DODGE"] },
    { brand: "Ram", aliases: ["RAM", "DODGE RAM"] },
    { brand: "Cupra", aliases: ["CUPRA"] },
    { brand: "SsangYong", aliases: ["SSANGYONG", "SSANG YONG"] },
    { brand: "MG", aliases: ["MG", "MORRIS GARAGES"] },
    { brand: "BYD", aliases: ["BYD", "BUILD YOUR DREAMS"] },
    { brand: "Polestar", aliases: ["POLESTAR"] },
    { brand: "Smart", aliases: ["SMART"] },
    { brand: "DS", aliases: ["DS", "DS AUTOMOBILES"] },
    { brand: "Infiniti", aliases: ["INFINITI"] },
    { brand: "Isuzu", aliases: ["ISUZU"] },
    { brand: "Iveco", aliases: ["IVECO"] },
    { brand: "Lancia", aliases: ["LANCIA"] },
    { brand: "Abarth", aliases: ["ABARTH"] },
    { brand: "Great Wall", aliases: ["GREAT WALL", "GWM"] },
    { brand: "Geely", aliases: ["GEELY"] }
];

// =====================
// 🔎 BRAND DETECTION
// =====================
function detectBrand(text) {
    const normalized = normalizeWord(text);

    for (const vehicle of VEHICLES) {
        if (normalized.includes(normalizeWord(vehicle.brand))) {
            return vehicle.brand;
        }

        for (const alias of vehicle.aliases) {
            if (normalized.includes(normalizeWord(alias))) {
                return vehicle.brand;
            }
        }
    }

    return null;
}

module.exports = {
    VEHICLES,
    detectBrand,
    normalizeWord
};
