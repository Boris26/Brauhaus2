export class TextMapper{

    private static readableText: Record<string,string >={
        waitingOfEinmaischen: 'Einmaischen, bitte abschliessen',
        waitingOfIodineTest: 'Bitte Jod Test durchführen!',
        waitingOfStartKochen: 'Kann der Koch Prozess gestartet werden?',
        waitingOfWaterIsKochen: 'Bitte Bestätigen wenn Wasser Kocht!',
    }
      static mapToText(text:string):string{
        return this.readableText[text] || `Unbekannter Status: ${text}`;
    }
}
