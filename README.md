# Brauhaus2

Brauhaus2 ist die React-/TypeScript-Oberfläche für ein Brauanlagen-System. Die Anwendung stellt Rezepte, Zutaten, abgeschlossene Sude, Brauberechnungen, Einstellungen sowie Produktions- und Steuerungsansichten bereit. Sie läuft als Browser-/PWA-Frontend und kommuniziert über relative API-Pfade mit einer Datenbank-/Backend-Anwendung und einer separaten PI-Steuerung.

## Funktionsumfang

- Anzeige, Auswahl und Bearbeitung von Bierrezepten.
- Pflege von Zutaten-Stammdaten für Hopfen, Malz, Hefe und weitere Zutaten.
- Import von Rezeptdateien über das Datenbank-Backend.
- Verwaltung abgeschlossener beziehungsweise aktiver Sude inklusive Gär-/Reifungsstatus.
- Umrechnung und Skalierung von Rezepten sowie Brauberechnungen.
- Produktionsansicht mit Temperaturanzeige, Wasserfüllstand, Rührwerk-/Heizungsstatus, Prozessliste und Zeitlinie.
- Start eines Brauprozesses durch Übergabe eines aus dem Rezept abgeleiteten Steuerungs-Payloads an die PI-Steuerung.
- Polling des Braustatus, Verfügbarkeitsprüfung der Steuerung und Bedienung von Bestätigungsschritten.
- Web-Push-Unterstützung für mobile Bestätigungs- und Statusmeldungen, sofern die Steuerung die erwarteten Push-Endpunkte bereitstellt.
- Mobile Status-, Aktiver-Sud- und Berechnungsansichten für schmale Viewports.
- PDF-Erzeugung für Einkaufslisten und Sud-Dokumentation.
- Hell-/Dunkel-Theme mit Speicherung im Browser.

## Zusammenspiel mit anderen Anwendungen

Dieses Repository enthält ausschließlich das UI. Persistenz, Hardwarezugriff und eigentliche Prozesssteuerung liegen in anderen Anwendungen.

### Datenbank-/Backend-Anwendung

Das UI nutzt relative Requests unter `/api/database`. Darüber werden Rezepte, abgeschlossene Sude und Zutaten gelesen, angelegt, aktualisiert oder gelöscht. Die genaue Persistenzschicht ist nicht Teil dieses Repositories.

### PI-Steuerung

Das UI nutzt relative Requests unter `/api/controller`. Darüber werden Temperatur, Wasserstatus, Braustatus, Verfügbarkeit, Rezeptübergabe, Braustart, Heizungs-/Rührwerkskommandos, Prozessfortschritt und Bestätigungen gesteuert. Statusdaten werden im UI normalisiert, damit strukturierte und ältere Antwortformen verarbeitet werden können.

### Web-Push und Service Worker

Die PWA registriert einen Service Worker aus `public/service-worker.js`. Push-Subscriptions werden über die Controller-API verwaltet. Der Service Worker implementiert keine eigene Cache-Strategie für App- oder API-Antworten.

### Routing und Reverse Proxy

Die Anwendung verwendet im Browser relative API-Pfade. Für lokale CRA-Entwicklung existiert ein Proxy in `src/setupProxy.js`; dessen Ziel ist installationsspezifisch und muss vor der Verwendung lokal geprüft beziehungsweise angepasst werden. Im Betrieb wird erwartet, dass ein vorgelagerter Webserver oder Reverse Proxy die relativen Pfade an Datenbank-Backend und Steuerung weiterleitet.

## Technischer Aufbau

- Sprache: TypeScript und JavaScript.
- UI-Framework: React 18 auf Basis von Create React App.
- State Management: Redux, Redux Toolkit, Redux Observable, RxJS und Redux Thunk.
- HTTP-Client: Axios.
- UI-Bibliotheken: Material UI, React Bootstrap, Font Awesome, Recharts, React Google Charts, Gantt-Komponenten und weitere spezialisierte Controls.
- Echtzeit-/Signal-Anbindung: `socket.io-client` für ein Steuerungsereignis.
- Tests: Jest und React Testing Library über `react-scripts test`.
- Build: `react-scripts` über Wrapper-Skripte, die eine Frontend-Version in `REACT_APP_VERSION` injizieren.

### Wichtige Verzeichnisse und Dateien

