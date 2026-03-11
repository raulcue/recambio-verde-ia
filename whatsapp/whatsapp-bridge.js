const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const client = new Client({
    authStrategy: new LocalAuth()
});

// Mostrar QR
client.on('qr', qr => {
    console.log('📲 Escanea este QR con WhatsApp');
    qrcode.generate(qr, { small: true });
});

// Cuando conecta
client.on('ready', () => {
    console.log('✅ WhatsApp conectado');
});

// Cuando llega mensaje
client.on('message', async msg => {

    try {

    // ignorar grupos
    if (msg.from.includes('@g.us')) return;

    const phone = msg.from.replace('@c.us', '');

    console.log('📩 Mensaje recibido:', phone);

    let payload = {
        from: `+${phone}`,
        to: '+971523241001'
    };

    // =========================
    // MENSAJE DE TEXTO
    // =========================
    if (!msg.hasMedia) {

        console.log('💬 Texto:', msg.body);

        payload.message = msg.body;

    }

    // =========================
    // MENSAJE CON IMAGEN
    // =========================
    if (msg.hasMedia) {

        console.log('📷 Imagen recibida');

        const media = await msg.downloadMedia();

        payload.image = media.data;
        payload.mimetype = media.mimetype;

    }

const response = await axios.post(
    'https://recambio-verde-iax.onrender.com/api/whatsapp/inbound',
    payload
);

// respuesta conversacional
if (response.data.reply) {
    await msg.reply(response.data.reply);
}

// pedido creado
if (response.data.pedido) {
    await msg.reply(
        `✅ Pedido creado\nNúmero: ${response.data.pedido.numero_pedido}`
    );
}

} catch (error) {

    console.error('❌ Error:', error.message);

    await msg.reply(
        '⚠️ Error procesando el mensaje'
    );

}

});

client.initialize();
