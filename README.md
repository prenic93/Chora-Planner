# Chora Planner - Canzoniere Digitale PWA

## Funzionalità Offline Complete

Questa versione di Chora Planner è stata ottimizzata per funzionare **completamente offline** una volta installata come PWA (Progressive Web App).

### 🚀 Caratteristiche Principali

- **Funzionamento Offline Completo**: Una volta caricati i PDF e installata l'app, funziona senza connessione internet
- **Service Worker Avanzato**: Cache intelligente con strategie ottimizzate per diversi tipi di contenuto
- **Installazione PWA**: Può essere installata come app nativa su dispositivi mobili e desktop
- **Gestione PDF Locale**: Tutti i PDF vengono salvati localmente nel browser (IndexedDB)
- **Annotazioni Persistenti**: Note e disegni salvati localmente e sincronizzati automaticamente
- **Ricerca Offline**: Indicizzazione locale del testo dei PDF per ricerca rapida senza internet

### 📱 Installazione

1. **Desktop**: Clicca sull'icona di installazione nella barra degli indirizzi del browser
2. **Mobile**: Usa il menu del browser e seleziona "Aggiungi alla schermata Home" o "Installa app"
3. **Automatica**: L'app mostrerà un prompt di installazione quando disponibile

### 🔧 Funzionalità Offline

#### Cache Strategy
- **Static Assets**: Cache First (HTML, CSS, JS, icone)
- **CDN Resources**: Stale While Revalidate (FontAwesome, PDF.js, jsPDF)
- **Dynamic Content**: Network First con fallback alla cache

#### Storage Locale
- **PDF Files**: Salvati in IndexedDB (fino a diversi GB disponibili)
- **Eventi e Scalette**: Persistenti in IndexedDB
- **Annotazioni**: Salvate localmente con compressione automatica
- **Indice di Ricerca**: Generato e salvato localmente per ogni PDF

### 🛠️ Tecnologie Utilizzate

- **Service Worker**: Per cache offline e gestione richieste
- **IndexedDB**: Database locale per PDF e dati dell'app
- **Canvas API**: Per rendering PDF e annotazioni
- **Web App Manifest**: Per installazione PWA
- **PDF.js**: Rendering PDF lato client
- **jsPDF**: Generazione PDF per esportazione eventi

### 📂 Struttura File

```
├── index.html          # App principale
├── manifest.json       # Configurazione PWA
├── sw.js               # Service Worker
├── offline-assets/     # Asset per funzionamento offline
│   └── fontawesome.css # Icone di fallback
├── icon-*.png          # Icone dell'app
└── README.md           # Questo file
```

### 🔄 Aggiornamenti

L'app controlla automaticamente gli aggiornamenti e notifica l'utente quando una nuova versione è disponibile. Gli aggiornamenti vengono applicati al prossimo riavvio dell'app.

### 💾 Gestione Storage

- **Pulizia Automatica**: Rimozione automatica di annotazioni orfane
- **Compressione**: Le annotazioni vengono compresse per ridurre l'uso di spazio
- **Backup/Restore**: Funzionalità di esportazione/importazione completa dei dati

### 🎯 Utilizzo Ottimale

1. **Prima Installazione**: Connetti a internet per scaricare l'app e le dipendenze
2. **Carica PDF**: Aggiungi tutti i PDF che ti servono mentre sei online
3. **Installa App**: Usa il prompt di installazione per aggiungere alla schermata home
4. **Uso Offline**: L'app funziona completamente offline dopo l'installazione

### 🔍 Risoluzione Problemi

#### L'app non funziona offline
- Verifica che sia stata installata come PWA
- Controlla che i PDF siano stati caricati completamente
- Ricarica l'app una volta online per aggiornare la cache

#### PDF non si aprono
- Verifica che il file sia un PDF valido
- Controlla lo spazio disponibile nel browser
- Prova a ricaricare il PDF

#### Annotazioni non si salvano
- Verifica lo spazio disponibile nel browser
- Controlla che IndexedDB sia abilitato
- Prova a esportare e reimportare i dati

### 📊 Limiti Tecnici

- **Spazio Storage**: Dipende dal browser e dispositivo (tipicamente 50-100MB+)
- **Dimensione PDF**: Massimo 50MB per file
- **Browser Support**: Moderni browser con supporto PWA e IndexedDB

### 🆘 Supporto

Per problemi o domande:
1. Controlla la console del browser per errori
2. Verifica la compatibilità del browser
3. Prova a pulire la cache e reinstallare l'app

---

**Versione**: 1.2  
**Ultima Modifica**: Dicembre 2024  
**Compatibilità**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+