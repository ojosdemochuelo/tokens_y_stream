import OpenAI from 'openai';
import * as readline from 'node:readline/promises'
import { encoding_for_model } from 'tiktoken';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Instanciándolo sin parámetros, OpenAI cogerá la clave de API de la variable de entorno OPENAI_API_KEY.
// Si lo prefieres, puedes pasarla directamente en el parámetro apiKey, como en la linea comentada abajo
// const client = new OpenAI({ apiKey: 'clave-de-api' });
const client = new OpenAI();
const modelo = 'gpt-3.5-turbo'; // 'gpt-4-1106-preview' // Para GPT 4-Turbo

// Este valor depende del modelo
const fijo_por_mensaje = 3;

// El tamaño de la ventana que no debemos superar (también depende del modelo). 
const ventana = 1500; //4096;

// Obtenemos el objeto encoding de tiktoken para este modelo
const enc = encoding_for_model(modelo);

// Ponemos como mensaje inicial el del rol del sistema, que dictará el comportamiento del modelo durante la interacción completa.
let mensajes = [{ 'role': 'system', 'content': 'Eres un viejo gruñón y cascarrabias. Responde a todo con quejas y desgana, aunque termina ayudando en lo que se te pide.' }];

// Array paralelo, donde guardaremos el número de tokens de cada mensaje
let tokens_mensaje = [enc.encode(mensajes[0].role).length + enc.encode(mensajes[0].content).length + fijo_por_mensaje];

// Tamaño de la respuesta más larga que hayamos recibido.
let max_respuesta = 0;

// La conversación continuará hasta que dejemos un mensaje vacío.
let texto;
while (texto = (await rl.question('¿Qué le quieres decir al chatbot cascarrabias?\n> ')).trim()) {
    // Añadimos la entrada a la lista de mensajes, con el rol 'user', y su tamaño a tokens_mensaje
    mensajes.push({ 'role': 'user', 'content': texto });
    tokens_mensaje.push(enc.encode('user').length + enc.encode(texto).length + fijo_por_mensaje);

    // Queremos dejar suficiente espacio tan larga como la máxima recibida con anterioridad.
    // Si no hay suficiente espacio, borramos tantos mensajes como sean necesarios al principio
    const suma_tokens = tokens_mensaje.reduce(((a, b) => a + b));
    if (suma_tokens + max_respuesta + 3 > ventana) {
        let i = 1;
        for (let sum = 0; suma_tokens + max_respuesta + 3 - sum > ventana; i++)
            sum += tokens_mensaje[i];
        mensajes.splice(1, i);
        tokens_mensaje.splice(1, i);
    }

    // Llamamos al servicio chat completions para obtener la respuesta del modelo, enviando la lista completa de mensajes para poder continuar la conversación.
    const respuesta = await client.chat.completions.create({
        model: modelo,
        messages: mensajes,
        stream: true
    });

    // Vamos recogiendo los trozos de mensaje, los vamos guardando a la vez que los mostramos
    let lista_trozos = [];
    for await (const trozo of respuesta) {
        const trozo_txt = trozo.choices[0]?.delta?.content || '\n';
        process.stdout.write(trozo_txt);
        lista_trozos.push(trozo_txt);
    }

    // Finalmente juntamos todos los trozos para tener el mensaje recompuesto
    const texto_respuesta = lista_trozos.join('');

    // Añadimos la respuesta a la lista de mensajes, con rol 'assistant', y su tamaño a tokens_mensaje
    mensajes.push({ 'role': 'assistant', 'content': texto_respuesta });
    const tokens_respuesta = enc.encode('assistant').length + enc.encode(texto_respuesta).length + fijo_por_mensaje
    tokens_mensaje.push(tokens_respuesta);

    // Actualizamos la respuesta máxima si es necesario
    max_respuesta = Math.max(max_respuesta, tokens_respuesta);

    console.log(texto_respuesta);

}

// Liberamos el objeto encoding cuando no lo necesitamos más
enc.free();

rl.close();