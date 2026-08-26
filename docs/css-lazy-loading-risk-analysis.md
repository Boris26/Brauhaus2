# CSS-/Style-Risikoanalyse nach Einführung von Lazy Loading

Stand: 2026-08-26, Branch `work`, untersucht gegen Commit `8fbc064` (`Add controller UI mode with lazy loading`) und dessen Parent.

> **Umsetzungsstatus:** Die in diesem Bericht priorisierten P1-Befunde `.info`, generische Production-Gridklassen, `.finish-btn`, die fehlende Main-CSS-Ownership, `.ingredients-wrapper` und `.view-loading` wurden im Folge-Task **Fix lazy-loaded CSS collisions** behoben. Die nachfolgenden Abschnitte bleiben als Befundaufnahme des analysierten Ausgangszustands erhalten; die offenen P2/P3-Punkte sind weiterhin als Folgethemen zu verstehen.

## Kurzfazit

**Ja, das Aussehen kann noch davon abhängen, welche Lazy-Route zuvor geöffnet wurde.** Der konkrete, heute nachweisbare Fall ist `Production.css`: Die ungescopten Klassen `.info`, `.settings`, `.left`, `.list` und `.meters` werden beim ersten Besuch von Production dauerhaft in das Dokument eingebracht. `.info` kollidiert unmittelbar mit dem gleichnamigen Typ-Selektor des gemeinsamen `ModalDialog`; nach einem Production-Besuch erhält ein Info-Dialog deshalb zusätzlich Grid-, Flex-, Abstands-, Größen- und Overflow-Regeln. Daneben kann `FinishedBrewsTable.css` über die ungescopte Klasse `.finish-btn` den Rezepteditor beeinflussen. Die hohe Spezifität der meisten übrigen Route-Regeln verhindert derzeit einen sichtbaren Cross-Route-Effekt, beseitigt aber nicht die technische Abhängigkeit.

Die bereits vorgenommene Korrektur `8794766` hat die größten Startfehler richtig entschärft: Reset/Font/Root-Hintergrund, Bootstrap und SimpleBar werden jetzt am Entry Point eager geladen. Es verbleiben jedoch (a) ungescopte Lazy-CSS-Regeln, (b) ein nicht importiertes `Main.css` mit global gedachten Main-/SimpleBar-Regeln und (c) ein ungestylter Suspense-Fallback.

## 1. Aktuelle Lazy-Loading-Views

| View | Lazy-Grenze | Modus/Erreichbarkeit | Bemerkung |
|---|---|---|---|
| Main / Bierübersicht | `Main.connect` in `containers/index.tsx` | Desktop | `Main.tsx` importiert selbst **kein** `Main.css`. |
| Production | `Production.connect` | Desktop und Controller | Kritischer Controller-Startchunk. |
| BeerForm / Rezepteditor (`DATABASE`) | `BeerForm.connect` | Desktop | CSS direkt im View. |
| Finished Brews | `FinishedBrewsTable.connect` | Desktop | Nutzt SimpleBar und MUI. |
| Ingredients | `IngredientsFormPage.connect` | Desktop | Nutzt SimpleBar und MUI. |
| Settings | `SettingsPage.connect` | Desktop | Mobile importiert dieselbe Seite statisch als Unteransicht. |
| BrewingCalculations | `BrewingCalculations` | Desktop | MUI-Regeln sind unter `.BrewingCalculations-outer` gescopt. |
| Version | `VersionPage` | Desktop | Rein route-spezifische CSS-Klassen. |
| Dashboard | `DashboardPage.connect` | Desktop bzw. `/dashboard` auch bei schmalem Viewport | Eigener Chunk, route-spezifische Präfixe. |
| Mobile Production | `MobileProductionView.connect` in `App.tsx` | Mobile, außer `/dashboard` | Eigener App-Level-Suspense. |
| Mobile Finished Brew | `MobileActiveFinishedBrewView.connect` innerhalb Mobile Production | Mobile, erst beim Tab | Verschachtelte Lazy-Grenze; der äußere Suspense fängt sie ab. |
| Mobile Calculations / Mobile Settings | **nicht separat lazy** | Teil des Mobile-Production-Graphen | Ihre Module/CSS werden mit dem Mobile-Chunk geladen, auch bevor der Tab geöffnet wird. |

`Header`, `App` und `Index` bleiben eager. Es gibt keine React-Router-CSS-Grenze; die View-Auswahl geschieht über Redux und bereits injiziertes CSS wird beim View-Wechsel nicht entfernt.

## 2. CSS-Dateien pro Lazy-View

