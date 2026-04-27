# Hex and RGB usage in CSS/TSX

Generated via `rg -n "(#[0-9A-Fa-f]{3,6}|rgb\()" src public --glob "*.css" --glob "*.tsx"`.

## Matches

src/components/Controlls/WaterControll/WaterControl.tsx:55:                borderBottom: i === 0 ? 'none' : '1px solid #ccc',
src/components/Controlls/WaterControll/WaterControll.css:15:    background-color: #0af;
src/components/Controlls/WaterControll/WaterControll.css:25:    background-image: linear-gradient(transparent, #0af);
src/components/Controlls/Gant/GantChart.tsx:28:                styles: {progressColor: '#ffbb54', progressSelectedColor: '#ff9e0d'},
src/components/Controlls/Gant/GantChart.tsx:38:                styles: {progressColor: '#ffbb54', progressSelectedColor: '#ff9e0d'},
src/colors.css:3:  --color-dark-bg: #333333;
src/colors.css:4:  --color-panel-bg: #23272b;
src/colors.css:5:  --color-white: #fff;
src/colors.css:6:  --color-black: #111;
src/colors.css:7:  --color-accent: #ffa726;
src/colors.css:8:  --color-brew-bg: #404040;
src/colors.css:9:  --color-light-text: #eeeeee;
src/colors.css:10:  --color-input-bg: #ffffff;
src/colors.css:11:  --color-input-border: #404040;
src/colors.css:12:  --color-input-bg2: #f0f0f0;
src/colors.css:13:  --color-input-bg3: #ccc6c6;
src/colors.css:35:  --color-dark-bg: #0f1724;
src/colors.css:36:  --color-panel-bg: #131b2a;
src/colors.css:37:  --color-white: #e8edf5;
src/colors.css:38:  --color-black: #05070d;
src/colors.css:39:  --color-accent: #8ab4f8;
src/colors.css:40:  --color-brew-bg: #0b1220;
src/colors.css:41:  --color-light-text: #d6def0;
src/colors.css:42:  --color-input-bg: #1f2a3d;
src/colors.css:43:  --color-input-border: #3c4a64;
src/colors.css:44:  --color-input-bg2: #23314a;
src/colors.css:45:  --color-input-bg3: #2e3c59;
src/containers/Settings/SettingsPage.css:21:  color: #b26a00;
src/containers/Settings/SettingsPage.css:32:  color: #444;
src/containers/Settings/SettingsPage.css:50:  background: #43a047;
src/containers/Settings/SettingsPage.css:56:  background: #e8f5e9;
src/containers/Settings/SettingsPage.css:57:  color: #1b5e20;
src/containers/Settings/SettingsPage.css:58:  border: 1px solid #c8e6c9;
src/containers/Settings/SettingsPage.css:90:  color: #555;
src/containers/Settings/SettingsPage.css:113:  color: #666;
src/containers/Settings/SettingsPage.css:134:  background: linear-gradient(180deg, #ffb74d 10%, #ff9800 100%);
src/containers/Settings/SettingsPage.css:135:  color: #5d3300;
src/containers/Settings/SettingsPage.css:136:  border-color: #b26a00;
src/containers/Settings/SettingsPage.css:177:  background: linear-gradient(180deg, #ffb74d 10%, #ff9800 100%);
src/containers/Settings/SettingsPage.css:178:  border: 1px solid #b26a00;
src/containers/Settings/SettingsPage.css:179:  color: #5d3300;
src/containers/Settings/SettingsPage.css:197:  color: #666;
src/containers/App.css:5:    background: #333333;
src/containers/App.css:13:    background: #333333;
src/containers/Mobile/MobileBrewingCalculationsView/MobileBrewingCalculationsView.css:3:  background: #fffbe6;
src/containers/Mobile/MobileBrewingCalculationsView/MobileBrewingCalculationsView.css:19:  background: #fff;
src/containers/Mobile/MobileBrewingCalculationsView/MobileBrewingCalculationsView.css:30:  color: #b8860b;
src/containers/Mobile/MobileBrewingCalculationsView/MobileBrewingCalculationsView.css:40:  color: #333;
src/containers/Mobile/MobileBrewingCalculationsView/MobileBrewingCalculationsView.css:47:  border: 1px solid #bdbdbd;
src/containers/Mobile/MobileBrewingCalculationsView/MobileBrewingCalculationsView.css:51:  background: #f9f6e7;
src/containers/Mobile/MobileBrewingCalculationsView/MobileBrewingCalculationsView.css:52:  color: #222;
src/containers/Mobile/MobileBrewingCalculationsView/MobileBrewingCalculationsView.css:56:  color: #00796b;
src/containers/Mobile/MobileBrewingCalculationsView/MobileBrewingCalculationsView.tsx:76:                    <span style={{fontSize: '2.2em', color: '#b8860b', display: 'flex', alignItems: 'center', fontWeight: 900, lineHeight: 1, position: 'relative', top: '-6px'}} aria-label="arrow" role="img">&#8594;</span>
src/containers/Mobile/MobileBrewingCalculationsView/MobileBrewingCalculationsView.tsx:99:                    <span style={{fontSize: '2.2em', color: '#b8860b', display: 'flex', alignItems: 'center', fontWeight: 900, lineHeight: 1, position: 'relative', top: '-6px'}} aria-label="arrow" role="img">&#8594;</span>
src/containers/Panel/Panel.css:3:  background: #23272b;
src/containers/Panel/Panel.css:13:  color: #fff;
src/containers/Panel/Panel.css:18:  color: #111;
src/containers/Panel/Panel.css:22:  border-bottom: 2px solid #ffa726;
src/containers/Panel/Panel.css:40:  color: #111;
src/containers/Panel/Panel.css:71:  background: #23272b;
src/containers/Mobile/MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.css:13:  background: #181818;
src/containers/Mobile/MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.css:35:  color: #fff;
src/containers/Mobile/MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.css:40:  color: #fff;
src/containers/Mobile/MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.css:48:  border: 1px solid #888;
src/containers/Mobile/MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.css:50:  background: #232323;
src/containers/Mobile/MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.css:51:  color: #fff;
src/containers/Mobile/MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.css:58:  border: 1px solid #888;
src/containers/Mobile/MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.css:60:  background: #232323;
src/containers/Mobile/MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.css:61:  color: #fff;
src/containers/Mobile/MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.css:71:  background: #ff9800;
src/containers/Mobile/MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.css:72:  color: #fff;
src/containers/Mobile/MobileActiveFinishedBrewView/MobileActiveFinishedBrewView.css:80:  background: #ffa733;
src/containers/Production/Production.css:18:    background: #353535;
src/containers/Production/Production.css:37:    background: #393939;
src/containers/Production/Production.css:58:    color: #eeeeee;
src/containers/Production/Production.css:71:    background: #404040;
src/containers/Production/Production.css:84:    background: #e23030;
src/containers/Production/Production.css:94:    background: #404040;
src/containers/Production/Production.css:106:    background: #404040;
src/containers/Production/Production.css:120:    background: #404040;
src/containers/Production/Production.css:134:    background: #404040;
src/containers/Production/Production.css:154:    background-color: #c9c9c9;
src/containers/Production/Production.css:159:    border: 2px solid #333;
src/containers/Production/Production.css:164:    background-color: #333333;
src/containers/Production/Production.css:168:    color: #eeeeee;
src/containers/Production/Production.css:174:    color: #eeeeee;
src/containers/Production/Production.css:180:    color: #eeeeee;
src/containers/Production/Production.css:207:    background-color: #4caf50;
src/containers/Production/Production.css:218:    color: #fff;
src/containers/Production/Production.css:226:    color: #fff;
src/containers/Production/Production.css:235:    background-color: #1976d2;
src/containers/Production/Production.css:244:    background-color: #1565c0;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:3:  background: #fffbe6;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:31:  color: #b8860b;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:48:  background: #fff;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:62:  color: #b8860b;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:68:  color: #00796b;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:78:  background: linear-gradient(90deg, #f9d423 0%, #ff4e50 100%);
src/containers/Mobile/MobileStatusView/MobileProductionView.css:79:  color: #fff;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:93:  background: #bdbdbd;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:94:  color: #fff;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:99:  border: 2px solid #bdbdbd;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:105:  background: #fff;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:117:  color: #b8860b;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:123:  color: #333;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:140:  background: linear-gradient(90deg, #f9d423 0%, #ff4e50 100%);
src/containers/Mobile/MobileStatusView/MobileProductionView.css:141:  color: #fff;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:154:  color: #fff;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:155:  border-bottom: 2px solid #fffbe6;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:160:  background: #ffe9a7;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:161:  color: #b8860b;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:166:  background: #ffe9a7 !important;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:167:  color: #b8860b !important;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:168:  border-color: #b8860b !important;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:174:  border-top: 2px solid #b8860b;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:182:  background: linear-gradient(180deg, #f5e7b8 80%, #fffbe6 100%);
src/containers/Mobile/MobileStatusView/MobileProductionView.css:193:  background: linear-gradient(90deg, #f9d423 0%, #ff4e50 100%);
src/containers/Mobile/MobileStatusView/MobileProductionView.css:194:  color: #fff;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:207:  background: #bdbdbd;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:208:  color: #fff;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:215:  background: #bdbdbd;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:216:  color: #fff;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:224:  background: linear-gradient(90deg, #f9d423 0%, #ff4e50 100%);
src/containers/Mobile/MobileStatusView/MobileProductionView.css:225:  color: #fff;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:240:  background: #ffe9a7 !important;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:241:  color: #b8860b !important;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:242:  border-color: #b8860b !important;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:247:  background: #e0e0e0;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:248:  color: #bdbdbd;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:249:  border-color: #bdbdbd;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:256:  background: #ffe9a7;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:257:  color: #b8860b;
src/containers/Mobile/MobileStatusView/MobileProductionView.css:263:  color: #b8860b;
src/containers/Production/ProcessList/ProcessList.css:11:    color: #ffa726;
src/containers/Production/ProcessList/ProcessList.css:27:    background: #444;
src/containers/Production/ProcessList/ProcessList.css:28:    color: #fff;
src/containers/Production/ProcessList/ProcessList.css:36:    background: #1976d2;
src/containers/Production/ProcessList/ProcessList.css:37:    color: #fff;
src/containers/Production/ProcessList/ProcessList.css:39:    border-left: 6px solid #ffa726;
src/containers/Production/ProcessList/ProcessList.css:45:    color: #ffa726;
src/containers/Production/ProcessList/ProcessList.css:50:    border-top: 2px solid #ffa726;
src/containers/DatabaseOverview/BeerForm.css:42:    color: #ffffff;
src/containers/DatabaseOverview/BeerForm.css:51:    color: #ffffff;
src/containers/DatabaseOverview/BeerForm.css:61:    background-color: var(--color-accent); /* Geändert von #007bff zu var(--color-accent) für Konsistenz */
src/containers/DatabaseOverview/BeerForm.css:62:    color: #fff;
src/containers/DatabaseOverview/BeerForm.css:79:    color: #fff;
src/containers/DatabaseOverview/BeerForm.css:86:    background-color: #c96a00; /* Dunklere Version der darkorange Farbe */
src/containers/DatabaseOverview/BeerForm.css:140:    border: 1px solid #555;
src/containers/DatabaseOverview/BeerForm.css:149:    background: #333;
src/containers/DatabaseOverview/BeerForm.css:154:    background: #666;
src/containers/DatabaseOverview/BeerForm.css:159:    background: #888;
src/containers/DatabaseOverview/BeerForm.css:172:    background-color: #555;
src/containers/DatabaseOverview/BeerForm.css:183:    background-color: #4a4a4a;
src/containers/DatabaseOverview/BeerForm.css:187:    background-color: #3a3a3a;
src/containers/DatabaseOverview/BeerForm.css:269:    color: #fff;
src/containers/DatabaseOverview/BeerForm.css:279:    background-color: #c96a00;
src/containers/DatabaseOverview/BeerForm.css:280:    color: #fff;
src/containers/DatabaseOverview/BeerForm.css:289:    background-color: #e0e0e0;
src/containers/DatabaseOverview/BeerForm.css:290:    color: #bdbdbd;
src/containers/DatabaseOverview/BeerForm.css:294:    border: 1px solid #cccccc;
src/containers/DatabaseOverview/BeerForm.css:299:    color: #fff;
src/containers/DatabaseOverview/BeerForm.css:309:    background-color: #d32f2f;
src/containers/DatabaseOverview/BeerForm.css:310:    color: #fff;
src/containers/DatabaseOverview/IngredientsFormPage.tsx:118:                    <Accordion defaultExpanded sx={{ backgroundColor: "#404040" }}>
src/containers/DatabaseOverview/IngredientsFormPage.tsx:126:                        <AccordionDetails sx={{ backgroundColor: "#404040" }}>
src/containers/DatabaseOverview/IngredientsFormPage.tsx:201:                    <Accordion sx={{ backgroundColor: "#404040" }}>
src/containers/DatabaseOverview/IngredientsFormPage.tsx:209:                        <AccordionDetails sx={{ backgroundColor: "#404040" }}>
src/containers/DatabaseOverview/IngredientsFormPage.tsx:283:                    <Accordion sx={{ backgroundColor: "#404040" }}>
src/containers/DatabaseOverview/IngredientsFormPage.tsx:291:                        <AccordionDetails sx={{ backgroundColor: "#404040" }}>
src/containers/MainView/BeerRecipes/Table.css:2:  background-color: #404040;
src/containers/MainView/BeerRecipes/Table.css:36:  color: #fff;
src/containers/MainView/BeerRecipes/Table.css:52:  background-color: #ffa726;
src/containers/MainView/BeerRecipes/Table.css:53:  color: #222;
src/containers/MainView/BeerRecipes/Table.css:57:  background-color: #bdbdbd;
src/containers/MainView/BeerRecipes/Table.css:58:  color: #888;
src/containers/MainView/BeerRecipes/Table.css:65:  background-color: #b71c1c;
src/containers/MainView/BeerRecipes/Table.css:66:  color: #fff;
src/containers/MainView/BeerRecipes/Table.css:83:  background-color: #d32f2f;
src/containers/MainView/BeerRecipes/Table.css:84:  color: #fff;
src/containers/DatabaseOverview/IngredientsFormPage.css:18:    background-color: #404040 !important;
src/containers/DatabaseOverview/IngredientsFormPage.css:25:    background-color: #404040 !important;
src/containers/DatabaseOverview/IngredientsFormPage.css:35:    border-bottom: 2px solid #222 !important;
src/containers/DatabaseOverview/IngredientsFormPage.css:44:    background-color: #404040 !important;
src/containers/DatabaseOverview/IngredientsFormPage.css:46:    border-bottom: 1px solid #555 !important;
src/containers/DatabaseOverview/IngredientsFormPage.css:52:    background-color: #404040 !important;
src/containers/DatabaseOverview/IngredientsFormPage.css:61:    border: 1px solid #666;
src/containers/DatabaseOverview/BeerForm.tsx:543:                                                            color: '#333',
src/containers/DatabaseOverview/BeerForm.tsx:544:                                                            border: `1px solid #ced4da`,
src/containers/DatabaseOverview/BeerForm.tsx:596:                                <thead style={{position: 'sticky', top: 0, background: '#fff', zIndex: 2}}>
src/containers/DatabaseOverview/BeerForm.tsx:653:                                <thead style={{position: 'sticky', top: 0, background: '#fff', zIndex: 2}}>
src/containers/DatabaseOverview/BeerForm.tsx:721:                                <thead style={{position: 'sticky', top: 0, background: '#fff', zIndex: 2}}>
src/containers/MainView/Details/Details.css:29:    background: #303030;
src/containers/MainView/Details/Details.css:35:    border-bottom: 1px solid #444;
src/containers/MainView/Details/Details.css:46:    color: #ffffff;
src/containers/MainView/Details/Details.css:56:    background-color: #2f2f2f;
src/containers/MainView/Details/Details.css:57:    color: #ffffff;
src/containers/MainView/Details/Details.css:59:    border: 1px solid #555;
src/containers/MainView/Details/Details.css:68:    border-color: #888;
src/containers/MainView/Details/Details.css:76:    background-color: #3b3b3b;
src/containers/MainView/Details/Details.css:81:    background: #2f2f2f;
src/containers/MainView/Details/Details.css:115:    background-color: #404040 !important;
src/containers/MainView/Details/Details.tsx:164:                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
src/containers/MainView/Details/Details.tsx:175:            <TableContainer component={Paper} style={{ backgroundColor: '#404040' }}>
src/containers/MainView/Details/Details.tsx:207:                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
src/containers/MainView/Details/Details.tsx:219:            <TableContainer component={Paper} style={{ backgroundColor: '#404040' }}>
src/containers/MainView/Details/Details.tsx:259:                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
src/containers/MainView/Details/Details.tsx:271:            <TableContainer component={Paper} style={{ backgroundColor: '#404040' }}>
src/containers/MainView/Details/Details.tsx:309:                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
src/containers/MainView/Details/Details.tsx:368:                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
src/containers/MainView/Details/Details.tsx:429:                <AccordionDetails sx={{ backgroundColor: '#404040' }}>
src/containers/MainView/Details/Details.tsx:440:            <TableContainer component={Paper} style={{ backgroundColor: '#404040' }}>
src/containers/MainView/Main.css:32:    background-color: #888;
src/containers/MainView/Main.css:40:    background-color: #eee;
src/containers/MainView/Main.css:48:    background-color: #eee;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:9:  background-color: #404040; /* wie Table.css */
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:60:  color: #fff;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:76:  background-color: #ffa726;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:77:  color: #222;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:81:  background-color: #bdbdbd;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:82:  color: #888;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:90:  color: #fff;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:100:  background-color: #d32f2f;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:101:  color: #fff;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:105:  background-color: #2e7d32 !important; /* Grüner Hintergrund für aktive Zeile */
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:106:  color: #fff;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:118:  background: #404040;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:120:  border: 1px solid #888;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:135:  background: #404040;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:175:  color: #fff;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:185:  background-color: #c96a00;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:186:  color: #fff;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:195:  background-color: #e0e0e0;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:196:  color: #bdbdbd;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:200:  border: 1px solid #cccccc;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:225:  background: #333333;
src/containers/MainView/FinishBrewsBeers/FinishedBrewsTable.css:231:  background: #333333;
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.css:20:  background-color: #f5f5f5;
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.css:21:  color: #333;
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.css:26:  background-color: #ff9800;
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.css:39:  background: #ffffff;
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.css:40:  border: 2px solid #ff9800;
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.css:49:  background: #333333;
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.css:50:  color: #ffffff;
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.css:71:  stroke: #ff9800;
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.tsx:148:    const areaColors = ['#ffe0b2', '#c8e6c9', '#bbdefb', '#f8bbd0', '#d1c4e9', '#fff9c4'];
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.tsx:173:      HEATING: '#ffe082',
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.tsx:174:      WAITING_FOR_MASHING_IN: '#b3e5fc',
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.tsx:175:      RUNNING: '#c8e6c9',
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.tsx:176:      WAITING_FOR_IODINE_TEST: '#f8bbd0',
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.tsx:177:      WAITING_FOR_COOKING_START: '#d1c4e9',
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.tsx:178:      WAITING_FOR_WATER_BOIL: '#fff9c4',
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.tsx:179:      BREWING_FINISHED: '#ffccbc',
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.tsx:180:      default: '#eeeeee'
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.tsx:319:              <Line type="monotone" dataKey="Temperature" stroke="#FF0000" name="Ist-Temperatur" dot={false} />
src/containers/MainView/FinishBrewsBeers/BrewProcessChart.tsx:320:              <Line type="monotone" dataKey="TargetTemperature" stroke="#FFFD00" name="Soll-Temperatur" dot={false} />
src/containers/MainView/Header/Header.css:74:  color: #000000;
src/containers/MainView/Header/Header.css:103:  background: linear-gradient(180deg, #ffa726 60%, #fb8c00 100%);
src/containers/MainView/Header/Header.css:104:  border: 2px solid #b26a00;
src/containers/MainView/Header/Header.css:105:  box-shadow: 0 3px 8px rgba(255,152,0,0.18), 0 2px 0 #ffcc80 inset, 0 2px 0 #b26a00;
src/containers/MainView/Header/Header.css:110:  color: #b26a00;
src/containers/MainView/Header/Header.css:124:  background: linear-gradient(180deg, #fb8c00 60%, #ef6c00 100%);
src/containers/MainView/Header/Header.css:125:  border-color: #ff9800;
src/containers/MainView/Header/Header.css:130:  background: linear-gradient(180deg, #ff9800 60%, #e65100 100%);
src/containers/MainView/Header/Header.css:131:  border: 2px inset #b26a00;
src/containers/MainView/Header/Header.css:132:  box-shadow: 0 1px 2px #b26a00 inset, 0 1.5px 0 #fff;
src/containers/MainView/Header/Header.css:133:  color: #fff;
src/containers/MainView/Header/Header.css:139:  color: #b26a00;
src/containers/MainView/Header/StatusDisplay.css:7:  color: #333;
src/containers/MainView/Header/StatusDisplay.css:8:  background: linear-gradient(180deg, #ff9800 60%, #e65100 100%);
src/containers/MainView/Header/StatusDisplay.css:9:  border: 2px inset #b26a00;
src/containers/MainView/Header/StatusDisplay.css:11:  box-shadow: 0 1px 2px #b26a00 inset, 0 1.5px 0 #fff;
src/containers/MainView/Header/StatusDisplay.css:22:  color: #fff;
src/containers/MainView/Header/StatusDisplay.css:30:  text-shadow: 0 1px 2px #e65100;
src/containers/MainView/Header/StatusDisplay.css:34:  color: #43a047;
src/containers/MainView/Header/StatusDisplay.css:35:  text-shadow: 0 1px 2px #1b5e20;
src/containers/MainView/Header/StatusDisplay.css:39:  color: #e53935;
src/containers/MainView/Header/StatusDisplay.css:40:  text-shadow: 0 1px 2px #b71c1c;
src/containers/MainView/Header/StatusDisplay.css:49:  border-bottom: 1px solid #b26a00;
src/containers/MainView/Header/StatusDisplay.css:63:  color: #fff;
src/containers/MainView/Header/StatusDisplay.css:64:  background: #e65100;
src/containers/MainView/Header/StatusDisplay.css:66:  border: 1.5px solid #b26a00;
src/containers/MainView/Header/StatusDisplay.css:73:  background: #ff9800;
src/containers/MainView/Header/StatusDisplay.css:74:  color: #fff;
src/containers/MainView/Header/StatusDisplay.css:92:  color: #000;
