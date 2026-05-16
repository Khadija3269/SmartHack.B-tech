import { createContext, useContext, useEffect, useState } from "react";
const SYS_KEY = "smarthack_settings_system";
const defaults = { theme: "light", language: "English" };
const PreferencesContext = createContext(null);

// Minimal dictionary — common UI strings used across pages.
const dict = {
  English: {},
  Arabic: {
    Settings: "الإعدادات",
    Profile: "الملف الشخصي",
    Notifications: "الإشعارات",
    "System preferences": "تفضيلات النظام",
    Feedback: "ملاحظات",
    "Log out": "تسجيل الخروج",
    "Profile Settings": "إعدادات الملف الشخصي",
    Name: "الاسم",
    Email: "البريد الإلكتروني",
    Role: "الدور",
    Username: "اسم المستخدم",
    Password: "كلمة المرور",
    "Change password": "تغيير كلمة المرور",
    "Delete Account": "حذف الحساب",
    "Account info": "معلومات الحساب",
    "System Notifications": "إشعارات النظام",
    "Email alerts": "تنبيهات البريد",
    "System Preferences": "تفضيلات النظام",
    "Theme:": "السمة:",
    "Language:": "اللغة:",
    "Light Mode": "الوضع الفاتح",
    "Dark Mode": "الوضع الداكن",
    English: "الإنجليزية",
    Arabic: "العربية",
    French: "الفرنسية",
    "We appreciate your feedback.": "نقدر ملاحظاتك.",
    "Submit My Feedback": "إرسال ملاحظاتي",
    Home: "الرئيسية",
    About: "حول",
    Hackathons: "الهاكاثونات",
    Login: "تسجيل الدخول",
    Register: "تسجيل",
    Save: "حفظ",
    Edit: "تعديل",
  },
  French: {
    Settings: "Paramètres",
    Profile: "Profil",
    Notifications: "Notifications",
    "System preferences": "Préférences système",
    Feedback: "Commentaires",
    "Log out": "Se déconnecter",
    "Profile Settings": "Paramètres du profil",
    Name: "Nom",
    Email: "E-mail",
    Role: "Rôle",
    Username: "Nom d'utilisateur",
    Password: "Mot de passe",
    "Change password": "Changer le mot de passe",
    "Delete Account": "Supprimer le compte",
    "Account info": "Infos du compte",
    "System Notifications": "Notifications système",
    "Email alerts": "Alertes e-mail",
    "System Preferences": "Préférences système",
    "Theme:": "Thème :",
    "Language:": "Langue :",
    "Light Mode": "Mode clair",
    "Dark Mode": "Mode sombre",
    English: "Anglais",
    Arabic: "Arabe",
    French: "Français",
    "We appreciate your feedback.": "Nous apprécions vos commentaires.",
    "Submit My Feedback": "Envoyer mes commentaires",
    Home: "Accueil",
    About: "À propos",
    Hackathons: "Hackathons",
    Login: "Connexion",
    Register: "S'inscrire",
    Save: "Enregistrer",
    Edit: "Modifier",
  },
};

function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  root.dataset.theme = theme;
}

function applyLanguage(language) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const map = { English: "en", Arabic: "ar", French: "fr" };
  root.lang = map[language];
  root.dir = language === "Arabic" ? "rtl" : "ltr";
}

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(defaults);

  // hydrate from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SYS_KEY) || "null");
      if (saved && saved.theme && saved.language) {
        setPrefs({ theme: saved.theme, language: saved.language });
      }
    } catch {}
  }, []);

  // apply side effects + persist
  useEffect(() => {
    applyTheme(prefs.theme);
    applyLanguage(prefs.language);
  }, [prefs]);

  // sync across tabs / other components writing to SYS_KEY directly
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== SYS_KEY || !e.newValue) return;
      try {
        const saved = JSON.parse(e.newValue);
        if (saved?.theme && saved?.language) setPrefs(saved);
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = (theme) => {
    const next = { ...prefs, theme };
    setPrefs(next);
    localStorage.setItem(SYS_KEY, JSON.stringify(next));
  };
  const setLanguage = (language) => {
    const next = { ...prefs, language };
    setPrefs(next);
    localStorage.setItem(SYS_KEY, JSON.stringify(next));
  };

  const t = (key) => dict[prefs.language]?.[key] ?? key;

  return (
    <PreferencesContext.Provider value={{ ...prefs, setTheme, setLanguage, t }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    // safe fallback if used outside provider (e.g. during SSR shell)
    return {
      theme: "light",
      language: "English",
      setTheme: () => {},
      setLanguage: () => {},
      t: (k) => k,
    };
  }
  return ctx;
}
