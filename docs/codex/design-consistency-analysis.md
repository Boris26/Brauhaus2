# Design-Konsistenzanalyse der Brauhaus-UI

Stand: 2026-07-18. Umfang: statische Analyse der React-/CSS-Struktur ohne Produktivcodeänderung. Es wurden keine Businesslogik, Datenmodelle, API-Kommunikation, Redux-Actions, Reducer oder Epics verändert.

## 1. Technische und visuelle Struktur

Die App ist eine CRA-/React-TypeScript-UI mit Redux-View-State statt URL-Routing. `App` entscheidet mobil/desktop über `window.innerWidth < 768`; Desktop rendert `Header` und `Index`, Mobile rendert direkt `MobileProductionView`. `Index` schaltet Hauptseiten per `Views` enum und nutzt SimpleBar nur für einzelne Views, wodurch Scrollverhalten je Seite unterschiedlich ist.

| Bereich/Seite | Hauptkomponente | Unterkomponenten | CSS | UI-Basis | Visuelle Merkmale |
|---|---|---|---|---|---|
| Desktop-Shell/Header | `App`, `Header` | `StatusDisplay`, Icon-Navigation, Uhrzeit | `App.css`, `Header.css`, `StatusDisplay.css` | eigene CSS + Bilder/Button | Fixierter Akzent-Header, iconartige Nav-Buttons, Statuspanel im Header |
| Hauptansicht/Rezeptübersicht | `Main` | `BeerRecipes/Table`, `Details` | `App.css`, `Main.css`, `Table.css`, `Details.css` | MUI Table + SimpleBar | 70/30 Split, dunkle Tabelle, sticky Detailheader |
| Produktion | `Production` | `ProcessList`, `WaterControl`, `Gauge`, `Flame`, `Timeline`, Modal | `Production.css`, `ProcessList.css`, Control-CSS | eigene Grid-/Panel-CSS + MUI-Teile | dashboardartiges Vier-Spalten-Grid, viele dunkle Panels, Status-/Maschinendarstellung |
| Bier erstellen/bearbeiten | `BeerForm` | Accordions, Ingredient-Tabellen, Modal | `BeerForm.css` | eigene CSS + Modal | modernste interne Struktur: Panel, Toolbar, Accordions, klare Formularraster |
| Zutatenverwaltung | `IngredientsFormPage` | MUI Accordion/Table, Create*-Forms | `IngredientsFormPage.css` + MUI Overrides | MUI Table/Accordion | dunkle MUI-Tabellen mit Akzentheadern, kompakte Iconbuttons |
| Fertige Sude | `FinishedBrewsTable` | `FinishedBrewDetails`, `Panel`, Chart | `FinishedBrewsTable.css`, `BrewProcessChart.css`, `Panel.css` | MUI Table + eigenes Panel | dunkle Tabelle ähnlich Rezepttabelle, aber viele lokale Button-/Filterregeln |
| Brauberechnungen Desktop | `BrewingCalculations` | MUI Paper/TextField/Grid/Typography | `BrewingCalculations.css` | MUI | MUI-Karten, globale MUI-Overrides, fixed full-viewport scroll wrapper |
| Einstellungen | `SettingsPage` | Settings cards/chips/selects | `SettingsPage.css` | eigene CSS | helle Karten auf dunklem Shell-Hintergrund, modernes Card-Layout, anderer Farbraum |
| Version/Info | `VersionPage` | Version card | `VersionPage.css` | eigene CSS | wie Einstellungen, kompakte helle Karte |
| Mobile Produktion | `MobileProductionView` | Mobile Tabs, Status, mobile calculators, active brew | `MobileProductionView.css`, mobile Unterseiten-CSS | eigene CSS | eigenständige helle amber/goldene Mobile-Sprache, tabbasierte Navigation |
| Dialoge/Bestätigung | `ModalDialog` | MUI Dialog | `ModalDialog.css` | MUI Dialog/Button | Dialogtitel-Farben grün/rot/orange über Klassen, Inhalt mit Inline-Größe |
| Freies Detail-Panel | `Panel` | Drag/resize Panel | `Panel.css` | MUI IconButton + eigene CSS | dunkles schwebendes Panel mit Akzentheader, Schatten und Resize-Griff |

