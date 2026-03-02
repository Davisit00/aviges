# Aviges: Sistema de gestión del proceso de pesado en la romana camionera

## 1. Instalación:

1. Instalar python, SQL Server Xpress 15 en la maquina donde se desplegará el servidor para el backend y la bdd.

> Pueden ser desplegados en servidores distintos, solo se debe modificar las direcciones en el archivo .env de la carpeta "Backend".
>
> > Si no existe archivo .env, se debe crear, para los efectos de prueba se utilizaron las siguientes variables:
> > <br><br>
> > FLASK_ENV=development
> > FLASK_APP=run.py
> > DATABASE_SERVER=localhost\SQLEXPRESS ("Cambiar en caso de que la dirección del servidor sea otra") <br>
> > DATABASE_NAME=GestionRomanaAvicola ("Depende de las credenciales de la BDD") <br>
> > DATABASE_USER=sa ("Depende de las credenciales de la BDD") <br>
> > DATABASE_PASSWORD=123456 ("Depende de las credenciales de la BDD") <br>
> > DATABASE_DRIVER=ODBC Driver 18 for SQL Server
> > DATABASE_TRUST_CERT=yes
> > JWT_SECRET_KEY=1234 ("Cambiar para mayor seguridad")