Die Tabelle unterscheidet direkte Imports von statisch erreichbaren Unterkomponenten. Ein Unterkomponenten-Stylesheet gehört beim ersten Laden ebenfalls zum betreffenden Chunk/Chunkgraphen.

| Lazy-View | Direkte CSS-Imports | CSS über statische Unterkomponenten | Drittanbieter-CSS |
|---|---|---|---|
| Main | **keines** | `BeerRecipes/Table.css`, `Details/Details.css` | SimpleBar-Basis nur eager aus `index.tsx`; MUI wird per JS/Emotion/JSS erzeugt. |
| Production | `Production.css` | `WaterControll.css`, `Flame.css`, `QuantityPicker.css`, `ProcessList.css`, `ProductionTemperatureTimeline.css`, `InlineProcessNotice.css`, bei Dialogen `ModalDialog.css` | `@fortawesome/fontawesome-free/css/all.css` direkt; Bootstrap und SimpleBar eager. Recharts benötigt kein importiertes Paket-CSS. |
| BeerForm | `BeerForm.css` | `ModalDialog.css`; `CreateYeastForm` importiert redundant ebenfalls `BeerForm.css`, ist im aktuellen Editorgraphen aber nicht als Kind nachgewiesen | Kein weiteres Paket-CSS. |
| Finished Brews | `FinishedBrewsTable.css` | `Panel.css`; bei geöffneten Details `BrewProcessChart.css` (statischer Import) | SimpleBar-Basis eager; MUI runtime styles; Google Charts kein CSS-Import. |
| Ingredients | `IngredientsFormPage.css` | keine weitere lokale CSS-Datei im sichtbaren statischen Viewgraphen | SimpleBar-Basis eager; MUI runtime styles. |
| Settings | `SettingsPage.css` | keine | Kein Paket-CSS. |
| BrewingCalculations | `BrewingCalculations.css` | keine | SimpleBar-Basis eager; MUI runtime styles. |
| Version | `VersionPage.css` | keine | Kein Paket-CSS. |
| Dashboard | `DashboardPage.css` | keine | MUI Icons haben kein Paket-CSS; Recharts kein CSS-Import. |
| Mobile Production | `MobileProductionView.css` | `MobileBrewingCalculationsView.css`, `SettingsPage.css`, `InlineProcessNotice.css` | Kein zusätzliches Paket-CSS. |
| Mobile Finished Brew | importiert erneut `MobileProductionView.css` | Die vorhandene Datei `MobileActiveFinishedBrewView.css` wird **nicht** importiert | Kein Paket-CSS. |

`components/Controlls/Gant/GantChart.tsx` importiert `gantt-task-react/dist/index.css`, hat aber im aktuellen `src`-Graphen keinen Aufrufer. Das Paket-CSS ist daher weder eager noch Teil einer der oben genannten aktuell erreichbaren Views. Sollte der Gantt-Chart wieder verwendet werden, wird es mit dessen aufrufendem Chunk geladen.

## 3. Aktuell globale/eager CSS-Dateien

### Garantiert eager

1. `colors.css`: globale Custom Properties, Themevarianten und gemeinsame `brauhaus-*` Controls.
2. `bootstrap/dist/css/bootstrap.min.css`: globale Reset-, Element- und Utility-Regeln.
3. `simplebar/dist/simplebar.min.css`: globale `.simplebar-*` Infrastruktur.
4. `index.css`: `html/body/#root`, Body-Hintergrund, Font und Overflow sowie `.MainContainer`.
5. `App.css`: Shell-Geometrie und zugleich Main-spezifische `.content`, `.CustomTable`, `.Details`.
6. `Header.css` und `StatusDisplay.css`: statisch über den eager `Header`.

Abhängig davon, welche Header-/Fehler-Unterkomponenten der Bundler im statischen Graphen erreicht, können gemeinsame Komponentenstyles ebenfalls im Initialgraphen liegen; fachlich sollen deren Styles bei der jeweiligen Shared Component verbleiben.

### Nur lazy bzw. erst bei Routen-/Mobile-Graph

Alle unter Abschnitt 2 genannten lokalen Route- und Unterkomponenten-Dateien sowie Font Awesome in Production. `Main.css` ist ein Sonderfall: Die Datei ist aktuell **nirgendwo importiert** und wird folglich weder eager noch lazy geladen.

## 4. Globale Selektoren in route-spezifischem CSS

### GLOBAL BEABSICHTIGT