## 2. Seitenaufbau und Layout-Konsistenz

Die Seiten beginnen technisch nach dem Desktop-Header durch `.Index { margin-top: var(--desktop-header-height) }`. Innerhalb dieses Bereichs gibt es aber kein einheitliches Page-Layout:

- Hauptansicht verwendet `.content` als Split-Layout mit `CustomTable` und `Details`, beide mit `10px` Margin.
- Bierformular nutzt `containerBeerForm` mit `10px` Margin, Card-Panel, Toolbar und Accordions.
- Produktion nutzt ein vollständig eigenes Grid mit `1rem` Padding/Gaps und dashboardartiger Segmentierung.
- Einstellungen und Version nutzen `1.5rem 2rem` Padding, helle Karten und keine dunklen Abschnittspanels.
- BrewingCalculations setzt einen fixed Full-Viewport-Wrapper mit `margin-top: 80px`, `height: 150vh` und globalem `body/html/#root overflow: hidden`; das ist die stärkste Layout-Abweichung.
- Zutaten und fertige Sude nutzen überwiegend Tabellenansichten, aber unterschiedliche Wrapper, Filter und Buttonbereiche.

Antwort auf die Leitfragen: Vergleichbare Seiten beginnen nur ungefähr gleich, weil die Shell einheitlich ist. Außenabstände variieren zwischen `10px`, `1rem`, `1.5rem 2rem`, `18px 8px`, `0` und festen `80px`. Seitentitel sind nicht einheitlich; manche Seiten haben Panelheader, manche H2/H3, manche keinen klaren Seitentitel. Hauptaktionen sind im Bierformular unten rechts/als Aktionsleiste, in Tabellen inline, in Settings unten im Formularbereich und in Produktion kontextuell in Panels.

## 3. Überschriftenstile

Es existieren mindestens 10 visuell relevante Überschriftenvarianten:

1. Desktop-App-/Header-Kontext: globales `h1` in `Header.css`, `1.25rem`, bold, schwarz.
2. Header-Icon-Navigation ohne Text; Zustand über Icon-Box, nicht Überschrift.
3. Details-Header: `.header` 57px hoch, Akzentfläche, `.header-text` 20px schwarz.
4. Bierformular-Panelheader: Akzentfläche, weißer Text, `font-weight: 700`, Padding `12px 16px`.
5. Bierformular-Accordionheader: Akzentfläche, schwarzer Text, min-height 48px, bold.
6. Produktionsseitentitel: `.HeaderText`, `2rem`, weiß/hell, links eingerückt.
7. ProcessList-Bereichstitel: `1.18rem`, Akzentfarbe, letter-spacing.
8. Settings/Version: Eyebrow `0.75rem` uppercase orange-braun, H2 `1.5rem`, dunkler Text auf heller Karte.
9. BrewingCalculations: MUI `Typography variant="h6"` plus CSS-Overrides, Akzent für subtitle2.
10. Mobile: H2 `2rem`, goldbraun, große vertikale Margins; mobile Card-Titel `1.15em` goldbraun.

Vereinheitlichbar sind insbesondere Seitentitel, Paneltitel, Bereichstitel und Accordionheader. Der beste bestehende Standard für Desktop-Formularseiten ist das Bierformular: klarer Panelheader, danach Toolbar und Accordion-Struktur. Für kompakte Listen eignet sich der Rezept-/FinishedBrews-Tabellenheader als Tabellenstandard, aber nicht als Seitentitelstandard.

## 4. Typografie-Inventar

