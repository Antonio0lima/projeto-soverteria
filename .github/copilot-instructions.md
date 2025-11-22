# Copilot Instructions for projeto-soverteria

## Project Overview
This is a Node.js/Express web application for managing a sorveteria (ice cream shop). It uses EJS for server-side rendering and MySQL for persistent data storage. The main entry point is `server.js`.

## Architecture & Data Flow
- **Express server** (`server.js`): Handles routing, middleware, and view rendering.
- **Database connection** (`db.js`): Uses `mysql2/promise` for async MySQL queries. Connection details are hardcoded.
- **Views** (`views/`): EJS templates for all pages. Main views include `loginEregistro.ejs`, `cardapio.ejs`, `inicial.ejs`, `perfil.ejs`, `fila-pedidos.ejs`, and `lista-clientes.ejs`.
- **Static assets** (`public/`): CSS, JS, and images are served from here.
- **Routes**:
  - `/` → login/registration page
  - `/cardapio`, `/inicial`, `/perfil` → main app pages
  - `/fila-pedidos` (GET): Lists orders, joins with clients
  - `/lista-clientes` (GET): Lists all clients
  - `/atualizar-status` (POST): Updates order status
  - `/editar-pedido` (POST): Updates order value

## Developer Workflows
- **Start server**: `npm start` or `node server.js` (port 3000)
- **No test suite**: The `test` script is a placeholder; no automated tests are present.
- **Debugging**: Use `console.log` for server-side debugging. Errors are logged to the console.
- **Database**: Ensure MySQL is running and credentials in `db.js` are correct. The database name is `sorveteria`.

## Conventions & Patterns
- **EJS rendering**: Data is passed to views via `res.render(view, data)`.
- **Async/await**: All DB queries use async/await.
- **Error handling**: Errors are logged and returned as HTTP 500 responses with a message.
- **Form data**: Use `express.urlencoded({ extended: true })` for parsing POST bodies.
- **No authentication/authorization**: The app does not implement user auth.
- **Hardcoded DB credentials**: Credentials are in `db.js` and should be secured for production.

## Integration Points
- **MySQL**: All persistent data is stored in MySQL. Tables referenced: `pedidos`, `clientes`.
- **Front-end JS**: Client-side scripts are in `public/scripts/`.

## Examples
- To add a new route, follow the pattern in `server.js`:
  ```js
  app.get('/nova-rota', (req, res) => {
    res.render('nome-da-view');
  });
  ```
- To query the database:
  ```js
  const [rows] = await pool.query('SELECT * FROM tabela');
  ```

## Key Files
- `server.js`: Main server logic and routes
- `db.js`: Database connection
- `views/`: EJS templates
- `public/`: Static assets

---
_If any section is unclear or missing, please provide feedback to improve these instructions._