```text
public/
├── index.html
├── manifest.json
├── service-worker.js
└── statische Bild- und Icon-Dateien

scripts/
├── build-with-version.js
└── resolve-app-version.js

src/
├── actions/                 Redux-Actions
├── components/              Wiederverwendbare UI-Komponenten
├── containers/              Hauptansichten für Desktop und Mobile
├── epics/                   Redux-Observable-Epics für API- und Polling-Flows
├── enums/                   Enum-Werte für UI- und Domänenlogik
├── model/                   TypeScript-Modelle und DTOs
├── reducers/                Redux-Reducer
├── repositorys/             API-Repositorys für Datenbank und Steuerung
├── utils/                   Mapping, Berechnungen, PDF, Push, Theme und Statusnormalisierung
├── global.ts                Relative API-Basisfade
├── index.tsx                React-Einstiegspunkt
├── setupProxy.js            Entwicklungsproxy für CRA
└── store.ts                 Redux-Store

docs/
├── frontend-api-usage.md    API-Nutzungsübersicht des Frontends
├── web-push.md              Push-Konzept und Prüfhinweise
└── codex/                   Projekt-, Schnittstellen- und Kompatibilitätskontext
```

## Voraussetzungen

Aus dem Repository ableitbar sind folgende Voraussetzungen:

- Node.js und npm für Installation, Entwicklung, Test und Build.
- Ein moderner Browser für die React-Anwendung.
- Für Push-Funktionen ein Browser mit Service-Worker-, Notification- und PushManager-Unterstützung.
- Zugriff auf eine Datenbank-/Backend-Anwendung, die die unter `/api/database` erwarteten Endpunkte bereitstellt.
- Zugriff auf eine PI-Steuerung, die die unter `/api/controller` erwarteten Endpunkte bereitstellt.
- Für den produktiven Betrieb ein Webserver oder Reverse Proxy, der die statischen Build-Dateien ausliefert und die relativen API-Pfade weiterleitet.

Eine konkrete Node.js-Version ist im Repository nicht festgelegt.

## Installation

```bash
npm install
```

Das Repository enthält eine `package-lock.json`; für reproduzierbare CI- oder Deployment-Installationen kann stattdessen verwendet werden:

```bash
npm ci
```

## Konfiguration

### API-Basisfade

Die zentralen UI-Konstanten sind:

```text
DatabaseURL=/api/database
BaseURL=/api/controller
CommandsURL=/api/controller/Command/
ConfirmURL=/api/controller/Confirm/
```

Diese Werte sind relative Browserpfade. Die konkrete Weiterleitung auf Datenbank-Backend und PI-Steuerung muss außerhalb des React-Builds über Entwicklungsproxy, Webserver oder Reverse Proxy erfolgen.

### Entwicklungsproxy

`src/setupProxy.js` leitet Requests unter `/api` im CRA-Entwicklungsserver weiter. Das dort konfigurierte Ziel ist installationsabhängig. Vor einem lokalen Start muss geprüft werden, ob es zur eigenen Entwicklungsumgebung passt; reale Hosts oder Netzwerkadressen sollten nicht in öffentliche Dokumentation übernommen werden.

Ein neutrales Beispiel für eine lokale Proxy-Zieladresse wäre:

```text
https://<REVERSE_PROXY_HOST>
```

### Build-Version

`scripts/build-with-version.js` setzt `REACT_APP_VERSION` für `react-scripts`. Die Version wird in dieser Reihenfolge ermittelt:

1. `BRAUHAUS_APP_VERSION`
2. `REACT_APP_VERSION`
3. `APP_VERSION`
4. `BUILD_BUILDNUMBER`
5. Tag aus `BUILD_SOURCEBRANCH`, wenn dieser auf ein Tag verweist
6. `git describe --tags --always --dirty`
7. `unknown`

### Push-Konfiguration

Die UI erwartet Push-Endpunkte unter `/api/controller/push/...`. Die eigentlichen VAPID-Schlüssel, Speicherpfade und Push-Secrets gehören zur Steuerungsanwendung und dürfen nicht im Frontend-Repository oder in dieser README dokumentiert werden. Als Platzhalter für externe Konfigurationen gelten zum Beispiel:

```env
WEB_PUSH_VAPID_PUBLIC_KEY=<PUSH_PUBLIC_KEY>
WEB_PUSH_VAPID_PRIVATE_KEY=<PUSH_PRIVATE_KEY>
WEB_PUSH_SUBJECT=<PUSH_SUBJECT>
WEB_PUSH_SUBSCRIPTIONS_FILE=<PUSH_SUBSCRIPTIONS_FILE>
```

