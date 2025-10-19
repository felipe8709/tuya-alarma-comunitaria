const crypto = require('crypto');

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { clientId, secret, deviceId, action } = req.body;
    
    if (!clientId || !secret || !deviceId || !action) {
      return res.status(400).json({ 
        error: 'Faltan parámetros: clientId, secret, deviceId, action' 
      });
    }

    console.log('🔧 Procesando solicitud para:', action);

    // 1. OBTENER TOKEN DE ACCESO
    const timestamp = Date.now().toString();
    const stringToSign = clientId + timestamp;
    
    const tokenSign = crypto
      .createHmac('sha256', secret)
      .update(stringToSign, 'utf8')
      .digest('hex')
      .toUpperCase();

    const tokenResponse = await fetch(`https://openapi.tuyaus.com/v1.0/token?grant_type=1`, {
      method: 'GET',
      headers: {
        'client_id': clientId,
        'sign': tokenSign,
        't': timestamp,
        'sign_method': 'HMAC-SHA256'
      }
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.success) {
      console.error('❌ Error token:', tokenData);
      return res.json({ 
        success: false, 
        error: `Error en token: ${tokenData.msg}`,
        details: tokenData
      });
    }

    const accessToken = tokenData.result.access_token;
    console.log('✅ Token obtenido');

    // 2. ENVIAR COMANDO AL DISPOSITIVO
    const commandTimestamp = Date.now().toString();
    const commandStringToSign = clientId + accessToken + commandTimestamp;
    
    const commandSign = crypto
      .createHmac('sha256', secret)
      .update(commandStringToSign, 'utf8')
      .digest('hex')
      .toUpperCase();

    const commands = [
      {
        "code": "switch_1",
        "value": action === 'on'
      },
      {
        "code": "switch_2", 
        "value": action === 'on'
      }
    ];

    console.log('📤 Enviando comandos:', commands);

    const commandResponse = await fetch(`https://openapi.tuyaus.com/v1.0/devices/${deviceId}/commands`, {
      method: 'POST',
      headers: {
        'client_id': clientId,
        'access_token': accessToken,
        'sign': commandSign,
        't': commandTimestamp,
        'sign_method': 'HMAC-SHA256',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ commands })
    });

    const commandData = await commandResponse.json();
    
    console.log('📥 Respuesta Tuya:', commandData);

    if (commandData.success) {
      res.json({
        success: true,
        action: action,
        message: `Dispositivo ${action === 'on' ? 'activado' : 'desactivado'}`,
        data: commandData
      });
    } else {
      res.json({
        success: false,
        error: `Error en comando: ${commandData.msg}`,
        details: commandData
      });
    }

  } catch (error) {
    console.error('💥 Error general:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
