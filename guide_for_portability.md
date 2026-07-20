# Guía para la Portabilidad y Modificación del Código Fuente de 'recuérdame'

Esta guía detalla los pasos necesarios para exportar, transferir y configurar el código fuente de la aplicación 'recuérdame' para su desarrollo o modificación en diferentes entornos o cuentas de desarrollador. Esto es crucial para mantener la flexibilidad y permitir que otros equipos o individuos puedan trabajar con el proyecto.

## 1. Exportar/Transferir el Código Fuente

El código fuente de 'recuérdame' es una aplicación Expo/React Native estándar, lo que facilita su portabilidad. Puedes transferirlo de varias maneras:

### Opción A: Control de Versiones (Recomendado: GitHub, GitLab, Bitbucket)

La forma más robusta y colaborativa de gestionar el código es a través de un sistema de control de versiones como Git, alojado en plataformas como GitHub, GitLab o Bitbucket.

1.  **Inicializar un Repositorio Git (si no existe):**
    ```bash
    cd /home/ubuntu/recuerdame
    git init
    git add .
    git commit -m "Initial commit of recuerdame app"
    ```
2.  **Crear un Repositorio Remoto:** Ve a tu plataforma preferida (GitHub, GitLab, etc.) y crea un nuevo repositorio vacío. Copia la URL del repositorio remoto.
3.  **Conectar y Subir el Código:**
    ```bash
    git remote add origin <URL_DEL_REPOSITORIO_REMOTO>
    git branch -M main
    git push -u origin main
    ```

### Opción B: Archivo ZIP

Para una transferencia simple o una copia de seguridad local, puedes comprimir el directorio del proyecto.

1.  **Comprimir el Proyecto:**
    ```bash
    cd /home/ubuntu
    zip -r recuerdame_source.zip recuerdame/
    ```
    El archivo `recuerdame_source.zip` contendrá todo el código fuente y los recursos del proyecto.

## 2. Requisitos para Configurar un Nuevo Entorno de Desarrollo

Para que 'recuérdame' funcione en un nuevo entorno, necesitarás instalar las siguientes herramientas:

1.  **Node.js:** Asegúrate de tener una versión compatible de Node.js (se recomienda la versión 20.x o superior). Puedes instalarlo con `nvm` (Node Version Manager) o directamente desde el sitio web oficial.
    ```bash
    # Ejemplo con nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    source ~/.bashrc # O ~/.zshrc
    nvm install 20
    nvm use 20
    ```
2.  **PNPM:** 'recuérdame' utiliza PNPM como gestor de paquetes. Instálalo globalmente:
    ```bash
    npm install -g pnpm
    ```
3.  **Expo CLI:** La interfaz de línea de comandos de Expo es esencial para ejecutar y construir la aplicación.
    ```bash
    pnpm install -g expo-cli
    ```
4.  **Dependencias del Proyecto:** Una vez clonado o descomprimido el proyecto, navega a su directorio e instala las dependencias:
    ```bash
    cd /ruta/a/tu/proyecto/recuerdame
    pnpm install
    ```

## 3. Actualizar `app.config.ts` para Diferentes Cuentas

El archivo `app.config.ts` contiene la configuración principal de tu aplicación Expo, incluyendo el ID del paquete (Bundle ID para iOS, Package Name para Android) y el nombre de la aplicación. Estos deben ser únicos para cada aplicación en las tiendas de aplicaciones.

1.  **Abrir `app.config.ts`:** Localiza el archivo en la raíz de tu proyecto.

2.  **Modificar `appName`:** Cambia el nombre visible de la aplicación.
    ```typescript
    const env = {
      appName: "Mi Nuevo Recordatorio", // <-- Actualiza aquí
      appSlug: "{{project_name}}", // Mantener este valor único para el proyecto Expo
      logoUrl: "",
      scheme: schemeFromBundleId,
      iosBundleId: bundleId,
      androidPackage: bundleId,
    };
    ```

3.  **Modificar `bundleId` (Crucial):** El `bundleId` (para iOS) y `androidPackage` (para Android) deben ser **únicos** para cada aplicación que subas a la App Store o Google Play. Si estás usando una cuenta de desarrollador diferente, **DEBES** cambiar este valor.

    Busca la línea que define `bundleId` y modifícala. Se recomienda usar un formato que incluya el nombre de tu organización o un identificador único.

    **Original:**
    ```typescript
    const bundleId = "{{bundle_id}}";
    ```

    **Ejemplo de Modificación:**
    ```typescript
    const bundleId = "com.tuorganizacion.minuevorecordatorio"; // <-- Actualiza aquí
    ```
    Asegúrate de que este nuevo `bundleId` no esté ya en uso en las tiendas de aplicaciones.