Eine `.env.example` existiert derzeit nicht. Sie wäre sinnvoll, falls künftig eindeutig benötigte Build- oder Entwicklungsvariablen eingeführt werden.

## Anwendung starten

### Entwicklungsmodus

```bash
npm start
```

Der CRA-Entwicklungsserver startet die Anwendung und verwendet `src/setupProxy.js` für `/api`-Requests. Die konkrete Browser-Adresse hängt von der lokalen CRA-Umgebung ab und wird vom Startbefehl ausgegeben.

### Produktions-Build

```bash
npm run build
```

Der Build wird in `build/` erzeugt. Die Dateien können anschließend durch einen Webserver ausgeliefert werden. Der Webserver muss zusätzlich die relativen API-Pfade `/api/database` und `/api/controller` passend weiterleiten.

### Deployment-Skripte

`package.json` enthält `build-deploy` und `deploy`. Diese Skripte kopieren Dateien per `scp` an ein installationsspezifisches Ziel. Vor der Verwendung müssen Zielsystem, Benutzer, Pfad und Sicherheitsanforderungen lokal geprüft werden. Die konkreten Werte werden hier bewusst nicht dokumentiert.

## Tests und Qualitätsprüfungen

### Test-Runner

```bash
npm test
```

Startet den CRA-/Jest-Test-Runner. Ohne weitere Parameter läuft dieser typischerweise im Watch-Modus.

### Einmaliger Testlauf für CI oder Agenten

```bash
CI=true npm test -- --watchAll=false
```

### Build-Prüfung

```bash
npm run build
```

Der Build führt die TypeScript-/CRA-Prüfungen aus, die in Create React App integriert sind.

### Storybook

Es gibt Skripte für Storybook:

```bash
npm run storybook
npm run build-storybook
```

Die Projektkontext-Dokumentation markiert die Storybook-Skripte als prüfbedürftig, weil Skriptnamen und installierte Storybook-Version möglicherweise nicht zusammenpassen.

## API-Überblick

Die detaillierte Frontend-API-Nutzung ist in `docs/frontend-api-usage.md` und `docs/codex/interfaces.md` dokumentiert. Dieser Abschnitt fasst nur die wichtigsten UI-Verträge zusammen.

### Datenbank-API unter `/api/database`

| Methode | Pfad | Zweck |
| --- | --- | --- |
| GET | `beers` | Rezepte laden |
| POST | `beer` | Rezept anlegen |
| PUT | `beer/{id}` | Rezept aktualisieren |
| DELETE | `beer/{id}` | Rezept löschen |
| POST | `importbeer` | Rezeptdatei importieren |
| GET | `finishedbeers` | Abgeschlossene Sude laden |
| POST | `finishedbeer` | Abgeschlossenen Sud anlegen oder aktualisieren |
| DELETE | `finishedbeer/{id}` | Abgeschlossenen Sud löschen |
| GET | `hops`, `malts`, `yeasts`, `additionalingredients` | Zutaten laden |
| POST | `hop`, `malt`, `yeast`, `additionalingredient` | Zutaten anlegen |
| DELETE | `hop/{id}`, `malt/{id}`, `yeast/{id}`, `additionalingredient/{id}` | Zutaten löschen |

### Controller-API unter `/api/controller`

| Methode | Pfad | Zweck |
| --- | --- | --- |
| GET | `temperatur/0` | Aktuelle Temperatur lesen |
| GET | `WaterStatus` | Wasserfüllstatus lesen |
| GET | `Status/` | Laufenden Braustatus lesen |
| GET | `Available/` | Erreichbarkeit der Steuerung prüfen |
| GET | `diag` | Diagnose-/Versionsinformation lesen |
| POST | `Recipe/` | Steuerungsrezept senden |
| POST | `Command/StartBrewing:""` | Brauprozess starten |
| POST | `Command/FillWaterAutomatic:{liters}` | Automatische Wasserfüllung starten |
| POST | `Command/TurnOn` / `Command/TurnOff` | Heizung schalten |
| POST | `Command/Speed:{speed}` | Rührwerksgeschwindigkeit setzen |
| POST | `Command/AgitatorInterval:""` | Rührwerksintervall setzen |
| POST | `next` | Zum nächsten Prozessschritt wechseln |
| POST | `Confirm/{confirmState}` | Konkreten Warteschritt bestätigen |
| GET | `push/public-key` | Public Key für Push-Subscription abrufen |
| POST | `push/subscriptions` | Push-Subscription speichern |
| DELETE | `push/subscriptions` | Push-Subscription entfernen |
| POST | `push/test` | Testbenachrichtigung auslösen |

