#!/usr/bin/env python3
"""
Script para subir recuérdame a Google Play Store
Usa la API de Google Play Developer v3

Requisitos:
  pip install google-api-python-client google-auth

Uso:
  python3 upload_to_play_store.py --aab ruta/al/archivo.aab [--track internal]
"""

import argparse
import json
import sys
import os
from pathlib import Path

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
except ImportError:
    print("ERROR: Instala las dependencias con:")
    print("  pip install google-api-python-client google-auth")
    sys.exit(1)

# ─── Configuración ───────────────────────────────────────────────────────────

# ID del paquete de la app (debe coincidir con el androidPackage en app.config.ts)
PACKAGE_NAME = "space.manus.recuerdame"  # ← Actualiza con tu bundle ID real

# Ruta al archivo JSON de la cuenta de servicio de Google
# Descárgalo desde Google Play Console → Configuración → Acceso a la API
SERVICE_ACCOUNT_FILE = os.environ.get(
    "GOOGLE_SERVICE_ACCOUNT_JSON",
    "service-account.json"  # Por defecto busca en el directorio actual
)

# Scopes necesarios para la API de Google Play
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]

# ─── Funciones ───────────────────────────────────────────────────────────────

def get_service():
    """Autentica y devuelve el cliente de la API de Google Play."""
    if not Path(SERVICE_ACCOUNT_FILE).exists():
        print(f"ERROR: No se encontró el archivo de cuenta de servicio: {SERVICE_ACCOUNT_FILE}")
        print("\nPara obtenerlo:")
        print("  1. Ve a Google Play Console → Configuración → Acceso a la API")
        print("  2. Crea o vincula un proyecto de Google Cloud")
        print("  3. Crea una cuenta de servicio con rol 'Editor de versiones'")
        print("  4. Descarga el archivo JSON de clave")
        print(f"  5. Guárdalo como: {SERVICE_ACCOUNT_FILE}")
        sys.exit(1)

    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=SCOPES
    )
    return build("androidpublisher", "v3", credentials=credentials)


def upload_aab(service, aab_path: str, track: str, release_notes: dict):
    """
    Sube un archivo AAB a Google Play y lo asigna al track especificado.

    Args:
        service: Cliente autenticado de la API
        aab_path: Ruta al archivo .aab
        track: Track de destino ('internal', 'alpha', 'beta', 'production')
        release_notes: Dict con notas de versión por idioma, ej: {'es-419': 'Correcciones'}
    """
    if not Path(aab_path).exists():
        print(f"ERROR: No se encontró el archivo AAB: {aab_path}")
        sys.exit(1)

    print(f"\n📦 Iniciando subida a Google Play...")
    print(f"   Paquete : {PACKAGE_NAME}")
    print(f"   Archivo : {aab_path}")
    print(f"   Track   : {track}")

    # 1. Crear un nuevo edit (sesión de edición)
    print("\n[1/4] Creando sesión de edición...")
    edit = service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()
    edit_id = edit["id"]
    print(f"      Edit ID: {edit_id}")

    try:
        # 2. Subir el archivo AAB
        print("\n[2/4] Subiendo el archivo AAB...")
        media = MediaFileUpload(
            aab_path,
            mimetype="application/octet-stream",
            resumable=True
        )
        aab_response = service.edits().bundles().upload(
            packageName=PACKAGE_NAME,
            editId=edit_id,
            media_body=media
        ).execute()
        version_code = aab_response["versionCode"]
        print(f"      ✅ AAB subido. Version code: {version_code}")

        # 3. Asignar al track
        print(f"\n[3/4] Asignando versión al track '{track}'...")
        release_body = {
            "versionCodes": [str(version_code)],
            "status": "completed",
            "releaseNotes": [
                {"language": lang, "text": text}
                for lang, text in release_notes.items()
            ]
        }
        service.edits().tracks().update(
            packageName=PACKAGE_NAME,
            editId=edit_id,
            track=track,
            body={"releases": [release_body]}
        ).execute()
        print(f"      ✅ Versión asignada al track '{track}'")

        # 4. Confirmar el edit
        print("\n[4/4] Confirmando cambios...")
        commit_response = service.edits().commit(
            packageName=PACKAGE_NAME,
            editId=edit_id
        ).execute()
        print(f"      ✅ Cambios confirmados. Edit ID: {commit_response['id']}")

        print(f"\n🎉 ¡Subida completada con éxito!")
        print(f"   La versión {version_code} está disponible en el track '{track}'.")
        print(f"   Revísala en: https://play.google.com/console")

    except Exception as e:
        # Si algo falla, eliminar el edit para no dejar sesiones abiertas
        print(f"\n❌ Error durante la subida: {e}")
        print("   Eliminando sesión de edición...")
        try:
            service.edits().delete(packageName=PACKAGE_NAME, editId=edit_id).execute()
        except Exception:
            pass
        raise