4.  **Generar un Nuevo Logo (Opcional pero Recomendado):** Si deseas una identidad visual diferente, puedes generar un nuevo logo y actualizar `logoUrl` en `app.config.ts`, así como reemplazar los archivos en `assets/images/`.

## 4. Generar Nuevas Credenciales de Firma (Keystores) para Google Play

Cada aplicación Android subida a Google Play debe estar firmada con una clave de firma (keystore) única. Si vas a subir la aplicación a una cuenta de Google Play Console diferente, necesitarás generar nuevas credenciales de firma.

**Importante:** Nunca compartas tus keystores privados. Si pierdes tu keystore, no podrás actualizar tu aplicación en Google Play.

### Opción A: Usar Expo Application Services (EAS) (Recomendado)

EAS Build gestiona automáticamente tus claves de firma, lo cual es la opción más sencilla y segura.

1.  **Iniciar Sesión en Expo:**
    ```bash
    expo login
    ```
    Si no tienes una cuenta de Expo, crea una.

2.  **Configurar EAS Build:**
    ```bash
    eas build:configure
    ```
    Esto creará un archivo `eas.json` y te guiará para configurar tus perfiles de construcción.

3.  **Generar una Nueva Clave de Firma:** Cuando configures tu primer build de Android con EAS para una nueva cuenta, EAS te preguntará si quieres generar una nueva clave de firma o usar una existente. Elige generar una nueva. EAS la gestionará por ti.
    ```bash
    eas build -p android
    ```
    Sigue las instrucciones. EAS se encargará de generar y almacenar de forma segura el keystore.

### Opción B: Generación Manual (Solo si no usas EAS Build)

Si no utilizas EAS Build y gestionas tus builds de forma local, deberás generar un keystore manualmente.

1.  **Generar el Keystore:** Abre una terminal y ejecuta el siguiente comando. Reemplaza `my-upload-key` con un nombre de archivo de tu elección y `my-alias` con un alias para tu clave.
    ```bash
    keytool -genkeypair -v -keystore my-upload-key.keystore -alias my-alias -keyalg RSA -keysize 2048 -validity 10000
    ```
    Se te pedirá que crees una contraseña para el keystore y para la clave, así como información sobre tu organización. **Guarda estas contraseñas y el archivo `.keystore` en un lugar seguro.**

2.  **Configurar el Proyecto para Usar el Keystore:** Esto implica configurar tu archivo `android/app/build.gradle` para referenciar este keystore. Los detalles exactos varían, pero generalmente se vería algo así:
    ```gradle
    android {
        ...
        signingConfigs {
            release {
                storeFile file("my-upload-key.keystore")
                storePassword "<TU_PASSWORD_KEYSTORE>"
                keyAlias "my-alias"
                keyPassword "<TU_PASSWORD_KEY>"
            }
        }
        buildTypes {
            release {
                ...
                signingConfig signingConfigs.release
            }
        }
    }
    ```
    **Nota:** Nunca incluyas contraseñas directamente en tu código fuente. Usa variables de entorno o un sistema de gestión de secretos.

## 5. Script de Subida a Google Play (scripts/upload_to_play_store.py)

El script `scripts/upload_to_play_store.py` que te he proporcionado automatiza el proceso de subida de tu AAB/APK a Google Play Console. Para usarlo con una nueva cuenta, necesitarás:

1.  **Archivo de Cuenta de Servicio JSON:** Descarga un nuevo archivo JSON de cuenta de servicio desde la Google Play Console de la **nueva cuenta** de desarrollador. Este archivo otorga permisos al script para interactuar con la API de Google Play.
    *   Ve a Google Play Console → Configuración → Acceso a la API.
    *   Crea una nueva cuenta de servicio (o usa una existente) y asegúrate de que tenga el rol de 'Editor de versiones'.
    *   Descarga la clave JSON y guárdala en un lugar seguro en tu proyecto (por ejemplo, `service-account.json` en la raíz del proyecto, o especifica su ruta con la variable de entorno `GOOGLE_SERVICE_ACCOUNT_JSON`).

2.  **Actualizar `PACKAGE_NAME` en el Script:** Asegúrate de que la variable `PACKAGE_NAME` en el script `upload_to_play_store.py` coincida con el `bundleId` (o `androidPackage`) que configuraste en `app.config.ts`.

Siguiendo estos pasos, podrás transferir y continuar el desarrollo de 'recuérdame' en cualquier entorno y subirlo a diferentes cuentas de Google Play Console de manera efectiva.
