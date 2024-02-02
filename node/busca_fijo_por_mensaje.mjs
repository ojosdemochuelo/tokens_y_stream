import OpenAI from 'openai';
import { encoding_for_model } from 'tiktoken';

// Juegos de mensajes de prueba que usaremos para comparar los tokens devueltos por 'usage' con los que calculamos con tiktoken.
const mensajes = [
    {
        "role": "system",
        "content": "Sea lo que sea lo que recibas a la entrada, responde 'OK'.",
    },
    {
        "role": "user",
        "content": "This late pivot means we don't have time to boil the ocean for the client deliverable.",
    },
    {
        "role": "assistant",
        "content": "Aquí no se habla más que de tonterías y de mierdas, y esto no hay quien lo aguante.",
    },
    {
        "role": "user",
        "content": "Pues a ver, sinceramente, no sé qué más quieres que te diga."
    },
    {
        "role": "assistant",
        "content": "Vale. Si eso es lo que hay, eso es lo que hay. Pero te aviso: luego no me vengas con llantos ni quejas."
    },
    {
        "role": "user",
        "content": "Estoy de acuerdo."
    }
]
const client = new OpenAI();

// Obtenemos la lista actual de modelos, e iteramos sobre ella para calcular el parámetro 
const modelos = await client.models.list();
for (const obj_modelo of modelos.data) {
    const modelo = obj_modelo.id;

    // Solo queremos los modelos de texto. Otros los ignoramos
    if (modelo.substring(0, 4) !== 'gpt-' || modelo.includes('vision') || modelo.includes('instruct')) continue;

    // Obtenemos el objeto encoding de tiktoken para este modelo
    let encoding;
    try {
        encoding = encoding_for_model(modelo);
    } catch {
        console.log('No encontramos el encoding para el modelo ' + modelo);
        continue;
    }

    // Mandamos los mensajes a chat completions, con la única intención de obtener usage.prompt_tokens
    const respuesta = await client.chat.completions.create({
        model: modelo,
        messages: mensajes
    });

    // Usamos tiktoken para calcular los tokens de cada mensaje. Cuenta tanto el texto en sí como el rol.
    let tiktokens = 0;
    for (const mensaje of mensajes) {
        for (const key in mensaje) {
            tiktokens += encoding.encode(mensaje[key]).length;
        }
    }

    // Usamos la diferencia entre lo que devuelve usage y el calculado por tiktoken para encontrar el número de 
    // tokens fijos por mensaje para este modelo.
    if ((respuesta.usage.prompt_tokens - 3 - tiktokens) % mensajes.length != 0)
        console.log(`No encuentro el numero mágico para ${modelo}.`);
    else
        console.log(`${modelo} -> Tokens fijos por mensaje: ${(respuesta.usage.prompt_tokens - 3 - tiktokens) / mensajes.length}`);
}