def list_tracks(service):
    """Lista los tracks disponibles y sus versiones actuales."""
    print(f"\n📋 Tracks disponibles para {PACKAGE_NAME}:\n")

    edit = service.edits().insert(packageName=PACKAGE_NAME, body={}).execute()
    edit_id = edit["id"]

    try:
        tracks = service.edits().tracks().list(
            packageName=PACKAGE_NAME,
            editId=edit_id
        ).execute()

        for track in tracks.get("tracks", []):
            track_name = track["track"]
            releases = track.get("releases", [])
            if releases:
                latest = releases[-1]
                version_codes = latest.get("versionCodes", [])
                status = latest.get("status", "unknown")
                print(f"  {track_name:12} → versiones: {version_codes} | estado: {status}")
            else:
                print(f"  {track_name:12} → sin versiones")
    finally:
        service.edits().delete(packageName=PACKAGE_NAME, editId=edit_id).execute()


# ─── CLI ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Sube recuérdame a Google Play Store",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  # Subir al track interno (pruebas internas)
  python3 upload_to_play_store.py --aab app-release.aab --track internal

  # Subir a producción con notas de versión
  python3 upload_to_play_store.py --aab app-release.aab --track production \\
    --notes-es "Corrección de notificaciones y mejoras de rendimiento"

  # Ver los tracks y versiones actuales
  python3 upload_to_play_store.py --list-tracks

  # Usar un archivo de cuenta de servicio diferente
  GOOGLE_SERVICE_ACCOUNT_JSON=/ruta/a/clave.json python3 upload_to_play_store.py --aab app.aab
        """
    )

    parser.add_argument(
        "--aab",
        help="Ruta al archivo .aab generado por Expo (recomendado) o .apk"
    )
    parser.add_argument(
        "--track",
        default="internal",
        choices=["internal", "alpha", "beta", "production"],
        help="Track de destino (por defecto: internal)"
    )
    parser.add_argument(
        "--notes-es",
        default="Nuevas funciones y correcciones de errores.",
        metavar="TEXTO",
        help="Notas de versión en español (es-419)"
    )
    parser.add_argument(
        "--notes-en",
        default="New features and bug fixes.",
        metavar="TEXTO",
        help="Notas de versión en inglés (en-US)"
    )
    parser.add_argument(
        "--list-tracks",
        action="store_true",
        help="Listar los tracks y versiones actuales sin subir nada"
    )
    parser.add_argument(
        "--package",
        default=PACKAGE_NAME,
        help=f"ID del paquete Android (por defecto: {PACKAGE_NAME})"
    )

    args = parser.parse_args()

    # Actualizar el package name si se pasó como argumento
    global PACKAGE_NAME
    PACKAGE_NAME = args.package

    service = get_service()

    if args.list_tracks:
        list_tracks(service)
        return

    if not args.aab:
        parser.error("Se requiere --aab para subir un archivo")

    release_notes = {
        "es-419": args.notes_es,
        "en-US": args.notes_en,
    }

    upload_aab(service, args.aab, args.track, release_notes)


if __name__ == "__main__":
    main()