| Verwendung | Schriftgröße | Gewicht | Zeilenhöhe | Farbe | Vorkommen |
|---|---:|---:|---:|---|---|
| Shell/Header h1-Kontext | 1.25rem | bold | normal/nicht gesetzt | black | Header CSS globales `h1` |
| Produktionsseitentitel | 2rem | bold | normal | `--color-light-text` | Produktion |
| Settings/Version H2 | 1.5rem | browser/default/bold | normal | `--color-black` | Einstellungen, Version |
| Bierformular Toolbar-Titel | 1.15rem | 700 | normal | `--color-white` | Bierformular |
| Accordion-Titel | inherit/ca. 1rem | 700 | normal | `--color-black` | Bierformular |
| ProcessList-Titel | 1.18rem | bold | normal | `--color-accent` | Produktion |
| Tabellenkopf Rezept/Fertige Sude | 1rem | bold | normal | schwarz bzw. nicht explizit | Rezepttabelle/Fertige Sude |
| Ingredient-Tabelle im Bierformular | 0.95rem | th bold | normal | weiß | Bierformular |
| Formularlabel Bierformular | inherit/ca. 1rem | 600 | normal | weiß | Bierformular |
| Detail-Batch-Label | 14px | 500 | normal | weiß | Details |
| Buttontexte klein | 0.75rem | bold | normal | variiert | Rezepttabelle, FinishedBrews select-btn |
| Buttontexte normal | 1rem | 700/bold | normal | weiß/schwarz/braun | Bierformular, Settings, mobile |
| Mobile Werte | 1.35em | bold | normal | `--color-teal-strong` | Mobile Produktion |
| Hilfetext/Descriptions | 0.9rem oder normal | normal | normal | grau | Settings |
| Fehlermeldung Zutaten | 0.8rem | normal | normal | `#d32f2f` | Zutatenverwaltung |

Bewertung: Es gibt keine zentrale Typografie-Skala. `1rem` ist häufig, daneben 0.75rem, 0.8rem, 0.92rem, 0.95rem, 1.1rem, 1.15rem, 1.18rem, 1.25em, 1.35em, 1.5rem, 2rem, 14px und 20px. Fachlich begründet sind größere Produktions-/Mobile-Werte für Kiosk-Lesbarkeit. Unbeabsichtigt wirkt die Mischung von px, rem und em für vergleichbare Labels und Titel.

## 5. Farbinventar und Farbverwendung

| Farbe | Format | Verwendung | Dateien | Ähnliche Farben | Empfehlung |
|---|---|---|---|---|---|
| `--color-accent` | `#ffa726` | Header, Accordion, Tabellenkopf, Fokus | `colors.css`, viele CSS | `#ff9800`, `#fb8c00`, `#ffa733` | Als primärer Brauhaus-Akzent beibehalten |
| `--color-orange-main` | `#ff9800` | Header-Icons, Mobile/Settings Buttongradient | `colors.css`, Header/Settings/Mobile | `--color-accent`, `--color-orange-alt` | Rollen klären: Primary vs. Nav-Gradient |
| `--color-orange-alt/deep/strong/dark` | mehrere | Hover/Active/Gradient/Border | Header, Settings | andere Orangetöne | Auf Hover/Active/Border-Tokens mappen |
| `--color-dark-bg` | `#333333` | App-Hintergrund, Text auf Inputs | global/App | `--color-surface-1`, `--color-surface-2` | Desktop-Page-Background-Token |
| `--color-brew-bg` | `#404040` | Tabellen-/Panelhintergründe | Main, BeerForm, Tables | `#393939`, `#3a3a3a`, `#4a4a4a` | Surface-Token für dunkle Cards |
| `--color-surface-1/2/deep/strong` | `#353535/#393939/#3a3a3a/#4a4a4a` | Produktions- und Tabellenflächen | Production, BeerForm | stark ähnlich | Vereinheitlichbare Surface-Stufen |
| `--color-white` | `#fff` | Text und helle Cards | fast überall | `--color-light-text #eee` | Zwischen Text-on-dark und Surface-light trennen |
| `--color-input-bg` | `#fff` | Desktop Formularinput + helle Cards indirekt | BeerForm, colors | `--color-white` | Input-bg separat behalten, helle Card optional eigener Token |
| `--color-surface-alt` | `#1976d2` | Add-Button/aktive Schritte | BeerForm/Production | Material Blue | Fachlich fraglich: blau wirkt fremd zur orange-grauen Sprache |
| Fehlerrot | `#d32f2f`, `#b71c1c`, `red`, `#e53935` | Delete, Dialog, Fehler | Modal, Table, CSS vars | mehrere | Fehler-Tokens konsolidieren |
| Erfolggrün | `#4caf50`, `#43a047`, `#2e7d32`, `green`, `#388e3c` | Status, Export/Brew Hover, aktive Sude | mehrere | mehrere | Success-Rollen trennen: Status vs. Hover |
| Mobile Amber/Gold | `#fffbe6`, `#ffe9a7`, `#b8860b` | Mobile Seiten | Mobile CSS/colors | Desktop Orange | Fachlich als Mobile/Kiosk-Thema möglich, aber visuell abweichend |
| Wasser/Heizung | `#00aaff`, `#ffe082`, rot/orange | Maschinenzustände | Controls/Production/Flame | Signalfarben | Fachlich begründet |

