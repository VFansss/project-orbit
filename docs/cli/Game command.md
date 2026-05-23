# Game command

Il comando "game" da modo di lavorare con i "media" di tipo "game".

All'avvio, se non ci sono parametri extra, fa uscire un menù interattivo per scegliere i sotto-comandi disponibili.

## import

Il sotto-comando import serve, similmente a quella "screenshot", per "importare" nella libreria locale dei game.

Come prima cosa, c'è bisogno di passare la "platform". E' possibile passarla anche grazie al comando "--platform". Se il parametro non esiste, fa uscire (cosi come screenshot) un selettore. delle piattaforme supportate. E' possibile recuperarle da "\core" grazie al metodo relativo.

Inserire anche una voce "Nessuna di queste / Piattaforma non supportata nell'elenco". Se si, mostri semplicemente un messaggio: "Non hai bisogno di import per organizzare la tua libreria: crea una cartella col nome che preferisci dentro "Game" e organizza i tuoi file come preferisci"

Una volta scelto, chiedere la cartella da dove leggere le cose. Chiedere anche se analizzare ricorsivamente i file.

Dal momento che so la platform, posso leggere dall'oggetto di config i "formati" utili. Nella definizione della platform, ci deve essere un flag che dice "prendi solo i formati precisi nella definizione" e.g. gba per Gameboy, .nes per NES. Quel flag dovrà essere falso per il PC per esempio perchè li purtroppo dobbiamo essere più elastici (per esempio tanti dump o repack hanno si un .exe per installarli, ma anche altri file che però ci dobbiamo portare dietro). In tal caso, ogni madre dove trovi un "formato compatibile" (e.g. zip, exe o altro) prendi tutti i file "non riconosciuti" e, li elenchi a video e li importi. Se quel flag invece è falso, prendi solamente i file che rispondono ai "file format" supportati.

A questo punto abbiamo:

- Piattaforma
- Directory
- Info sulla piattaforma (e relativi file supportati ecc)
  
Possiamo partire.

Ricorda che in ogni caso stiamo usando la "_staging" folder per spostare i file dal source -> staging e solo alla fine eventualmente applicare le modifiche e portarli verso la libreria vera e propria, similmente a come viene fatto per clip e screenshot
