# Web-Push für Brauhaus-PWA und Steuerung

## Architekturfund

- Der Service Worker der PWA wird in `src/index.tsx` bei `window.load` registriert und lädt `public/service-worker.js` nur in Production-Builds.
- Die UI-Einstellungen liegen in `src/containers/Settings/SettingsPage.tsx` und verwenden bestehende Klassenkomponenten und CSS in `SettingsPage.css`.
- Steuerungs-Requests sind in `src/repositorys/ProductionRepository.ts` über relative URLs unter `/api/controller` gekapselt; die Push-UI nutzt denselben relativen Controller-Basis-Pfad in `src/utils/pushService.ts`.
- Der aktuelle Prozessstatus wird von der PI-Steuerung als `GET /Status/` geliefert. Laut externem Control-Kontext liegt die Statushoheit in der Steuerung; in diesem UI-Repository ist der Python-Code nicht vorhanden.
- Ein Zustandswechsel zu `waiting.waitingFor` muss zuverlässig in der Steuerung beim internen Statuswechsel erkannt werden, nicht beim UI-Polling. Geeigneter Ereignisschlüssel: Prozessidentität, `currentStep.index`, `currentStep.phase`, `waiting.waitingFor`.
- Bestehende Persistenz der Steuerung ist in diesem Repository nicht implementierbar, weil die Flask-/Raspberry-Pi-Steuerung nicht Teil dieses Checkouts ist. Needs verification im Steuerungs-Repository.
- Teststruktur der UI: CRA/Jest-Tests liegen neben den Dateien als `*.test.ts`/`*.test.tsx`. Backendtests der Steuerung sind in diesem Repository nicht vorhanden. Needs verification im Steuerungs-Repository.

## Neue UI-Endpunkte unter `/api/controller`

Die PWA erwartet folgende Steuerungs-Endpunkte:

| Methode | Pfad | Zweck |
| --- | --- | --- |
| `GET` | `/push/public-key` | VAPID Public Key für `PushManager.subscribe()` abrufen. |
| `POST` | `/push/subscriptions` | Browser-`PushSubscription` idempotent speichern. |
| `DELETE` | `/push/subscriptions` | Subscription anhand von `{ "endpoint": "..." }` entfernen. |
| `POST` | `/push/test` | Testnachricht an registrierte Subscriptions senden. |

Über Caddy werden diese im Browser relativ als `/api/controller/push/...` aufgerufen. Es wird keine direkte Browser-Verbindung zu Port 5000 aufgebaut.

## Konfiguration im Steuerungs-Backend

Empfohlene Environment-Variablen:

```text
WEB_PUSH_VAPID_PUBLIC_KEY=<public key>
WEB_PUSH_VAPID_PRIVATE_KEY=<private key>
WEB_PUSH_VAPID_SUBJECT=mailto:admin@example.local
WEB_PUSH_SUBSCRIPTIONS_FILE=/var/lib/brauhaus/push-subscriptions.json
```

Der Private Key darf niemals an die UI ausgeliefert oder im Repository gespeichert werden. Nur `WEB_PUSH_VAPID_PUBLIC_KEY` wird über `GET /push/public-key` an die PWA gesendet.

## VAPID-Schlüssel erzeugen

Wenn im Steuerungs-Backend `pywebpush`/`py-vapid` eingesetzt wird:

```bash
python -m venv .venv
. .venv/bin/activate
pip install py-vapid
python -m py_vapid --gen
```

Alternativ kann mit Node/Web-Push ein Paar erzeugt werden:

```bash
npx web-push generate-vapid-keys
```

Die erzeugten Werte anschließend als Environment-Variablen im systemd-Service der Steuerung eintragen und die Steuerung neu starten.

## Backend-Implementierungsvorgaben

- Subscription-Payload vollständig validieren: `endpoint`, `keys.p256dh`, `keys.auth` müssen nicht-leere Strings sein.
- Endpoint ist die eindeutige ID; mehrfaches Registrieren desselben Endpoints ist idempotent.
- Persistenz atomisch schreiben, z. B. temporäre Datei plus `os.replace`.
- Eine beschädigte Persistenzdatei darf den Start nicht verhindern; stattdessen leer starten und Fehler ohne Secrets loggen.
- Versand in einem gekapselten Push-Service implementieren: `subscribe`, `unsubscribe`, `send_notification`, `send_to_all`.
- HTTP 404/410 des Push-Dienstes entfernt die Subscription; temporäre Fehler bleiben gespeichert.
- Push-Versand darf den Brauprozess nie abbrechen und sollte über vorhandene Nebenläufigkeitsmuster oder einen begrenzten Executor erfolgen.
- Trigger nur beim Eintritt in einen bestätigungspflichtigen Zustand mit `canConfirm === true` senden, nicht bei Status-Polling.

## Notification-Payload

Beispiel:

```json
{
  "title": "Abmaischen",
  "body": "Bitte Abmaischen bestätigen.",
  "url": "/",
  "tag": "brew-confirmation-6-MASHING_OUT_CONFIRMATION",
  "data": {
    "waitingFor": "MASHING_OUT_CONFIRMATION",
    "stepIndex": 6,
    "phase": "MASHING_OUT"
  }
}
```

Der Service Worker öffnet ausschließlich URLs innerhalb des eigenen Origins; externe Push-Payload-URLs werden auf `/` zurückgesetzt.

## Einrichtung und Android-Test

1. PWA über `https://192.168.178.72` laden.
2. In Android/Chrome die PWA installieren.
3. In der PWA `Einstellungen` öffnen.
4. `Push-Benachrichtigungen aktivieren` antippen und Berechtigung erlauben.
5. `Testnachricht senden` antippen.
6. PWA schließen oder in den Hintergrund legen.
7. Einen Brauzustand erreichen, in dem `waiting.canConfirm === true` und `waiting.waitingFor` einer der bestätigungspflichtigen Werte ist.
8. Prüfen, dass Android eine Benachrichtigung anzeigt und ein Klick die vorhandene PWA fokussiert oder `/` öffnet.

## Abgelaufene Subscriptions

Antwortet der Push-Dienst beim Versand mit HTTP 404 oder 410, entfernt die Steuerung die Subscription aus ihrer Persistenz. Temporäre Netzwerk- oder Serverfehler werden geloggt, behalten die Subscription aber bei und dürfen andere Geräte nicht blockieren.
