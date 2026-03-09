const { parseWhatsappMessage } = require("../services/whatsappParser");

const tests = [

"alternador audi a4 2016",
"necesito alternador audi a4",
"busco turbo bmw 320d 2017",
"motor seat leon 2015",
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
"caja cambios mercedes",

// mensajes reales estilo whatsapp

"hola necesito alternador para audi a4 2016",
"buenas busco turbo bmw 320d",
"tienes radiador ford focus 2012",
"necesito motor seat leon",
"hola busco caja cambios opel astra",
"alternador para audi",
"faro xenon bmw serie 5",
"necesito retrovisor peugeot 308",

// motores

"motor bmw 330d 2018",
"turbo audi 2.0 tdi",
"motor mercedes c220 cdi",
"motor golf 1.9 tdi",

// mensajes desordenados

"audi a4 2016 necesito alternador",
"bmw serie 3 alternador",
"ford focus radiador",
"seat ibiza bomba agua",
"renault megane puerta trasera",

// ruido whatsapp

"hola buenas tengo audi a3 2008 necesito bomba agua",
"buenas tardes busco alternador bmw",
"me hace falta turbo para audi",
"teneis motor seat leon 2015",
"busco caja cambios golf",

// casos raros

"alternador mercedes benz clase c",
"turbo audi a4",
"motor ford focus",
"radiador opel astra",
"inyector bmw 320d",
"bomba agua seat leon",
"paragolpes renault megane",
"retrovisor audi a6",

// casos extremos

"audi alternador",
"bmw motor",
"ford radiador",
"seat turbo",
"mercedes alternador",
];

console.log("===== TEST PARSER EXTENDIDO =====\n");

tests.forEach((msg, index) => {

  const result = parseWhatsappMessage(msg);

  console.log(`Test ${index + 1}`);
  console.log("Mensaje:", msg);
  console.log(result);
  console.log("-------------------------------------");

});