Kritisch ist nicht die Existenz vieler Farben allein, sondern dass gleiche Rollen unterschiedlich umgesetzt werden: Delete nutzt direkt `#b71c1c/#d32f2f`, Modal nutzt `red/green`, aktive Rezeptzeile `rgba(255,197,60,.7)`, aktive FinishedBrew-Zeile grün und aktive Produktionsschritte blau.

## 6. Abstände

Häufige Werte aus CSS: `0`, `8px`, `10px`, `12px`, `14px`, `16px`, `18px`, `20px`, `24px`/`1.5rem`, `32px`/`2rem`, `40px`, außerdem `0.25rem`, `0.45rem`, `0.5rem`, `0.7rem`, `0.75rem`, `0.8rem`, `0.9rem`, `1rem`, `1.2rem`, `1.3rem`, `1.5rem`, `2rem`.

Bewertung: Ein implizites 4/8px-Raster ist teilweise erkennbar, wird aber durch 10/14/18/20/25/30/40px und viele rem-Bruchteile inkonsistent. Fachlich begründet sind größere mobile Touch-Abstände und Produktions-Dashboard-Gaps. Historisch wirken 10px-Seitenmargins, 80px Berechnungs-Offset und verschiedene Tabellen-/Filter-Abstände.

Vorschlag ohne Codeänderung: `xs=4px`, `sm=8px`, `md=12px`, `lg=16px`, `xl=24px`, `2xl=32px`; Seitenpadding Desktop `16px` oder `24px`, kompakte Tabellenzellen `6px 8px`, normale Formulare `8px 10px`, Karten `16px`.

## 7. Rahmen, Radien und Schatten

- Radien: 4px, 5px, 6px, 7px, 8px, 10px, 12px, 14px, 24px, 999px und `1rem` kommen vor.
- Tabellen: Rezept/Fertige Sude nur obere Radien 5px; Bierformular-Tabellenwrapper 6px; Ingredients MUI-Container erzwingt 0; Settings Cards 1rem.
- Panels: eigenes `Panel` nutzt 8px + deutlichen Schatten; Produktion nutzt 10/12/14px + Schatten; Bierformular nutzt 8/10px + optionalen Accordion-Schatten.
- Inputs: Bierformular 5px, Details 6px, Zutaten 4px, Settings 0.5rem, Mobile 4/6px.

Bewertung: Kategorie B. Die Unterschiede sind wartungsrelevant und erschweren eine Designsystem-Ableitung, aber nicht jeder Radiusunterschied ist ein Fehler. Klare Kategorie-A-Fälle entstehen bei vergleichbaren Input- und Button-Radien/Höhen.

## 8. Buttons

| Buttontyp | Seiten | Klassen/Komponenten | Unterschiede | Empfohlene gemeinsame Variante |
|---|---|---|---|---|
| Primär/Speichern | Bierformular, Settings, Zutaten, FinishedBrews | `.finish-btn`, `.settings-primary`, MUI Button | 42px dunkel/transparent vs. orangener Gradient vs. 34px Iconbutton | `.btn.btn-primary` min-height 42/44px, Akzent/Orange, klarer Disabled-State |
| Sekundär/Zurücksetzen/Abbrechen | Bierformular, FinishedBrews, Zutaten | `.add-button.secondary-action`, `.cancel-btn` | Blaues Add-Design als sekundär, rote Hover-only Iconbuttons, Tabellen-Delete ähnlich | `.btn.btn-secondary` neutral dunkel/grau; `.btn.btn-danger` für destruktiv |
| Hinzufügen | Bierformular, Zutaten | `.add-button`, MUI Button/kleine Iconbuttons | Blau (`#1976d2`) im Bierformular, kompakte Tabellenzeile in Zutaten | Add als Primary oder Secondary mit Plus-Icon, nicht blau ohne Kontext |
| Löschen | Rezepttabelle, Zutaten, fertige Sude | `.cancel-btn`, `.delete-beer-button`, Emoji/Icon | rot gefüllt, transparent mit grünem Hover, rot nur Hover | `.btn-danger` einheitlich rot/transparent-danger, nicht grün für Delete-Hover |
| Navigation | Header, Mobile Tabs | `.icon`, `.mobile-tabs button` | Desktop orange 3D Icons, Mobile Verlauf gelb-rot pill/tabs | Gleiche Akzentlogik: active pressed, hover dunkler, min. 44px Touch |
| Prozess fortsetzen | Production/ProcessList | Next-Step Button/Container | absolut positioniert, eigener Kontext | Produktionsspezifisch begründet, aber Button-Tokens übernehmen |
| Importieren/Neues Bier | Bierformular | `.add-button toolbar-button` | identisch zu Add, blau statt Brauhaus-Orange | Secondary oder outline-action mit gemeinsamen Maßen |