| Datei | Selektor | Bewertung / Ownership |
|---|---|---|
| `colors.css` | `:root`, Theme-Root und `brauhaus-*` | Beabsichtigt global; **THEME/GLOBAL**. |
| `index.css` | `html`, `body`, `#root`, `.MainContainer` | Beabsichtigt global; **GLOBAL/App Shell**. `body { overflow:hidden }` ist eine bewusste Shell-Annahme. |
| `App.css` | `:root`, `.AppContainer`, `.AppHeader`, `.Index`, `.IndexContent` | Beabsichtigt Shell-global; **GLOBAL/App Shell**. |
| SimpleBar-Paket | `.simplebar-*` | Beabsichtigtes globales Paket-CSS; **GLOBAL vendor**. |
| Bootstrap | Element-/Reset-/Utility-Selektoren | Beabsichtigtes globales Paket-CSS; **GLOBAL vendor**, muss vor App-Regeln bleiben. |

### EIGENTLICH ROUTE-SPEZIFISCH oder SHARED COMPONENT

| Datei | Global/generisch wirkender Selektor | Bewertung |
|---|---|---|
| `App.css` | `.content`, `.CustomTable`, `.Details` | Eigentlich **ROUTE Main**. Sie sind nur deshalb beim Start verfügbar, weil sie in eager Shell-CSS liegen. Das ist die inverse Lazy-Abhängigkeit und erschwert Ownership. |
| `Main.css` | `.CustomTable`, `.ingredients-wrapper`, `.DetailsContainer`, alle `.simplebar-*` | Main/Ingredients bzw. globale Vendor-Anpassung gemischt. Datei ist unimportiert. `.simplebar-*` wären global und nach Import route-order-abhängig; Ownership **SHARED COMPONENT/THEME**, mit einem lokalen Wrapper scopen. |
| `Production.css` | `.left`, `.list`, `.meters`, `.settings`, `.info` | Eigentlich **ROUTE Production**, aber ungescopt. Höchstes Cascade-Risiko. `.containerProduction *` ist dagegen ausreichend gerahmt. |
| `ModalDialog.css` | `.confirm`, `.error`, `.info` | Eigentlich **SHARED COMPONENT ModalDialog**, aber ungescopt. Kollidiert konkret mit Production. |
| `Details.css` | `.header`, `.header-text` | Eigentlich **SHARED/Main Details**, aber generisch; nach Laden von Main dauerhaft aktiv. |
| `Header.css` | `.icon` | Eigentlich **SHARED Header**, aber generisch und eager. Derzeit sind die meisten Eigenschaften von `.icon` potenziell auf fremde Icons anwendbar. |
| `Table.css` | `.selected` | Eigentlich **Main Table**; generischer Statusname. |
| `FinishedBrewsTable.css` | `.filter-container`, `.filter-label`, `.finish-btn` | Eigentlich **ROUTE Finished Brews**; `.finish-btn` wird auch in Ingredients verwendet. |
| `IngredientsFormPage.css` | `.action-buttons` | Eigentlich **ROUTE Ingredients**; nicht durch `.containerIngredientsForm` gerahmt. Die Button-Unterregel ist ebenfalls global für jede gleichnamige Gruppe. |
| `BeerForm.css` | `.add-button`, `.finish-btn`, `.primary-action`, `.secondary-action` u. a. | Eigentlich **ROUTE BeerForm**. `.finish-btn` ist komplett ungescopt und kollidiert. Form-Elementregeln sind dagegen überwiegend unter `.beer-form`/`.ingredient-table` gerahmt. |
| Mobile CSS | `.mobile-*` und Nachfahr-Elemente | Fachlich **ROUTE Mobile** und durch Präfix weitgehend sicher. Fonts sind auf Wrapper begrenzt. |

Es existieren **keine ungescopten** `input`, `button`, `select`, `textarea`, `table`, `th`, `td`, `h1/h2/h3`, `p` oder `*` Regeln in den lokalen Lazy-Stylesheets. Die gefundenen Elementselektoren sind Nachfahren eines Route-/Komponentenwrappers. Ausnahme im weiteren Sinne sind die oben genannten generischen Klassen. Bootstrap enthält naturgemäß globale Elementregeln, wird aber eager und deterministisch geladen.

## 5. SimpleBar-Risiken

