from openai import OpenAI
import tiktoken

# Instanciándolo sin parámetros, OpenAI cogerá la clave de API de la variable de entorno OPENAI_API_KEY.
# Si lo prefieres, puedes pasarla directamente en el parámetro apiKey, como en la linea comentada abajo
#client = OpenAI(api_key='clave-de-api',)
client = OpenAI()
modelo = 'gpt-4-turbo-preview' #'gpt-3.5-turbo' # 'gpt-4-turbo-preview' # Para GPT 4-Turbo

# Este valor depende del modelo
fijo_por_mensaje = 3

# El tamaño de la ventana que no debemos superar (también depende del modelo). 
ventana = 4096

# Obtenemos el objeto encoding de tiktoken para este modelo
enc = tiktoken.encoding_for_model(modelo)

# Ponemos como mensaje inicial el del rol del sistema, que dictará el comportamiento del modelo durante la interacción completa.
mensajes = [{'role': 'system', 'content': 'Eres un viejo gruñón y cascarrabias. Responde a todo con quejas y desgana, aunque termina ayudando en lo que se te pide.'}]

# Lista paralela, donde guardaremos el número de tokens de cada mensaje
tokens_mensaje = [len(enc.encode(mensajes[0]['role'])) + len(enc.encode(mensajes[0]['content'])) + fijo_por_mensaje]

# Tamaño de la respuesta más larga que hayamos recibido.
max_respuesta = 0

while True:
    # La conversación continuará hasta que dejemos un mensaje vacío
    texto_user = input('¿Qué le quieres decir al chatbot cascarrabias?\n> ').strip()
    if len(texto_user)==0: 
        break

    # Añadimos la entrada a la lista de mensajes, con el rol 'user', y su tamaño a tokens_mensaje
    mensajes.append({'role': 'user', 'content': texto_user})
    tokens_mensaje.append(len(enc.encode('user')) + len(enc.encode(texto_user)) + fijo_por_mensaje)

    # Queremos dejar suficiente espacio tan larga como la máxima recibida con anterioridad.
    # Si no hay suficiente espacio, borramos tantos mensajes como sean necesarios al principio
    suma_tokens = sum(tokens_mensaje)
    if suma_tokens + 3 + max_respuesta > ventana:
        i = 2
        suma = tokens_mensaje[1]
        while suma_tokens + max_respuesta + 3 - suma > ventana:
            suma += tokens_mensaje[i]
            i += 1
        del mensajes[1:i]
        del tokens_mensaje[1:i]

    # Llamamos al servicio chat completions para obtener la respuesta del modelo, enviando la lista completa de mensajes para poder continuar la conversación.
    respuesta = client.chat.completions.create(
        model=modelo,
        messages=mensajes,
        stream=True
    )

    texto_respuesta = ''
    for trozo in respuesta:
        trozo_txt = trozo.choices[0].delta.content or '\n'
        texto_respuesta += trozo_txt 
        print(trozo_txt, end='', flush=True)

    # Añadimos la respuesta a la lista de mensajes, con rol 'assistant', y su tamaño a tokens_mensaje
    mensajes.append({'role': 'assistant', 'content': texto_respuesta})
    tokens_respuesta = len(enc.encode('assistant')) + len(enc.encode(texto_respuesta)) + fijo_por_mensaje
    tokens_mensaje.append(tokens_respuesta)

    # Actualizamos la respuesta máxima si es necesario
    if tokens_respuesta > max_respuesta:
        max_respuesta = tokens_respuesta
