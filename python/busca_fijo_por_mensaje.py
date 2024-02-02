from openai import OpenAI
import tiktoken

mensajes = [
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
    }]

client = OpenAI()

# Obtenemos la lista actual de modelos, e iteramos sobre ella para calcular el parámetro 
modelos = client.models.list()
for modelo in [m.id for m in modelos.data]:
    # Solo queremos los modelos de texto. Otros los ignoramos
    if modelo[:4]!='gpt-' or 'vision' in modelo or 'instruct' in modelo:
        continue
    
    # Obtenemos el objeto encoding de tiktoken para este modelo
    encoding = None
    try:
        encoding = tiktoken.encoding_for_model(modelo)
    except:
        print('No encontramos el encoding para el modelo ' + modelo)
        continue

    # Mandamos los mensajes a chat completions, con la única intención de obtener usage.prompt_tokens
    respuesta = client.chat.completions.create(
        model=modelo,
        messages=mensajes
    )

    # Usamos tiktoken para calcular los tokens de cada mensaje. Cuenta tanto el texto en sí como el rol.
    tiktokens = 0
    for mensaje in mensajes:
        tiktokens += sum([len(encoding.encode(v)) for v in mensaje.values()])
        
    # Usamos la diferencia entre lo que devuelve usage y el calculado por tiktoken para encontrar el número de 
    # tokens fijos por mensaje para este modelo.
    if (respuesta.usage.prompt_tokens - 3 - tiktokens) % len(mensajes) != 0:
        print('No encuentro el numero mágico para '+modelo)
    else:
        print(modelo + ' -> Tokens fijos por mensaje: ' + str((respuesta.usage.prompt_tokens - 3 - tiktokens) // len(mensajes)))