- `simplebar/dist/simplebar.min.css` wird genau einmal am Entry Point importiert und ist damit vor **jedem** SimpleBar-Einsatz vorhanden: `Index` selbst nutzt SimpleBar bereits eager um Main/Dashboard und Finished Brews; Main, Finished Brews, Ingredients und BrewingCalculations nutzen es ebenfalls.
- Vor `8794766` kam SimpleBar-CSS dreifach zufällig aus damals eager importierten Views (Main, Finished Brews, Calculations; einmal über den alternativen Pfad `simplebar-react/dist/...`). Nach Lazy Loading fehlte es am Initialeinsatz in `Index`. Die Entry-Point-Korrektur beseitigt diesen P0.
- `Main.css` enthält zusätzliche, **globale** `.simplebar-content(-wrapper)`, `.simplebar-scrollbar` und `.simplebar-track` Anpassungen. Weil die Datei gar nicht importiert ist, sind sie aktuell tot. Ein naives Wiederimportieren in Main würde sie nach dem ersten Main-Besuch global auf Finished Brews, Ingredients, Dashboard und Calculations anwenden: ein neues P1.
- Empfehlung: Paket-CSS weiterhin **GLOBAL/eager** halten. Produktanpassungen entweder bewusst im globalen Theme dokumentieren oder unter einem komponenteneigenen Wrapper scopen; nicht durch eine Route bereitstellen.

## 6. MUI-Risiken

- BrewingCalculations überschreibt `.MuiPaper-root`, `.MuiTypography-root`, `.MuiInputBase-root`, `.MuiFormLabel-root`, `.MuiBox-root`, `.MuiButton-root` usw. **nur als Nachfahren von `.BrewingCalculations-outer`**. Diese Regeln können deshalb nach dem Verlassen der Route nicht Settings, Ingredients oder Finished Brews treffen. Bewertung: derzeit sicher, **ROUTE**.
- Ingredients rahmt `.MuiTableContainer-root`, `.MuiTableCell-root`, `.MuiTableRow-root` und Accordion-Regeln mit `.containerIngredientsForm`. Ebenfalls route-lokal.
- Details rahmt `.MuiTableCell-*` mit `.wortBoiling-table`; Finished Brews nutzt `.MuiPaper-root.FinishedBrewsTable`. Ebenfalls lokal.
- Es wurde keine nackte lokale `.MuiPaper-root`, `.MuiTypography-root`, `.MuiInputBase-root`, `.MuiButton-root`, `.MuiBox-root` oder `.MuiTableCell-root` Regel gefunden.
- Restrisiko: MUI v4 und v5 sind gleichzeitig installiert; generierte Runtime-Styles können eine andere Injektionsreihenfolge haben als extrahiertes CSS. Die lokalen Regeln mit `!important` und Route-Wrappers sind jedoch robust gegen Cross-Route-Leaks. Das ist allgemeine P2-Schuld, kein durch den untersuchten Commit neu nachgewiesener Fehler.

## 7. Schriftart-Risiken

### Global gewünscht

- Der globale System-Font liegt jetzt in eager `index.css` auf `body` und ist unabhängig von Routes.
- Bootstrap wird davor importiert; die spätere Body-Regel aus `index.css` gewinnt deterministisch.

### Seitenbezogen

- `.wortBoiling-header-text` nutzt Arial/Helvetica nur im Detailkopf.
- `.mobile-production-container` und `.mobile-calc-container` nutzen Arial nur innerhalb der Mobile-Wrapper.
- `.version-value` nutzt Monospace bewusst nur für die Versionskennung.
- Font Awesome lädt in Production globale `@font-face`- und `.fa*` Regeln. Diese bleiben nach dem ersten Production-Besuch aktiv, ändern aber nicht den Body-Font; ein fremdes Element mit generischer `fa`/`fas`-Klasse wäre betroffen.

Damit ist ein Body-Fontwechsel durch Navigation aktuell nicht mehr nachweisbar. Vor `8794766` war der globale Font nicht im Entry Graph; dieser bereits sichtbare P0 ist behoben.

## 8. Background-/Root-Risiken

- `body` hat eager `background: var(--color-app-bg)`; `.AppContainer` ebenfalls. Weiße Browserränder bei fehlendem Route-CSS werden dadurch grundsätzlich vermieden.
- `html/body/#root` haben eager 100 % Breite/Höhe und null Margin/Padding. Damit ist die Shell unabhängig von einer View.
- `.IndexContent` hat keinen eigenen Hintergrund, erbt aber optisch den App-Container-Hintergrund. Transparente Route-Wrapper (Settings/Version/Ingredients) zeigen daher App-Dunkelgrau, während deren Karten teils bewusst weiß sind.
- Während des Desktop-Suspense wird die gesamte `.IndexContent`-Struktur durch einen nackten Textknoten-Wrapper ersetzt. Der Body/App-Hintergrund bleibt dunkel, aber der Fallback hat weder explizite Farbe noch Flächenfüllung. Je nach Bootstrap/Body-Farbvererbung kann der Text zu dunkel bzw. uneinheitlich sein. Ein weißer Vollflächen-Flash ist durch die aktuelle Shell unwahrscheinlich; ein leer/dunkel wirkender Flash ist möglich.