Kategorie A: Speichern/Hinzufügen/Löschen sind fachlich vergleichbare Aktionen und sehen über Seiten ohne klaren Grund deutlich anders aus. Kategorie B: Navigation und Prozessbuttons brauchen gemeinsame Zustandsregeln, dürfen aber kontextuell anders bleiben.

## 9. Eingabefelder

- Bierformular: normale Inputs/Selects/Textareas min-height 40px, Padding `8px 10px`, Border `1px solid --color-border-mid`, Radius 5px, weißer Hintergrund.
- Bierformular-Tabelleninputs: ebenfalls min-height 40px, 0.95rem.
- Details Batch-Inputs: Padding `6px 10px`, dunkler Hintergrund, Radius 6px, Font 14px, Glow-Fokus.
- Zutatenverwaltung: `.table-edit-field` Padding `4px 8px`, dunkler transparenter Hintergrund, Radius 4px, kompakter.
- FinishedBrews Filter/Edit: dunkle Inputs, 4px Radius, `0.2rem 0.5rem`, Fokus 1.5px Accent.
- Settings: Select `0.5rem 0.75rem`, Radius 0.5rem, heller Hintergrund.
- MUI TextFields in Calculations folgen MUI-Höhen, werden nur farblich global überschrieben.
- Mobile Active Brew: Inputs `0.3rem 0.6rem`, Radius 4px, dunkler Hintergrund.

Bewertung: Kategorie A für vergleichbare Formularfelder mit unterschiedlichen Höhen/Hintergründen ohne fachlichen Grund auf Desktop-Formularseiten. Kategorie B für Tabelleninputs: Kompaktheit ist teilweise begründet, aber die Touch-Tauglichkeit im Kiosk-Kontext sollte nicht unter 40px sinken.

## 10. Tabellen

- Rezepttabelle und fertige Sude teilen eine dunkle Tabellenästhetik mit Akzent-Header, 1rem Tabellenfont und kleinen Actionbuttons. Fertige Sude dupliziert/erweitert viele Regeln.
- Bierformular-Zutatentabellen sind semantisch Bearbeitungstabellen, nutzen sticky Header, Zebra-Zeilen, 0.95rem und horizontales Scrolling; kompakter und strukturierter.
- Zutatenverwaltung nutzt MUI Table mit erzwungenem dunklem Theme und sticky Head. Die Actionspalte ist 120px; Eingaben kompakt.
- Details enthält MUI-/Detailtabellen mit eigener Headerleiste und dunklen Zellen.

Ein gemeinsamer Tabellenstil ist ableitbar: dunkle Surface, Akzent- oder Border-Strong-Header je Tabellenart, 1rem für Listen, 0.95rem für kompakte Edit-Tabellen, `8px 10px` Zellpadding, sticky Header optional, einheitliche Actionbutton-Größe. Bewusst kompakt sein dürfen Ingredient- und Inline-Edit-Tabellen; aktuell zu eng wirken 2rem/0.75rem Actionbuttons in Desktop-Tabellen und 34px Zutaten-Iconbuttons für Touch.

## 11. Header und Navigation

Desktop: Header ist fixiert und min-height `4.75rem`; Navigation und Status sind in einem Grid mit zwei Spalten. Die Icons haben 3rem × 2.5rem und wrapping. Der bekannte Fehler „Brauhaus überlappt Menüicons“ passt zu früheren/alternativen absoluten Positionierungen; im aktuellen Code ist der Titelbereich nicht mehr sichtbar, aber das Risiko bleibt, weil Headerhöhe fixiert/minimal ist, Icons wrappen können und bei `max-width: 1100px` zwei Headerzeilen entstehen, während die Shell weiterhin nur `--desktop-header-height` Abstand reserviert.

