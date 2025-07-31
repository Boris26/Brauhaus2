export class TextMapper{

    private static readableText: Record<string,string >={
        WAITING_FOR_MASHING_IN: 'muss abgeschlossen werden',
        WAITING_FOR_IODINE_TEST: 'Jod Test durchführen!',
        WAITING_FOR_COOKING_START: 'Wartet auf start des Koch Prozesses',
        WAITING_FOR_WATER_BOIL: 'Wartet auf Bestätigung des Siedepunktes',
        HEATING: 'Wird erhitzt',
        RUNNING: 'läuft'
    }
      static mapToText(text:string):string{
        return this.readableText[text] || `Unbekannter Status: ${text}`;
    }
}