## 9. Layout-/Overflow-Risiken

- Die Shell erzwingt `100dvh` und `overflow:hidden`; Scrollen muss jede Route selbst bereitstellen. Das ist jetzt eager und im Controller-Modus vorhanden.
- Main rechnet zusätzlich imperativ mit `window.innerHeight * 0.89`, während die Shell eine Header-CSS-Variable und `calc(100dvh - header)` nutzt. Das ist keine Cascade-Reihenfolge, kann aber beim Fallback/ersten Mount springen und bei zweizeiligem Header abweichen.
- `BrewingCalculations-outer` ist `position:fixed`, `width:100vw`, `height:150vh`, `min-height:100vh`, rundum verankert und hat `margin-top:80px`. Wegen des Route-Wrappers leakt das nicht auf andere Views, ist intern aber widersprüchlich und kann Headerüberdeckung, horizontale Breite inklusive Scrollbar und abgeschnittene Inhalte verursachen (P2).
- Production ist vollständig höhengebunden und innen `overflow:hidden`; bei <=1280 px schaltet nur `.containerProduction` auf `overflow:auto`. Diese Annahme ist controllerkritisch, aber alle notwendigen Regeln liegen im Production-Chunk selbst.
- Ingredients setzt `height:auto !important` und `overflow:visible !important`, während `.IndexContent` hidden ist. Der umgebende `.ingredients-wrapper` ist in `Main.css` definiert, das nicht geladen wird. Dadurch kann Ingredients heute abgeschnitten sein oder auf einen inneren SimpleBar angewiesen sein. Das ist kein route-order leak (Main-Besuch lädt `Main.css` ebenfalls nicht), aber ein aktuelles Ownership-/Layout-Risiko.
- Mobile nutzt einen eigenen `100dvh`-Container mit innerem `overflow-y:auto` und ist damit nicht von Desktop-Route-CSS abhängig. `MobileActiveFinishedBrewView.css` mit `min-height:100vh` ist unbenutzt; die View erhält stattdessen das Mobile-Production-Stylesheet.

## 10. Suspense-/FOUC-Risiken

Für `.view-loading` existiert **keine Styledefinition**.

- Desktop: Der Suspense liegt außerhalb `.IndexContent`; beim Suspendieren verschwindet somit der gesamte Höhen-/Overflow-Wrapper. Der Fallback besitzt keine `height`, `min-height`, `width`, Flex-Ausrichtung, Farbe oder Background. Folge: Layoutsprung zwischen einer Textzeile und der Vollansicht, vor allem bei langsamen Chunks.
- Mobile: `.AppContainer` bleibt bestehen, aber auch hier füllt der Fallback die Fläche nicht aus.
- CRA extrahiert das CSS eines dynamischen Imports zusammen mit dessen Chunkgraphen; React rendert die View erst nach Auflösung des Imports. Ein klassischer langer FOUC **innerhalb** der View ist daher weniger wahrscheinlich als der ungestylte Fallback. Netz-/Cache-Reihenfolge und runtime injizierte MUI-Styles können dennoch einen kurzen Paint-Unterschied erzeugen.
- Nach einem ersten Routebesuch bleibt deren CSS im Dokument. Deshalb sind Kaltstart-Fallback und spätere Navigation nicht zwingend visuell identisch.

Ownership-Empfehlung: `.view-loading` in **GLOBAL/App Shell** definieren, weil beide Suspense-Grenzen es benutzen; noch nicht in diesem Analysetask umsetzen.

## 11. Controller-spezifische Risiken

Controller-Normalstart ist App Shell → Header/Index → Production.

- Garantiert vorhanden: Farben, Bootstrap, SimpleBar, Root/Body/Font, App-Shell und Header.
- Mit Production garantiert nachgeladen: Production, WaterControl, Flame, QuantityPicker, ProcessList, Timeline, Notice, Dialog und Font Awesome. Production benötigt damit keine Styles aus Recipe Editor, Ingredients, Calculations oder Dashboard.
- Der frühere versteckte Bedarf an Bootstrap/Root-Regeln wurde durch den eager Entry-Import beseitigt.
- Das verbleibende konkrete Controller-Risiko ist umgekehrt: Sobald Production geladen ist, beeinflusst dessen `.info` jeden danach geöffneten gemeinsamen Info-Dialog. Da Modaldialoge gerade im Produktionsablauf verwendet werden, ist das praktisch relevant.
- Controller darf verbotene Desktop-Views nicht laden; nach aktuellem Importgraph gibt es keinen Style, den Production nur von diesen Views erhält.

