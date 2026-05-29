# Guía de instalación — Ubuntu + Apache

## Requisitos

- Ubuntu 22.04 o posterior
- Node.js 18+
- Apache 2.4+

---

## 1. Preparar Ubuntu

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y apache2 nodejs npm
sudo a2enmod proxy proxy_http rewrite headers
sudo systemctl restart apache2
```

---

## 2. Copiar archivos al servidor

```bash
# Desde tu PC con Windows (ajusta la IP):
scp -r migracionApache/ usuario@IP_SERVIDOR:/var/www/inventario
```

O clonar el repositorio y usar la carpeta `migracionApache/`.

---

## 3. Instalar dependencias Node

```bash
cd /var/www/inventario/server
npm install
```

---

## 4. Importar la base de datos

```bash
# Crear carpeta database si no existe
mkdir -p /var/www/inventario/database

# Importar el backup SQL → inventario.db
node scripts/import-db.js ../database/backup_20260529.sql
```

---

## 5. Configurar variables de entorno

```bash
cp /var/www/inventario/server/.env.example /var/www/inventario/server/.env
nano /var/www/inventario/server/.env
```

Ajusta `DB_PATH` y `APP_URL` como mínimo.

---

## 6. Configurar Apache

```bash
sudo cp /var/www/inventario/apache/inventario.conf /etc/apache2/sites-available/inventario.conf

# Editar DocumentRoot si es necesario
sudo nano /etc/apache2/sites-available/inventario.conf

sudo a2ensite inventario
sudo a2dissite 000-default
sudo systemctl reload apache2
```

---

## 7. Arrancar el servidor Node

### Opción A: manual (para pruebas)
```bash
cd /var/www/inventario/server
node server.js
```

### Opción B: servicio systemd (para producción)

```bash
sudo nano /etc/systemd/system/inventario.service
```

Contenido:
```ini
[Unit]
Description=Inventario Taller FP
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/inventario/server
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable inventario
sudo systemctl start inventario
sudo systemctl status inventario
```

---

## 8. Verificar

- Abre `http://IP_SERVIDOR` en el navegador
- Comprueba los logs si hay errores:
  ```bash
  sudo journalctl -u inventario -f
  sudo tail -f /var/log/apache2/inventario_error.log
  ```

---

## Estructura final en el servidor

```
/var/www/inventario/
├── public/          ← Apache sirve estos archivos estáticos
├── server/          ← Node.js Express (puerto 3000, interno)
│   ├── server.js
│   ├── db.js
│   ├── .env
│   ├── middleware/
│   └── routes/
├── database/
│   └── inventario.db   ← SQLite (equivalente a D1)
└── apache/
    └── inventario.conf
```

---

## Pendiente / diferencias con la versión Cloudflare

- **OAuth Google** (`/api/oauth/`): no migrado, requiere adaptación adicional
- **`docs.js`** y **`form-corrections.js`**: no migrados (funcionalidad secundaria)
- **Seguridad**: las contraseñas siguen en texto plano — pendiente FASE 1 seguridad
- **Fotos de ítems**: si se suben vía Cloudflare Images, necesitarán adaptarse a almacenamiento local (`multer` ya incluido en las dependencias)
