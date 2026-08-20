# Production: Analyse der Timeline und Render-Performance

Stand: 20. August 2026. Die Laufzeitbewertung in diesem Dokument ist eine statische Codeanalyse. Eine Browser-Profilierung auf dem Raspberry Pi und belastbare Millisekunden-Messungen waren in der vorhandenen Umgebung nicht möglich.

## Ursache und Korrektur der flackernden Zeitachse

`Production` erhält bei jedem erfolgreichen Status-Poll ein neues `brewingStatus`-Objekt und rendert dadurch vollständig neu. Dabei ruft `renderInfo()` sowohl `getTimelineMeasurements()` als auch `buildTemperatureTimelineModel()` erneut auf. Das Modell verlängert eine überfällige aktive Aufheizphase sekündlich und verschiebt die geschätzten zukünftigen Schritte entsprechend. Sein fachliches `endSeconds` wächst damit ebenfalls sekündlich.

Die numerische Recharts-`XAxis` verwendete vorher nur `domain={[0, endSeconds]}`. Ohne explizite `ticks` bestimmte Recharts Anzahl, Abstand und Positionen automatisch aus der bei jedem Poll leicht veränderten Domain. Die beobachteten Labels wie `00:33:20` waren somit automatisch abgeleitete Teilungen der jeweils aktuellen Gesamtdauer. `type="number"` und der Zeit-Formatter waren korrekt, stabilisierten aber weder Domain noch Tickwerte. `tickCount`, `ticks`, `interval`, `scale`, `allowDataOverflow` und `minTickGap` waren nicht gesetzt.

Es gibt keinen wechselnden `key` am `LineChart`, an der `XAxis` oder an der umgebenden Timeline. Der Chart wird daher nicht bei jedem Poll als Ganzes neu gemountet. Die beiden `Line`-Serien haben `isAnimationActive={false}` und keine permanenten Dots. `XAxis`, `ReferenceArea` und `ReferenceLine` besitzen keine aktivierte Datenanimation. Einige `ReferenceArea`-Keys enthalten allerdings den Startwert; verschobene zukünftige Bereiche können deshalb individuell neu gemountet werden. Das erklärt nicht die wechselnden Achsenlabels, ist aber ein möglicher späterer Optimierungspunkt.

`ResponsiveContainer` beobachtet die verfügbare Größe. Die umgebende Grid-Zeile hat eine durch `clamp()` und `vh` bestimmte Höhe, innerhalb eines unveränderten Viewports aber keine pollabhängige Dimension. Es gibt im untersuchten Renderpfad keinen Statuswert, der Chartbreite oder -höhe verändert. Ein Resize kann Recharts neu layouten, ist aber nicht die sekündliche Ursache. Die Fortschrittsanzeige ändert nur die Breite eines inneren Balkens und beeinflusst die Chartgröße nicht.

Die Korrektur trennt nun das fachliche `endSeconds` von der sichtbaren Achse. Abhängig von der Gesamtdauer wird ein verständliches Raster von 5, 10, 15, 30 oder 60 Minuten gewählt. Das sichtbare Ende wird auf die nächste Rastergrenze aufgerundet; explizite Tickwerte werden für genau dieses Raster erzeugt. Mehrere Polls innerhalb derselben Grenze behalten deshalb identische Domain und Ticks. Erst beim Überschreiten einer Grenze wächst die Achse. Tatsächliche Messpunkte, Prozessanker, zukünftige Bereiche, Fortschritt und der bewegliche Jetzt-Marker verwenden weiterhin das dynamische Modell.

## Render- und Datenfluss pro Poll

1. Das Polling fragt ungefähr einmal pro Sekunde den Status ab, normalisiert ihn, legt ihn im globalen `dataCollector` ab und dispatcht ein neues Statusobjekt.
2. `connect()` reicht den neuen `brewingStatus` direkt an die Class Component `Production` weiter. `mapStateToProps` erzeugt außerdem bei jedem Store-Vergleich ein neues äußeres Props-Objekt; dessen einzelne Werte bleiben jedoch referenziell stabil, sofern der jeweilige Reducer sie nicht geändert hat.
3. `Production.render()` baut Wasseranzeige, Flammen, Prozessübersicht, aktuellen Schritt, Gauge, Settings, Dialoge und Timeline erneut als React-Elemente auf. Die untersuchten Child-Komponenten sind nicht durch `React.memo` beziehungsweise `PureComponent` abgeschirmt.
4. `renderInfo()` flacht die vollständige Messhistorie ab, sortiert und kopiert sie. Die Timeline verarbeitet diese neue Arrayreferenz vollständig und Recharts gleicht den SVG-Chart erneut ab.
5. Zusätzlich kann der lokale Countdown zwischen Status-Polls State-Updates auslösen, wodurch dieselben Bereiche nochmals rendern.