## 12. CSS-Kollisionen

| Datei A | Datei B | Selektor | Mögliche Auswirkung | Load-Reihenfolge relevant? |
|---|---|---|---|---|
| `ModalDialog.css` | `Production.css` | `.info` | Production setzt Dialogelement zusätzlich auf Grid-Area, Flex, 100 % Breite, Padding, Radius und `overflow:hidden`; Background von Production kann den Dialogtyp-Hintergrund überschreiben. | **Ja, konkret P1**; gleiche Spezifität, Production wird lazy spät angehängt. |
| `App.css` | `Main.css` | `.CustomTable` | App gibt `flex:70%; margin:10px`, Main gibt später `flex:1; overflow:auto; padding/height`. | Wäre **ja**, aber `Main.css` ist aktuell unimportiert. Bei Wiederimport entsteht Reihenfolgeabhängigkeit. |
| `FinishedBrewsTable.css` | `BeerForm.css` | `.finish-btn` | Finished Brews gibt Schriftgröße, Padding, Border, Farbe; BeerForm gibt zusätzlich Hintergrund und min-height. Ein Besuch in der jeweils anderen Reihenfolge kann gemeinsame Deklarationen überschreiben. | **Ja, P1/P2**; beide lazy und gleiche Spezifität. Recipe Editor verwendet derzeit hauptsächlich `primary-action`; die Klasse bleibt aber im CSS/API vorhanden. |
| `FinishedBrewsTable.css` | `IngredientsFormPage.css` | `.finish-btn` (Nutzung in beiden) | Finished-Brews-Basisregel ist ungescopt und kann Ingredients-Buttons Farbe, Padding und Font geben; Ingredients' stärkere `.containerIngredientsForm .finish-btn` gewinnt nur für dort erneut gesetzte Eigenschaften. | **Ja, P1** für nicht erneut gesetzte Properties. |
| `FinishedBrewsTable.css` | `IngredientsFormPage.css` | `.filter-container` | Ingredients rahmt seine Variante mit `.containerIngredientsForm`, daher gewinnt sie im Ingredients-Baum; die globale Finished-Regel kann nicht erneut gesetzte Properties (z. B. `align-items`) beitragen. | Ja, aber wegen Spezifität derzeit **P2**. |
| `Header.css` | potenzielle andere Views | `.icon` | Generische Icon-Klasse kann Größe/Farbe/Abstände fremder Komponenten verändern. | Header-CSS ist eager; kein Lazy-Reihenfolgeeffekt, aber P2-Kollision. |
| `Details.css` | potenzielle andere Views | `.header` | Sticky, 57 px hoher Akzentkopf kann fremde `.header`-Elemente treffen, sobald Main geladen wurde. | **Ja, potenziell P2**; aktuell wurde außerhalb Details kein exakt gleichnamiger DOM-Klassenfund nachgewiesen. |

Interne Mehrfachdefinitionen innerhalb derselben Datei (Media Queries, Hover-/State-Regeln) wurden nicht als Cross-Route-Kollision gewertet.

## 13. Route-order-abhängige Styles

### Erwartete Ergebnisse der geforderten Sequenzen

| Sequenz | Main identisch? | Begründung |
|---|---|---|
| Fresh → Main vs. Calculations → Main | **Ja, nach statischer Cascade-Analyse** | Alle Calculations-/MUI-Regeln sind unter `.BrewingCalculations-outer`. |
| Fresh → Main vs. Ingredients → Main | **Ja** | Ingredients-/MUI-Regeln sind weitgehend unter `.containerIngredientsForm`; `.action-buttons`/`.finish-btn` matchen Main nicht. |
| Fresh → Main vs. Settings → Main | **Ja** | Settings nutzt `settings-*`; Production `.settings` ist nicht `settings-page`. |
| Fresh → Main vs. Dashboard → Main | **Ja** | Dashboard nutzt konsequent `dashboard-*`. |
| Fresh → Main vs. Recipe Editor → Main | **Ja, aktuell** | BeerForm-Regeln sind überwiegend präfixiert; generische Actions matchen Main nicht. |
| Main → Production / Production → Main | **Main derzeit ja** | Production generische Klassen kommen in Main nicht vor. Gemeinsame `.info`-Dialoge sind aber nach Production **nicht** identisch. |
| Finished Brews ↔ Ingredients | **Nein, potenziell sichtbar** | `.finish-btn`-Basisdeklarationen bleiben aus Finished Brews aktiv und werden in Ingredients verwendet. |
| Info-Dialog vor/nach Production | **Nein, konkret** | Direkte `.info`-Kollision. |