Aktiver Desktop-Navigationszustand ist über inset-border, weißen Text/Icon-Farbe und Press-Transform gut erkennbar. Icons ohne Text sind nur über `title`/alt nachvollziehbar; am Kiosk ohne Hover sind sie bedingt selbsterklärend.

Mobile: eigener Kopf-/Tabbereich mit Amber-Hintergrund, horizontal scrollenden Tabs, Gradientenbuttons und Trennlinie. Mobile und Desktop wirken funktional verwandt, aber visuell nicht wie dieselbe Anwendung: Desktop ist dunkel/orange-grau, Mobile ist hell/amber/gold/teal.

## 12. Seitenbezogene Designsprache

| Seite | Seitenlayout | Überschriften | Formulare | Tabellen | Buttons | Abstände | Konsistenz |
|---|---|---|---|---|---|---|---|
| Hauptansicht | klassischer Split 70/30 | Detailheader + Tabellenkopf, kein Seitentitel | Batch-Controls dunkel | dunkle MUI-Tabelle | kleine Inlinebuttons, teils widersprüchliche Hoverfarben | 10px + dynamische Höhe | mittel |
| Produktion | Dashboard-Grid | großer Titel + Bereichstitel | Maschinencontrols kontextuell | Prozessliste statt Tabelle | prozessspezifisch | 1rem, 1.2rem, Panels | mittel-hoch innerhalb der Seite, mittel appweit |
| Bierformular | Panel + Toolbar + Accordions | sehr klar und wiederholbar | am konsistentesten | gute Edit-Tabellen | klare Aktionsleiste, aber blaues Add fremd | 10/14/16px-Raster | hoch |
| Zutaten | MUI Accordion/Table | MUI Summary als Section Header | kompakte Row-Inputs | dunkle MUI-Tables | 34px Iconbuttons | 8px kompakt | mittel |
| Fertige Sude | Tabelle + Filter + Panels | Tabellenorientiert | Inline-Edit + Filter | ähnlich Rezepttabelle | viele lokale Varianten | 0.6rem/0.7rem/20px | mittel |
| Berechnungen | MUI Paper-Blöcke fixed wrapper | MUI h6 | MUI TextFields | keine Haupttabellen | MUI Button-Override | 16px Inline + 80px fixed | niedrig-mittel |
| Einstellungen | moderne helle Cards | Eyebrow/H2/Card h3 | Chips/Select/Checkbox | keine | eigener Gradient-Button | 1.5rem/1rem | niedrig appweit, hoch intern |
| Version | helle Karte | wie Settings | keine | keine | keine | 1.5rem/1rem | mittel als Settings-Verwandter |
| Mobile Ansichten | helle Mobile-App | Goldene große Titel | mobile Inputs | keine/Detailblöcke | große Gradientenbuttons | 8/18/20/32px | niedrig appweit, hoch mobil intern |

Beste visuelle Referenz für Desktop-Formular-/Pflegeseiten: Bierformular. Beste Referenz für Listen: Rezepttabelle/Fertige-Sude-Tabelle mit Bereinigung. Stärkste Abweichung: Mobile-Bereiche und Settings/Version wegen heller Card-Sprache; BrewingCalculations wegen MUI/fixed-scroll-Sonderlayout.

## 13. Design-Duplikate im Code

