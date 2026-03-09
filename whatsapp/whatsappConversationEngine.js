const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', qr => {
    console.log('Escanea este QR con WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado');
});

client.on('message', async message => {

    const from = message.from.replace('@c.us','');
    const text = message.body;

    console.log("📩 Mensaje recibido:", from, text);

    try {

        await axios.post(
            "https://recambio-verde-iax.onrender.com/api/whatsapp/inbound",
            {
                from: "+" + from,
                to: "+971523241001",
                message: text
            }
        );

        console.log("📤 Enviado al backend");

    } catch(err) {

        console.error("Error enviando al backend", err.message);

    }

});

client.initialize();