Diese Bewertung ist eine statische Import-/Cascade-Prüfung. Pixelgenaue visuelle Regressionstests existieren im Repository nicht; Backendabhängigkeit, fehlende Browser-Automation und nicht installierte `node_modules` verhindern in diesem reinen Analysetask eine belastbare Screenshot-Differenzmessung bzw. einen lokalen Production-Build. Die kritischen Selektorkollisionen sind dennoch direkt aus CSS und DOM-Klassen belegbar.

## 14. Vorher eager, jetzt lazy geladene CSS-Dateien

Unmittelbar vor `8fbc064` importierte `containers/index.tsx` alle Desktop-Views statisch. Dadurch lagen deren direkten und statisch transitiven Styles im Initialgraphen:

- Main-Untergraph: `Table.css`, `Details.css` sowie damals der SimpleBar-Paketimport in Main/Details. `Main.css` war schon damals nicht importiert.
- Production-Untergraph: `Production.css`, Font Awesome, WaterControl, Flame, QuantityPicker, ProcessList, Timeline, Notice und Dialogstyles; Bootstrap wurde damals aus Production importiert.
- BeerForm: `BeerForm.css`, ModalDialog.
- Finished Brews: `FinishedBrewsTable.css`, Panel, BrewProcessChart und SimpleBar.
- BrewingCalculations: `BrewingCalculations.css` und SimpleBar.
- Ingredients: `IngredientsFormPage.css`.
- Settings: `SettingsPage.css`.
- Version: `VersionPage.css`.
- Dashboard: `DashboardPage.css`.
- Mobile Production war vor dem Commit ebenfalls statisch in `App.tsx`, einschließlich Mobile Calculations, Settings und Notice CSS; Mobile Finished Brew blieb bereits verschachtelt lazy.

Nach `8fbc064` wurden diese Graphen erst beim jeweiligen Lazy-Import verfügbar. Genau deshalb fehlten Bootstrap, SimpleBar und die alten globalen Root-Regeln beim Start. Commit `8794766` verschob/duplizierte die fachlich globalen Abhängigkeiten an `index.tsx` und stellt sie heute eager bereit. Wichtig: Lazy-CSS wird nach dem ersten Laden nicht entladen, sodass die vor-Lazy statisch deterministische Reihenfolge nun durch die Besuchsreihenfolge ersetzt ist.

## 15. Priorisierte Fundliste P0–P3

### P0 – akuter globaler Bruch

- **Keine noch offene P0 aus dem untersuchten aktuellen Stand statisch nachgewiesen.** Der bereits beobachtete Root-/Margin-/Font-/SimpleBar-/Bootstrap-Startbruch ist durch `8794766` behoben.

### P1 – hohe Wahrscheinlichkeit / konkrete Route-Order-Abhängigkeit

1. `Production.css .info` gegen `ModalDialog.css .info`: konkreter, in Production praktisch erreichbarer Cross-Component-Leak.
2. `FinishedBrewsTable.css .finish-btn` gegen Ingredients: Properties werden nach Besuch von Finished Brews dauerhaft in Ingredients ergänzt; Reihenfolge und Cachezustand sind relevant.
3. Ungestylter `.view-loading`: sichtbarer Layoutsprung und uneinheitlicher Lade-Paint auf kalten Lazy-Navigationen.
4. Ein künftiges einfaches Wiederimportieren von `Main.css` würde globale SimpleBar-Regeln erst nach Main laden und alle späteren SimpleBars verändern. Daher vor Wiederaktivierung zwingend aufteilen/scopen.

### P2 – technische CSS-Schuld / potenzielles Problem

1. Generische Production-Klassen `.left`, `.list`, `.meters`, `.settings`, `.info` statt Route-Scoping.
2. Main-Styles liegen teils in eager `App.css`, während `Main.css` tot ist; `.ingredients-wrapper` fehlt dadurch.
3. Generische `.header`, `.icon`, `.selected`, `.action-buttons`, `.filter-container`, `.confirm/.error/.info` ohne Komponentenrahmen.
4. Fixed/150vh/100vw-Geometrie in Calculations und gemischte 100vh/imperative Main-Höhenannahmen.
5. Font Awesome ist route-lazy, aber global in seiner Selektorwirkung; bei gemeinsamer Icon-Nutzung besser klare Ownership prüfen.
6. Gleichzeitige MUI-v4/v5-Runtime-Style-Systeme; derzeit durch Route-Scoping entschärft.
7. Mobile Finished Brew besitzt eine eigene, nicht importierte CSS-Datei und importiert stattdessen das Parent-Stylesheet; Ownership ist unklar.

