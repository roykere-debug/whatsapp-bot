# פקודות לעדכון הקוד ב-Railway

## שלב 1: בדוק את הסטטוס של Git
```bash
git status
```

## שלב 2: הוסף את כל השינויים
```bash
git add -A
```

## שלב 3: צור commit עם הודעה
```bash
git commit -m "Fix Safe Mode, improve error handling, and prevent crashes"
```

## שלב 4: דחוף ל-GitHub
```bash
git push
```

## שלב 5: בדוק ב-Railway
1. פתח את ה-dashboard של Railway
2. בדוק שה-deployment החדש רץ
3. בדוק את הלוגים

## אם יש בעיה עם Git Push (אימות):
אם Git מבקש username/password, יש שתי אפשרויות:

### אפשרות 1: Personal Access Token
1. צור token ב-GitHub: https://github.com/settings/tokens
2. כשמבקשים password, השתמש ב-token

### אפשרות 2: SSH (מומלץ)
```bash
# שנה את ה-remote ל-SSH
git remote set-url origin git@github.com:roykere-debug/whatsapp-bot.git

# נסה שוב
git push
```

## בדיקה שהכל עובד:
```bash
# בדוק שהקוד מקומפל
npm run build

# בדוק שהקוד תקין
node -c dist/index.js
```