## Kosten der Timeline und des DataCollectors

Für `n` gespeicherte Messpunkte und `s` Rezept-/Prozessschritte gilt ungefähr:

- `getTimelineMeasurements()`: Zusammenführen aller Statusgruppen O(n), vollständige Sortierung nach `collectionSequence` O(n log n), anschließend O(n) Objektkopien.
- `buildTemperatureTimelineModel()`: Erzeugen und Filtern der Prozessschritte O(s), Normalisierung plus Sortierung O(n log n), Aufbau und Durchlauf mehrerer Maps O(n), Schrittmodell derzeit näherungsweise O(s²) durch wiederholte Suche nach dem nächsten beobachteten Start, Punktaufbau O(n) und abschließende Punktsortierung O(n log n).
- Pro Poll entstehen damit neue Arrays, Messobjekte, normalisierte Objekte, Maps, Punkte und Recharts-Datenreferenzen. Die Historie wird im Collector sortiert und im Modell erneut sortiert.

Bei genau einem Sample pro Sekunde wären vor Begrenzung nach 30 Minuten etwa 1.800, nach einer Stunde 3.600 und nach zwei Stunden 7.200 Samples angefallen. Tatsächlich begrenzt der Collector **jede Statusgruppe** auf 1.000 Punkte und bewahrt dabei deren ersten Anker. Eine lange unveränderte Statusgruppe bleibt daher bei 1.000 Punkten; mehrere Schritt-/Modus-/Wartegruppen können jeweils weitere 1.000 Punkte halten. Das Gesamtmaximum ist nicht global begrenzt: Der Gruppenschlüssel enthält Prozesszustand, Schrittindex, Phase, Modus, Name und Wartestatus. Für ein konkretes Rezept ist die Zahl praktisch durch seine Statusübergänge begrenzt, formal aber nicht durch den Collector.

Recharts zeichnet zwei Temperaturpfade ohne Punkt-Symbole. Hinzu kommen bei dem Testrezept ungefähr 14 `ReferenceArea`s, 14 Schritt-Endlinien, eine Jetzt-Linie, Grid, zwei Achsen, Tick-Texte und optionale Bereichslabels. Die Anzahl der SVG-Pfade bleibt damit moderat, aber die beiden Temperaturpfade können jeweils bis zu allen gesammelten Punkten enthalten und werden bei jedem Poll mit neuen Daten abgeglichen.

## Priorisierte Befunde