### P3 – unkritische Stilinkonsistenz

1. Lokale Fontunterschiede (Systemfont, Arial, Monospace) sind gescopt und wirken beabsichtigt, sollten aber im Designinventar dokumentiert werden.
2. Transparente Page-Wrapper neben weißen Settings-/Version-Karten können optisch uneinheitlich sein, ohne route-order-abhängig zu sein.
3. Ungenutztes Gantt-Paket-CSS und tote/duplizierte Imports erhöhen künftige Fehlbedienungsgefahr, verursachen aktuell aber keinen sichtbaren Effekt.

## 16. Konkrete empfohlene Folgetasks (noch nicht umsetzen)

1. **P1 / ROUTE + SHARED COMPONENT:** Production-Klassen unter `.containerProduction` bzw. BEM-Namen scopen; ModalDialog-Typklassen unter einem Dialog-Root scopen. Zuerst einen Regressionstest für Info-Dialog vor/nach Production schreiben.
2. **P1 / ROUTE:** `.finish-btn`, `.filter-container` und weitere Finished-Brews-Helfer unter `.FinishedBrewsTable` scopen; Ingredients-Buttons ausschließlich unter `.containerIngredientsForm` definieren.
3. **P1 / GLOBAL App Shell:** `.view-loading` mit voller verfügbarer Breite/Höhe, App-Hintergrund, Textfarbe und stabiler Zentrierung definieren. Kaltstart mit gedrosseltem Netzwerk visuell testen.
4. **P1/P2 / Ownership:** `Main.css` vor jeder Wiederverwendung in Main-spezifische Layoutregeln und bewusst globale bzw. komponentengescope SimpleBar-Theme-Regeln zerlegen. Nicht unverändert importieren.
5. **P2 / ROUTE:** Main-spezifische `.content/.CustomTable/.Details` aus der Shell fachlich der Main-Route bzw. gemeinsamen Main-Komponenten zuordnen; erst danach Import-/Chunkstrategie ändern.
6. **P2 / Tests:** Einen Browser-Regressionssatz mit berechneten Styles oder Screenshots einführen: Fresh→Main gegen Calculations/Ingredients/Settings/Dashboard/RecipeEditor/Production→Main sowie Finished→Ingredients und Info-Dialog vor/nach Production. Controller separat App Shell→Production testen.
7. **P2 / THEME:** Route-lokale MUI-Overrides weiterhin mit Route-Root scopen; mittelfristig gemeinsame Farben/Typografie in ein zentrales MUI-Theme statt in globale `.Mui*`-Klassen legen.
8. **P2 / SHARED COMPONENT:** Font Awesome entweder bewusst global/eager besitzen lassen oder ausschließlich die verwendeten React-Icons ohne globales Komplettpaket-CSS nutzen; vorher Bundle-/Icon-Kompatibilität prüfen.
9. **P2 / Mobile:** Entscheiden, ob `MobileActiveFinishedBrewView.css` fachlich gebraucht wird; Parent-CSS-Import und tote Datei nicht ohne visuellen Vergleich bereinigen.
10. **P3 / Dokumentation:** Eine kurze CSS-Ownership-Regel festhalten: globale Resets/Vendor/Theme nur Entry Point, Shared-Styles beim Component, Route-CSS immer unter eindeutigem Route-Root.

## Verwendete Prüfmethodik

- Volltextinventar aller `React.lazy`- und CSS-Imports unter `src`.
- Statisches Nachverfolgen direkter und transitiver Komponentenimports.
- Systematische Selektorsuche in allen lokalen CSS-Dateien nach Element-, Root-, generischen und `.Mui*`-Selektoren sowie Mehrfachdefinitionen.
- Suche nach Font-, Background-, Viewport-, Position- und Overflow-Deklarationen.
- Git-Vergleich `8fbc064^..8fbc064` sowie Historie der nachfolgenden Korrektur `8794766`.
- Ein Produktionsbuild wurde versucht, konnte ohne installierte `node_modules`/`react-scripts` jedoch nicht ausgeführt werden; Chunkzuordnung ist daher aus dem statischen Importgraph abgeleitet und sollte in einem Folgecheck mit installierten Abhängigkeiten gegen das Buildmanifest verifiziert werden.

Es wurden entsprechend der Aufgabenabgrenzung keine Anwendungs-, CSS- oder Designregeln verändert; dieses Dokument ist das einzige Ergebnis.
