DROP DATABASE IF EXISTS `inventario-departamento`;
CREATE DATABASE `inventario-departamento` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON `inventario-departamento`.* TO 'inventarioelec'@'%';
FLUSH PRIVILEGES;