| Fund | Dateien/Klassen | Aufgabe | Unterschied | mögliche gemeinsame Lösung |
|---|---|---|---|---|
| Button-Basis mehrfach | `.add-button`, `.finish-btn`, `.cancel-btn`, `.settings-primary`, `.mobile-*btn`, `.icon` | Aktionen | Höhe 30/34/32/42/44+, Farben blau/orange/transparent/rot | `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-icon` |
| Tabellenstile mehrfach | `Table.css`, `FinishedBrewsTable.css`, `BeerForm.css`, `IngredientsFormPage.css` | Listen/Edit-Tabellen | Headerfarbe/Zebra/Zellpadding/Buttonspalten unterschiedlich | `.data-table`, `.data-table--editable`, `.data-table--compact` |
| Abschnittscontainer | `.beer-form-panel`, `.Settings`, `.Info`, `.settings-card`, `.custom-panel`, `.mobile-info-block` | Cards/Panels | Radius 8/10/12/14/1rem, hell/dunkel, Schatten uneinheitlich | `.surface`, `.surface-header`, `.surface--floating`, `.surface--light` |
| Überschriften | `.beer-form-panel-header`, `.beer-accordion-header`, `.HeaderText`, `.process-title`, `.settings-*`, `.mobile-*` | visuelle Hierarchie | Farben/Größen/Ebenen nicht gemappt | Typografie-Tokens und `.page-title`, `.section-title`, `.panel-title` |
| Inputs | Bierform, Details, Zutaten, FinishedBrews, Settings, Mobile, MUI | Dateneingabe | 34-40px+, hell/dunkel, Focus Glow vs Outline | `.form-control`, `.form-control--compact`, `.form-control--dark` |
| Orange-Töne | `--color-accent`, `--color-orange-*`, `--color-waiting-orange`, direkte orange | Akzent/Hover | Rollen unscharf | Primary/Hover/Active/Border-Tokens |
| MUI Overrides global | `BrewingCalculations.css`, `IngredientsFormPage.css` | MUI anpassen | `.Mui*` global in Komponenten-CSS, kann andere Seiten beeinflussen | Wrapper-scoped MUI Overrides |
| Inline-Styles | `Index` SimpleBar, Calculations Paper/Grid, Modal Content, Panel Position | Layout/Spacing | feste Werte ohne Token | CSS-Klassen oder lokale CSS-Variablen |

## 14. Responsive Design

Statische CSS-/Komponentenanalyse nach Zielgrößen:

- `320×568` und `390×844`: App rendert ausschließlich MobileProductionView, nicht die Desktop-Seiten. Mobile nutzt `100dvh`, Safe-Area-Padding und horizontal scrollende Tabs. Es wird eher neu angeordnet als nur verkleinert. Mobile Calculations hat `max-height:100vh` und kann bei vielen Blöcken Scroll-/Abschneide-Risiken erzeugen, je nachdem ob der Elterncontainer scrollt.
- Smartphone Querformat: Mobile bleibt aktiv, weil nur Breite `<768` entscheidet. Bei Querformatbreiten über 768 kann Desktop-Shell auf kleinen Höhen erscheinen; das ist ein offener Responsive-Risikopunkt.
- `768×1024`: Desktop wird aktiv. Header kann bei knapper Breite/Statusinhalt umbrechen; Shell reserviert trotzdem nur 4.75rem.
- `1024×768`: Header schaltet erst bei 1100px auf einspaltiges Headergrid. Dadurch können Nav und Status zwei Zeilen belegen; Inhaltsabstand bleibt statisch.
- `1366×768`: Hauptziel für Desktop/Kiosk vermutlich nutzbar, aber Produktionsgrid mit vier Spalten und festen minmax-Werten kann horizontal eng werden.
- `1920×1080`: Viele Seiten nutzen Breite voll; Settings/Version haben max-width Cards, Main split nutzt Breite sinnvoll, BeerForm bleibt breit.
- Zoom 125/150%: Risiken durch fixed header height, fixed/fixed-like BrewingCalculations wrapper, absolute ProcessList-Buttonposition und kleine 30/34px Iconbuttons.

## 15. Raspberry-Pi-/Kiosk-Bewertung

Konkrete Kiosk-Auflösung konnte in den analysierten Dateien nicht eindeutig ermittelt werden: Needs verification. Für Kiosk sind positiv: mobile Hauptbuttons und Tabs erreichen 44px+, BeerForm-Accordionheader min-height 48px, BeerForm-Buttons 42px, Production-Dashboard hat große Statusflächen. Kritisch: Header-Icons sind 40px hoch und ohne Text, Table-Actionbuttons 2rem/32px, Zutaten-Iconbuttons 34px, `Panel`-Headerbuttons 30px. Lesbarkeit aus Distanz ist in Production/Mobile gut, in Tabellen und Details mit 0.75rem/0.92rem/14px teils schwach.

## 16. Kategorisierte Funde

