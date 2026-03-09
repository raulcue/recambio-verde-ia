// scripts/testParser.js

const { parseWhatsappMessage } = require("../services/whatsappParser");

const messages = [

"necesito alternador audi a4 2016",
"busco turbo bmw 320d 2017",
"caja cambios golf 1.9 tdi 2005",
"motor seat leon 2.0 tdi 2015",
"radiador ford focus 2012",
"inyectores mercedes c220 cdi",
"faro delantero opel astra 2010",
"retrovisor izquierdo peugeot 308",
"puerta trasera renault megane 2013",
"bomba agua audi a3 2008",

"turbo passat 2.0 tdi",
"alternador bmw x5 2018",
"motor arranque skoda octavia",
"paragolpes delantero golf 2016",
"faro xenon bmw serie 5",

"tengo un audi a4 2014 necesito alternador",
"busco motor para bmw 320d 2016",
"me hace falta turbo golf 1.6 tdi",
"alternador mercedes clase c 2015",
"radiador seat ibiza 2011",

"turbo para audi a3",
"alternador para bmw serie 3",
"motor para ford focus 2018",
"caja cambios opel astra",
"bomba gasolina golf",

"alternador audi",
"turbo bmw",
"motor seat leon",
"radiador ford",
"caja cambios mercedes"
];

console.log("===== TEST PARSER =====\n");

messages.forEach(msg => {

const result = parseWhatsappMessage(msg);

console.log("Mensaje:", msg);
console.log(result);
console.log("-----------------------------");

});
