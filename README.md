# 🌐 Pokédex Database - Enciclopedia de Pokémon en Lista

Una aplicación web moderna con diseño de **Catálogo / Lista Interactiva y Panel Inspector Lateral (Master-Detail)**, diseñada específicamente para lucir como una base de datos profesional y moderna de Pokémon, totalmente diferente a las carcasas clásicas de plástico rojo.

---

## 🌟 Características

- **Diseño en Formato Lista Profesional**:
  - **Gran Lista de Pokémon**: Cada fila muestra:
    - Número oficial (#001, #004 Charmander, etc.).
    - Sprite y Nombre.
    - Badges de elementos / tipos con colores característicos.
    - Estadísticas rápidas (PS, Ataque, Defensa).
    - Botón de audio para escuchar el grito oficial directamente desde la lista.
    - Resaltado interactivo al seleccionar cualquier fila.
  - **Panel Inspector Lateral (Fijo / Sticky)**:
    - Ilustración oficial HD con resplandor del color elemental.
    - Reproductor de gritos oficiales con botón de audio y animación de ondas sonoras.
    - Botón para alternar la versión variocolor (**Shiny**).
    - **Estadísticas Base de Combate**: PS, Ataque, Defensa, Atq. Especial, Def. Especial y Velocidad con barras animadas y total **BST**.
    - **Cadena Evolutiva**: Nodos interactivos que muestran los niveles requeridos (ej. Charmander -> Nivel 16 -> Charmeleon -> Nivel 36 -> Charizard). Al hacer clic en cualquier etapa, navega a ese Pokémon.
    - **Detalles y Datos**: Descripción oficial en español (*flavor text*), altura, peso, categoría y habilidades.
- **Buscador y Filtros en Tiempo Real**:
  - Búsqueda por número (#004 o 4) o por nombre (Charmander).
  - Filtro por Generación (Gen 1 a Gen 9).
  - Filtro por Tipo elemental.
- **Controles Adicionales**:
  - Botón de Pokémon **Aleatorio**.
  - Botón para silenciar / activar audio.
  - Navegación con flechas del teclado (`⬆` / `⬇` / `⬅` / `➡`) y barra espaciadora para el grito.

---

## 🚀 Cómo Usar

- **Opción 1**: Haz doble clic en `index.html` para abrirlo en cualquier navegador (Chrome, Edge, etc.).
- **Opción 2**: Ejecuta el servidor local:
  ```bash
  npm start
  ```
  Y abre en tu navegador `http://localhost:3000`.