| Bereich | Beobachtetes Verhalten | Mögliche Kosten auf dem Raspberry Pi | Priorität | Empfohlener separater Schritt |
|---|---|---|---|---|
| Timeline-Historie | Vollständiges Flatten, Sortieren, Kopieren, erneutes Normalisieren und Sortieren pro Poll | Mit mehreren Gruppen wachsender CPU- und Allokationsaufwand; zusätzlich große SVG-Pfade | Hoch | Geordneten, versionierten Timeline-Snapshot im Collector bereitstellen; nur neue Samples inkrementell ergänzen und ein sinnvolles globales Budget/Downsampling prüfen. Prozessanker müssen erhalten bleiben. |
| Gesamte Production-Ansicht | Neues Statusobjekt rendert die komplette Class Component samt fachlich unveränderten Settings und Teilen der Wasser-/Prozessanzeige | Wiederholte React-Reconciliation und Child-Renderarbeit jede Sekunde, zusätzlich durch lokalen Countdown | Hoch | Mit React Profiler auf Zielgerät messen, danach Timeline, Settings und statische Panels an fachlichen Prop-Grenzen als `PureComponent`/`React.memo` trennen; stabile Props sicherstellen. |
| Recharts | Zwei lange SVG-Pfade sowie Bereiche, Linien, Grid, Achsen und Labels werden mit neuer Datenreferenz aktualisiert | SVG-Pfadaufbau und DOM-Abgleich wachsen mit n; auf Pi potenziell sichtbares Ruckeln | Hoch | Nach Profilierung verlustarmes, pixel-/zeitfensterbezogenes Downsampling der Kurven erwägen; Anker, Extrema und letzter Punkt dürfen nicht verloren gehen. |
| Gauge | Google-Charts-Gauge erhält pro Production-Render neue `data`- und `options`-Objekte; ein Wertwechsel erzeugt zusätzlich lokalen State und einen zweiten Render | Bibliotheksinterner SVG/DOM-Neuaufbau beziehungsweise Animation ist teurer als ein einfacher React-Text; tatsächliches Animationsverhalten muss im Browser verifiziert werden | Mittel | Prop-Wert direkt verwenden oder State synchronisieren ohne Doppelrender; Daten/Optionen stabilisieren und Google-Chart im Profiler prüfen. |
| DataCollector-Limit | Limit gilt pro Statusgruppe, nicht global | Lange Rezepte und viele Moduswechsel lassen Gesamtmenge weiter wachsen | Mittel bis hoch | Reale maximale Gruppenanzahl erheben; globales Budget oder stufenweises Downsampling mit erhaltenen Gruppenanfängen entwerfen. |
| Prozessanzeigen | Übersicht und aktueller Schritt erhalten das vollständige neue Statusobjekt und rendern beide neu | Doppelte Berechnung/Elementerzeugung, obwohl viele Statusfelder irrelevant sind | Mittel | Nach Messung kleinere primitive Props/abgeleitete stabile View-Modelle verwenden und beide Modi gezielt memoizen. |
| Wasser/Flammen | Rendern mit Production neu; Wasser enthält laufende CSS-Animationen und Höhenübergang, Flammen animieren bei aktivem Heizer | Dauerhafte Paint-Arbeit unabhängig vom Poll; auf schwacher GPU relevant | Mittel | Pi-Browserprofil erstellen, Animationskomplexität reduzieren und `prefers-reduced-motion` beibehalten; nicht pauschal abschalten. |
| Redux-Anbindung | Keine memoisierten Selektoren; hauptsächlich direkte Slice-Werte, aber vollständiges `brewingStatus` wird propagiert | Das äußere Objekt allein ist wegen `connect`-Shallow-Compare unkritisch; der neue Statuswert löst erwartungsgemäß Render aus | Niedrig bis mittel | Fachliche Selektoren erst zusammen mit Komponentenaufteilung einführen; keine Redux-Architekturänderung nötig. |
| Layout/ResponsiveContainer | Stabile Grid-/Flex-Struktur; `vh`/`clamp()` reagieren auf Viewport, nicht auf Poll. ResizeObserver ist chartbedingt vorhanden | Re-layout bei echten Resizes; keine statische Evidenz für pollinduzierte Resize-Schleife | Niedrig | Im Browser ResizeObserver-/Layout-Events prüfen, falls Flackern nach der Achsenkorrektur bei Fensteränderungen verbleibt. |
| ReferenceArea-Keys | Key enthält teilweise den dynamischen Startwert zukünftiger Bereiche | Einzelne Band-Remounts und unnötiger SVG-Austausch, aber nicht Ursache der Tick-Sprünge | Niedrig | Stabile Prozessidentität/Index als Key verwenden, nachdem doppelte Namen geprüft wurden. |

## Empfohlene nächste 5 Maßnahmen

1. Auf dem Raspberry Pi mit React Profiler und Chrome Performance Panel einen 30- bis 60-minütigen beziehungsweise synthetisch wiedergegebenen Verlauf messen.
2. `getTimelineMeasurements()` und die Modellbildung über einen geordneten, versionierten Snapshot nur bei neuer Collector-Version ausführen; doppelte Vollsortierungen entfernen.
3. Ein fachlich abgesichertes globales Messpunktbudget oder visuelles Downsampling einführen, das Prozessgrenzen, Min/Max-Werte und den neuesten Punkt bewahrt.
4. Timeline und statische Settings-/Panelbereiche entlang schmaler, stabiler Props isolieren und erst dann gezielt `PureComponent` oder `React.memo` einsetzen.
5. Google Gauge und laufende Wasser-/Flammenanimationen auf dem Pi profilieren; insbesondere den doppelten Gauge-Render bei Wertänderung beseitigen, falls er messbar relevant ist.

Diese Änderung verändert keine API-Pfade, DTOs, IDs, Enumwerte, Zeit-/Temperatureinheiten, Polling- oder Terminalzustände und hat daher keine Cross-Repository-Kompatibilitätsauswirkung.
