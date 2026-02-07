OUTFIT_ANALYSIS_PROMPT = """Analiza esta imagen de outfit/moda e identifica TODAS las prendas de vestir y accesorios visibles.

Para CADA prenda identificada, devuelve un objeto JSON con estos campos:
- "name": nombre descriptivo en español SIN incluir el color (ej: "Blazer de corte recto", "Jeans slim fit", NO "Blazer azul marino")
- "type": categoría, DEBE ser una de: "Top", "Bottom", "Vestido", "Abrigo", "Calzado", "Accesorio"
- "color": color básico principal, DEBE ser uno de: "negro", "blanco", "gris", "rojo", "azul", "verde", "amarillo", "naranja", "rosa", "morado", "marrón", "beige", "dorado", "plateado", "crema"
- "material": material estimado (ej: "algodón", "cuero", "denim", "lana", "seda")
- "style": estilo de la prenda (ej: "casual", "formal", "deportivo", "bohemio", "elegante")
- "season": temporada recomendada (ej: "primavera", "verano", "otoño", "invierno", "todo el año")
- "confidence": tu nivel de confianza en la identificación, de 0 a 100

Reglas:
- Identifica TODAS las prendas visibles, incluyendo accesorios (bolsos, gorras, lentes, cinturones, joyas)
- Si no puedes determinar un campo con certeza, usa null
- El campo "type" es obligatorio y SIEMPRE debe ser uno de los 6 valores permitidos
- El campo "name" NO debe incluir el color de la prenda
- El campo "color" debe ser un color básico de la lista proporcionada
- Sé específico en los nombres (no solo "camisa", sino "camisa de lino de tirantes")
- Si la imagen NO contiene ropa o moda, devuelve un array vacío

Además, analiza el outfit completo y proporciona:
- "outfit_style": estilo general del outfit (ej: "casual chic", "streetwear", "formal")
- "outfit_season": temporada del outfit completo

Responde ÚNICAMENTE con JSON válido en este formato exacto, sin texto adicional:
{
  "outfit_style": "string o null",
  "outfit_season": "string o null",
  "garments": [
    {
      "name": "string",
      "type": "Top|Bottom|Vestido|Abrigo|Calzado|Accesorio",
      "color": "string o null",
      "material": "string o null",
      "style": "string o null",
      "season": "string o null",
      "confidence": 0-100
    }
  ]
}"""