### Kategorie A – klare Designinkonsistenz

1. Speichern-/Bestätigen-Aktionen sehen je nach Seite deutlich unterschiedlich aus (`finish-btn` transparent/dunkel, Settings-Gradient, MUI Dialog Button).
2. Löschen-Aktionen haben widersprüchliche Hoverfarben, teilweise grün statt rot.
3. Vergleichbare Eingabefelder haben verschiedene Höhen, Hintergründe und Fokuszustände auf Desktop-Formularseiten.
4. Seitentitel gleicher Ebene sind nicht einheitlich: Panelheader, H2, großer Production-Titel, MUI h6-only Seiten.
5. Headerhöhe/Inhaltsabstand kann bei zweizeiligem Header nicht zusammenpassen.

### Kategorie B – notwendige Vereinheitlichung

1. Orange-/Grau-/Statusfarben sind tokenisiert, aber Rollen sind nicht klar genug getrennt.
2. Tabellenstile sind mehrfach fast gleich dupliziert.
3. Radius-/Shadow-System ist uneinheitlich.
4. MUI-Overrides sind teilweise global statt wrapper-scoped.
5. Abstände folgen keinem konsequenten Raster.
6. Scrollverhalten wird pro Seite individuell gelöst.

### Kategorie C – optionale gestalterische Verbesserung

1. Mobile könnte stärker an die dunkle Desktop-Brauhaus-Sprache angenähert werden; das ist eher Branding als Fehler.
2. Settings/Version könnten dunkle Cards erhalten; aktuell ist es konsistent innerhalb dieser Seiten, aber appweit fremd.
3. Header-Icons könnten Textlabels oder Tooltips mit sichtbaren Labels bekommen; subjektiv, aber Kiosk-freundlich.

## 17. Abgeleitete Brauhaus-Designsprache / Token-Vorschlag

Dieser Vorschlag nutzt vorhandene Werte und ersetzt keine bestehende Palette vollständig:

```css
:root {
    --color-primary: var(--color-accent);              /* #ffa726 */
    --color-primary-hover: var(--color-orange-alt);    /* #fb8c00 */
    --color-primary-active: var(--color-orange-strong);/* #e65100 */

    --color-background: var(--color-dark-bg);          /* #333333 */
    --color-surface: var(--color-brew-bg);             /* #404040 */
    --color-surface-secondary: var(--color-surface-deep); /* #3a3a3a */
    --color-surface-raised: var(--color-surface-strong);  /* #4a4a4a */
    --color-border: var(--color-border-strong);        /* #555 */
    --color-border-soft: var(--color-border-mid);      /* #666 */

    --color-text: var(--color-white);
    --color-text-secondary: var(--color-light-text);
    --color-text-on-primary: var(--color-black);

    --color-error: var(--color-error-mid);
    --color-warning: var(--color-waiting-orange);
    --color-success: var(--color-success);
    --color-info: var(--color-surface-alt);

    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 12px;
    --spacing-lg: 16px;
    --spacing-xl: 24px;
    --spacing-2xl: 32px;

    --control-height-compact: 34px;
    --control-height: 40px;
    --control-height-large: 44px;
    --touch-target-min: 44px;

    --border-radius-small: 4px;
    --border-radius-medium: 6px;
    --border-radius-large: 10px;
    --border-radius-pill: 999px;

    --font-size-small: 0.875rem;
    --font-size-normal: 1rem;
    --font-size-section-title: 1.15rem;
    --font-size-page-title: 1.5rem;
    --font-size-dashboard-title: 2rem;

    --font-weight-label: 600;
    --font-weight-strong: 700;
    --line-height-normal: 1.4;

    --desktop-header-height: 4.75rem;
}
```

Empfohlene Regeln für spätere Umsetzung: erstens bestehende Desktop-Brauhaus-Farben beibehalten; zweitens BeerForm als Referenz für Formularseiten verwenden; drittens Tabellen in gemeinsame Listen-/Edit-Varianten überführen; viertens Buttons rollenbasiert standardisieren; fünftens Headerlayout so anpassen, dass Nav, Titel/Status und reservierte Headerhöhe nicht kollidieren; sechstens MUI-Overrides auf Seitenwrapper begrenzen; siebtens Touch-Zielgrößen im Kiosk-Kontext priorisieren.
