# Magyar Discord Bot

Egy teljes funkcionalitású magyar Discord bot moderációval, játékokkal és számoló játékkal.

## 🚀 Gyors indítás

### 1. Lépés: A bot már beállítva!
A projekt mappa: `C:\Users\laszl\Projects\magyar-discord-bot`

### 2. Lépés: Bot indítása
Nyiss meg egy terminált és futtasd:

```bash
cd C:\Users\laszl\Projects\magyar-discord-bot
node bot.js
```

## 📋 Parancsok

### 🎮 Számoló Játék
- `!szamol start` - Számoló játék indítása ebben a csatornában
- `!szamol stop` - Számoló játék leállítása
- `!szamol stat` - Saját statisztikád megtekintése
- `!szamol toplista` - Ranglista megtekintése

**Hogyan működik:**
- A játékosok sorban számolnak (1, 2, 3, 4...)
- Ha valaki rossz számot ír, a bot figyelmezteti és újra kezdődik
- Statisztika követi ki hányszor hibázott és hányszor talált el

### 🔧 Moderáció
- `!kick @felhasználó` - Felhasználó kirúgása
- `!ban @felhasználó` - Felhasználó kitiltása
- `!mute @felhasználó` - Felhasználó némítása (10 perc)
- `!warn @felhasználó` - Figyelmeztetés küldése

### 🎲 Játékok
- `!kocka [szám]` - Kockadobás (alapból 6 oldal)
- `!kviz` - Kvízkérdés (15 másodperced válaszolni!)
- `!trivia` - Trivia kérdés

### 📊 Egyéb
- `!szavazas [szöveg]` - Szavazás indítása 👍/👎 reakciókkal
- `!info` - Szerver információk megtekintése
- `!ping` - Bot válaszideje
- `!help` - Összes parancs listázása

## 🎉 Extra funkciók
- **Üdvözlő üzenet** - Új tagoknak automatikus üdvözlő üzenet
- **Statisztika** - Számoló játékhoz pontszám követés

## 📝 Megjegyzések
- A bot token a `.env` fájlban van tárolva
- Minden parancs `!` prefix-szel működik
- Moderációs parancsokhoz jogosultság kell

## Hibaelhárítás
Ha a bot nem indul:
1 Ellenőrizd, hogy a token helyes-e
2. Győződj meg róla, hogy fut az `npm install`
3. Nézd meg a konzol hibaüzeneteit

---

**Készítette:** Claude Code 🤖
