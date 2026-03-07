# 🚗 ParkSense — מדריך התקנה מלא

## מה האפליקציה עושה?
- **מזהה אוטומטית** מתי אתה נוסע / הולך / עומד — לפי GPS ותאוצה
- **שומר חניה אוטומטית** כשאתה עוצר אחרי נסיעה
- **שמירה ידנית** של מיקום חניה בלחיצה
- **ניווט לחניה** — פותח Google Maps ישירות
- **היסטוריה** של כל הנסיעות וחניות בענן
- **סטטיסטיקות** — מהירות ממוצעת, זמן נסיעה, וכו'

---

## שלב 1 — MongoDB Atlas (חינמי לנצח)

1. היכנס ל: **https://cloud.mongodb.com**
2. צור חשבון חינמי (Google login עובד)
3. לחץ **"Build a Database"** → בחר **Free** (M0)
4. בחר Region קרוב (Europe recommended)
5. צור Username + Password → שמור אותם!
6. ב-Network Access → לחץ **"Add IP Address"** → **"Allow Access from Anywhere"** (0.0.0.0/0)
7. לחץ **"Connect"** → **"Drivers"** → תקבל URI כזה:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/parksense?retryWrites=true&w=majority
   ```

---

## שלב 2 — GitHub (לצורך Render.com)

1. היכנס ל: **https://github.com** → צור חשבון אם אין
2. לחץ **"New Repository"** → שם: `parksense`
3. העלה את כל הקבצים לריפו:
   - תיקיית `server/` (עם index.js, package.json)
   - תיקיית `public/` (עם index.html)
   - קובץ `render.yaml`

---

## שלב 3 — Render.com (אחסון חינמי)

1. היכנס ל: **https://render.com** → צור חשבון
2. לחץ **"New +"** → **"Web Service"**
3. חבר את ה-GitHub repository שלך
4. הגדרות:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. ב-Environment Variables הוסף:
   - `MONGODB_URI` = ה-URI מ-MongoDB Atlas
6. לחץ **"Create Web Service"**
7. תוך 2-3 דקות תקבל URL כזה: `https://parksense-xxxx.onrender.com`

---

## שלב 4 — הפעלת האפליקציה בטלפון

1. פתח את הקובץ `public/index.html` בדפדפן Chrome אנדרואיד
   - **או** פתח את כתובת ה-Render שלך בדפדפן
2. לחץ **"התחל ואפשר גישה"**
3. אפשר הרשאת מיקום (**"Always allow"** לעבודה ברקע!)
4. עבור לטאב **⚙️ הגדרות**:
   - הכנס את ה-URL של Render: `https://parksense-xxxx.onrender.com`
   - הכנס שם משתמש (ברירת מחדל: `default`)
5. לחץ **"שמור הגדרות"**

---

## שלב 5 — הוסף כ-PWA (כמו אפליקציה אמיתית)

בChrome אנדרואיד:
1. פתח את כתובת האתר
2. לחץ **3 נקודות** (תפריט) → **"הוסף למסך הבית"**
3. האפליקציה תופיע כאפליקציה רגילה!

---

## הבחנה בין מצבים

| מהירות | מצב |
|--------|-----|
| > 15 קמ"ש | 🚗 נסיעה |
| 2-15 קמ"ש | 🚶 הליכה |
| < 2 קמ"ש | 😴 נייח |

ניתן לשנות את הסף ב-הגדרות.

---

## פתרון בעיות

**GPS לא עובד?**
- ודא שנתת הרשאה "Always Allow" (תמיד)
- בChrome: Settings → Site Settings → Location

**השרת לא מגיב?**
- Render.com Free tier "נרדם" אחרי 15 דקות של חוסר פעילות
- הבקשה הראשונה עשויה לקחת 30-50 שניות להתעורר
- פתרון: הגדר UptimeRobot (חינמי) לping כל 10 דקות

**UptimeRobot (שמור שרת ער):**
1. https://uptimerobot.com → חשבון חינמי
2. New Monitor → HTTP → URL: `https://parksense-xxxx.onrender.com/api/health`
3. Interval: 5 minutes

---

## מבנה הקבצים

```
parksense/
├── server/
│   ├── index.js          ← שרת Express + MongoDB
│   ├── package.json
│   └── .env.example      ← העתק ל-.env מקומי
├── public/
│   └── index.html        ← כל האפליקציה
└── render.yaml           ← הגדרות Render.com
```

---

**נבנה עם ❤️ ו-Claude**