`Confirm/Wait` darf vom UI nicht als Bestätigung gesendet werden. Zulässige Bestätigungen sind die konkret dokumentierten Steuerungszustände wie `Iodine`, `Mashup`, `Cooking`, `Boiling` und `Decoction`.

## Deployment und Betrieb

1. Abhängigkeiten installieren.
2. Produktions-Build erzeugen.
3. Inhalt von `build/` auf dem Ziel-Webserver bereitstellen.
4. Webserver oder Reverse Proxy so konfigurieren, dass:
   - die statischen React-Dateien ausgeliefert werden,
   - `/api/database` zur Datenbank-/Backend-Anwendung zeigt,
   - `/api/controller` zur PI-Steuerung zeigt,
   - Service Worker und Manifest unter demselben Origin erreichbar sind, wenn PWA-/Push-Funktionen genutzt werden.
5. Datenbank-Backend und PI-Steuerung separat betreiben und deren Konfiguration außerhalb dieses Repositories verwalten.

Das Repository enthält keine Docker-Konfiguration und keine systemd-Service-Datei für dieses UI. Der vorhandene Shell-Befehl zum Herunterfahren eines Servers ist installationsbezogen und wird hier nicht als allgemeiner Betriebsablauf dokumentiert.

## Fehleranalyse

Aus dem Projekt ableitbare typische Prüfpunkte:

- `/api/database` nicht erreichbar: Reverse-Proxy-Regel, Datenbank-Backend oder CORS-/Proxy-Konfiguration prüfen.
- `/api/controller` nicht erreichbar: PI-Steuerung, Reverse Proxy und `Available/`-Antwort prüfen.
- Entwicklungsproxy passt nicht zur eigenen Umgebung: `src/setupProxy.js` lokal prüfen und nicht ungeprüft produktiv verwenden.
- Braustatus bleibt leer oder veraltet: `Status/`-Antwort der Steuerung und Statusnormalisierung prüfen.
- Wasseranzeige bleibt auf dem Ausgangswert: `WaterStatus`-Antwort und Polling prüfen.
- Bestätigungsdialog funktioniert nicht: `waiting.waitingFor`, `waiting.canConfirm` und zugehörigen `Confirm/{confirmState}`-Pfad prüfen.
- Push-Schaltflächen melden Fehler: Browser-Unterstützung, Benachrichtigungsberechtigung, Service-Worker-Registrierung und Push-Endpunkte der Steuerung prüfen.
- Build-Version zeigt `unknown`: CI-/Build-Variablen oder Git-Metadaten im Build-Kontext prüfen.
- Storybook startet nicht: Storybook-Skripte und installierte Storybook-Version prüfen.

## Entwicklungsstatus und bekannte Einschränkungen

Die Anwendung ist ein aktiv gepflegtes UI mit dokumentierten Schnittstellen- und Kompatibilitätsregeln unter `docs/codex/`. Stabil dokumentiert sind die relativen API-Basisfade, die wichtigsten Datenbank- und Steuerungsendpunkte, die Rezept-zu-Steuerung-Abbildung, das Statusnormalisierungsmodell sowie die Build-/Testskripte.

Als prüfbedürftig dokumentiert sind unter anderem:

- exakte Payload-Form des Socket.io-Ereignisses für Überhitzung,
- langfristige Stabilität einzelner Legacy-Statusfelder,
- Semantik von Wasserstatuswerten über die UI-Anzeige hinaus,
- Abweichung zwischen dokumentiertem und genutztem Update-Verfahren für abgeschlossene Sude,
- Storybook-Skripte im Verhältnis zur installierten Storybook-Version,
- externe Implementierungsdetails der Push-Funktion in der PI-Steuerung.

Änderungen an API-Pfaden, DTO-Feldern, Enum-Werten, Einheiten, Polling-Verhalten oder terminalen Prozesszuständen müssen mit Datenbank-Backend und PI-Steuerung abgestimmt werden.
