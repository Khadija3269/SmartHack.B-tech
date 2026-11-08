import { createContext, useContext, useEffect, useState } from "react";
import { AR } from "./i18n/ar.js";
import { FR } from "./i18n/fr.js";
import { translate, DICTIONARIES } from "./i18n/index.js";
import { setAutoTranslation } from "./i18n/autoTranslate.js";
const SYS_KEY = "smarthack_settings_system";
const defaults = { theme: "light", language: "English" };
const PreferencesContext = createContext(null);
// Minimal dictionary — common UI strings used across pages.
const dict = {
  English: {},
  Arabic: {
    ...AR,
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
    "About Us": "من نحن",
    "Dashboard": "لوحة التحكم",
    "History": "السجل",
    "Mark all read": "تحديد الكل كمقروء",
    "No notifications": "لا توجد إشعارات",
    "Dismiss all": "حذف الكل",
    "Log in": "تسجيل الدخول",
    "Log out": "تسجيل الخروج",
    "Manage Hackathons": "إدارة الهاكاثونات",
    "With Ease": "بسهولة",
    "Explore hackathons, build teams, submit solutions, and compete with innovators — all in one place.": "استكشف الهاكاثونات، وأنشئ الفرق، وقدّم الحلول، وتنافس مع المبتكرين — كل ذلك في مكان واحد.",
    "Admin Login": "دخول المسؤول",
    "Register": "إنشاء حساب",
    "Already have an account?": "لديك حساب بالفعل؟",
    "Log in": "تسجيل الدخول",
    "Enter your email": "أدخل بريدك الإلكتروني",
    "Enter your password": "أدخل كلمة المرور",
    "Forget Password?": "نسيت كلمة المرور؟",
    "Already have an account?": "لديك حساب بالفعل؟",
    "Register now": "سجل الآن",
    "Email and password are required.": "البريد الإلكتروني وكلمة المرور مطلوبان.",
    "Please enter a valid email address.": "يرجى إدخال بريد إلكتروني صحيح.",
    "Login failed.": "فشل تسجيل الدخول.",
    "Registration": "إنشاء حساب",
    "Full Name": "الاسم الكامل",
    "Email Address": "البريد الإلكتروني",
    "Suggest": "اقتراح",
    "Min 8 chars, with upper, lower, number & symbol.": "8 أحرف على الأقل، تشمل حرفًا كبيرًا وصغيرًا ورقمًا ورمزًا.",
    "Confirm Password": "تأكيد كلمة المرور",
    "Participant": "مشارك",
    "Judge": "محكّم",
    "Organizer": "منظّم",
    "Mentor": "مرشد",
    "Admin": "مسؤول",
    "Organization": "المؤسسة",
    "Sultan Qaboos University": "جامعة السلطان قابوس",
    "GUtech": "الجامعة الألمانية للتكنولوجيا",
    "UTAS": "جامعة التقنية والعلوم التطبيقية",
    "Middle East College": "كلية الشرق الأوسط",
    "Other": "أخرى",
    "As a": "بصفتك",
    ", please tell us about yourself.": "، يرجى إخبارنا عن نفسك.",
    "Your request will be reviewed by an existing admin before you can access the platform.": "سيتم مراجعة طلبك من قبل مسؤول حالي قبل السماح لك بالدخول إلى المنصة.",
    "Your account will be reviewed by an admin.": "سيتم مراجعة حسابك من قبل مسؤول.",
    "Short Bio": "نبذة مختصرة",
    "Experience": "الخبرة",
    "Past hackathons, relevant work, expertise…": "الهاكاثونات السابقة، الأعمال ذات الصلة، الخبرات…",
    "Why do you want to become an admin?": "لماذا تريد أن تصبح مسؤولاً؟",
    "Why do you want to join as a": "لماذا تريد الانضمام بصفتك",
    "Categories you will organize (pick at least one)": "الفئات التي ستنظمها (اختر فئة واحدة على الأقل)",
    "You will only be able to manage hackathons in these categories. An admin can change this later.": "ستتمكن فقط من إدارة الهاكاثونات ضمن هذه الفئات. ويمكن للمسؤول تغيير ذلك لاحقاً.",
    "Upload CV (PDF / DOC, max 5 MB)": "ارفع سيرتك الذاتية (PDF / DOC، بحد أقصى 5 ميجابايت)",
    "Submitting…": "جارٍ التسجيل…",
    "Log In": "تسجيل الدخول",
    "CV must be under 5 MB.": "يجب أن يكون حجم السيرة الذاتية أقل من 5 ميجابايت.",
    "Please fill in all required fields.": "يرجى تعبئة جميع الحقول المطلوبة.",
    "Please enter a valid email address.": "يرجى إدخال بريد إلكتروني صحيح.",
    "Password must be at least 8 characters.": "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.",
    "Password must include an uppercase letter.": "يجب أن تحتوي كلمة المرور على حرف كبير.",
    "Password must include a lowercase letter.": "يجب أن تحتوي كلمة المرور على حرف صغير.",
    "Password must include a number.": "يجب أن تحتوي كلمة المرور على رقم.",
    "Password must include a symbol.": "يجب أن تحتوي كلمة المرور على رمز.",
    "Passwords do not match.": "كلمتا المرور غير متطابقتين.",
    "Please fill in your bio, experience and reason.": "يرجى تعبئة النبذة والخبرة وسبب التقديم.",
    "Please upload your CV (PDF / DOC).": "يرجى رفع سيرتك الذاتية (PDF / DOC).",
    "Please select at least one category you will organize.": "يرجى اختيار فئة واحدة على الأقل لتنظيمها.",
    "Application submitted! Your account will be reviewed by": "تم إرسال الطلب! ستتم مراجعة حسابك من قبل",
    "an existing admin": "مسؤول حالي",
    "an admin": "مسؤول",
    "before you can sign in.": "قبل أن تتمكن من تسجيل الدخول.",
    "Registration failed.": "فشل التسجيل.",
    "About": "من نحن",
    "Our goal is to make hackathon management easier by providing a centralized platform for organizers, participants, judges, and mentors, while supporting innovation and collaboration in Oman.": "هدفنا هو تسهيل إدارة الهاكاثونات من خلال توفير منصة مركزية للمنظمين والمشاركين والمحكمين والمرشدين، مع دعم الابتكار والتعاون في سلطنة عُمان.",
    "Through SmartHack, we aim to provide a simple and efficient system where users can register, form teams, submit projects, and evaluate ideas—all in one place. Our platform encourages creativity, teamwork, and fair evaluation, helping hackathons reach their full potential.": "من خلال SmartHack، نسعى إلى توفير نظام بسيط وفعال يتيح للمستخدمين التسجيل وتكوين الفرق وتقديم المشاريع وتقييم الأفكار في مكان واحد. تشجع منصتنا الإبداع والعمل الجماعي والتقييم العادل، مما يساعد الهاكاثونات على تحقيق كامل إمكاناتها.",
    "Social Media": "وسائل التواصل الاجتماعي",
    "Announcements": "الإعلانات",
    "Highlights from our official social media accounts and hackathon updates.": "أبرز المنشورات من حساباتنا الرسمية على وسائل التواصل الاجتماعي وآخر تحديثات الهاكاثون.",
    "2 hours ago": "قبل ساعتين",
    "Yesterday": "أمس",
    "2 days ago": "قبل يومين",
    "SmartHack Kickoff!": "انطلاق SmartHack!",
    "Build your teams and submit projects this Friday at Sultan Qaboos University.": "كوّنوا فرقكم وقدّموا مشاريعكم يوم الجمعة في جامعة السلطان قابوس.",
    "View on Instagram": "عرض على إنستغرام",
    "Judges Needed!": "نحتاج إلى محكمين!",
    "Help evaluate projects at the upcoming SmartHack event.": "ساهموا في تقييم المشاريع في فعالية SmartHack القادمة.",
    "View on X (Twitter)": "عرض على X (تويتر)",
    "Thanks Participants!": "شكراً للمشاركين!",
    "Over 50 innovative projects submitted — congrats to all!": "تم تقديم أكثر من 50 مشروعاً مبتكراً — تهانينا للجميع!",
    "View on Facebook": "عرض على فيسبوك",
    "Available Hackathons": "الهاكاثونات المتاحة",
"View Leaderboard": "عرض لوحة المتصدرين",
"Archived Hackathons": "الهاكاثونات المؤرشفة",
"Category:": "الفئة:",
"All categories": "جميع الفئات",
"hackathon": "هاكاثون",
"hackathons": "هاكاثونات",
"Search by title, theme, location, or category…": "ابحث حسب العنوان أو الموضوع أو الموقع أو الفئة…",
"No hackathons yet.": "لا توجد هاكاثونات حتى الآن.",
"No hackathons match your filters.": "لا توجد هاكاثونات تطابق عوامل التصفية.",
"Uncategorized": "غير مصنف",
"Theme:": "الموضوع:",
"Date:": "التاريخ:",
"View Details": "عرض التفاصيل",
  },
  French: {
    ...FR,
    "Available Hackathons": "Hackathons disponibles",
"View Leaderboard": "Voir le classement",
"Archived Hackathons": "Hackathons archivés",
"Category:": "Catégorie :",
"All categories": "Toutes les catégories",
"hackathon": "hackathon",
"hackathons": "hackathons",
"Search by title, theme, location, or category…": "Rechercher par titre, thème, lieu ou catégorie…",
"No hackathons yet.": "Aucun hackathon pour le moment.",
"No hackathons match your filters.": "Aucun hackathon ne correspond à vos filtres.",
"Uncategorized": "Non classé",
"Theme:": "Thème :",
"Date:": "Date :",
"View Details": "Voir les détails",
    "About": "À propos",
    "Our goal is to make hackathon management easier by providing a centralized platform for organizers, participants, judges, and mentors, while supporting innovation and collaboration in Oman.": "Notre objectif est de faciliter la gestion des hackathons en proposant une plateforme centralisée pour les organisateurs, les participants, les juges et les mentors, tout en soutenant l'innovation et la collaboration à Oman.",
    "Through SmartHack, we aim to provide a simple and efficient system where users can register, form teams, submit projects, and evaluate ideas—all in one place. Our platform encourages creativity, teamwork, and fair evaluation, helping hackathons reach their full potential.": "Avec SmartHack, nous souhaitons proposer un système simple et efficace permettant aux utilisateurs de s'inscrire, de former des équipes, de soumettre des projets et d'évaluer des idées au même endroit. Notre plateforme encourage la créativité, le travail d'équipe et une évaluation équitable.",
    "Social Media": "Réseaux sociaux",
    "Announcements": "Annonces",
    "Highlights from our official social media accounts and hackathon updates.": "Les moments forts de nos comptes officiels sur les réseaux sociaux et les dernières actualités des hackathons.",
    "2 hours ago": "Il y a 2 heures",
    "Yesterday": "Hier",
    "2 days ago": "Il y a 2 jours",
    "SmartHack Kickoff!": "Lancement de SmartHack !",
    "Build your teams and submit projects this Friday at Sultan Qaboos University.": "Formez vos équipes et soumettez vos projets ce vendredi à l'Université Sultan Qaboos.",
    "View on Instagram": "Voir sur Instagram",
    "Judges Needed!": "Nous recherchons des juges !",
    "Help evaluate projects at the upcoming SmartHack event.": "Aidez à évaluer les projets lors du prochain événement SmartHack.",
    "View on X (Twitter)": "Voir sur X (Twitter)",
    "Thanks Participants!": "Merci aux participants !",
    "Over 50 innovative projects submitted — congrats to all!": "Plus de 50 projets innovants ont été soumis — félicitations à tous !",
    "View on Facebook": "Voir sur Facebook",
    "Registration": "Inscription",
    "Full Name": "Nom complet",
    "Email Address": "Adresse e-mail",
    "Suggest": "Suggérer",
    "Min 8 chars, with upper, lower, number & symbol.": "8 caractères minimum, avec une majuscule, une minuscule, un chiffre et un symbole.",
    "Confirm Password": "Confirmer le mot de passe",
    "Participant": "Participant",
    "Judge": "Juge",
    "Organizer": "Organisateur",
    "Mentor": "Mentor",
    "Admin": "Administrateur",
    "Organization": "Établissement",
    "Sultan Qaboos University": "Université Sultan Qaboos",
    "GUtech": "Université allemande de technologie",
    "UTAS": "Université de technologie et des sciences appliquées",
    "Middle East College": "Middle East College",
    "Other": "Autre",
    "As a": "En tant que",
    ", please tell us about yourself.": ", veuillez nous parler de vous.",
    "Your request will be reviewed by an existing admin before you can access the platform.": "Votre demande sera examinée par un administrateur actuel avant que vous puissiez accéder à la plateforme.",
    "Your account will be reviewed by an admin.": "Votre compte sera examiné par un administrateur.",
    "Short Bio": "Courte biographie",
    "Experience": "Expérience",
    "Past hackathons, relevant work, expertise…": "Hackathons précédents, travaux pertinents et expertise…",
    "Why do you want to become an admin?": "Pourquoi souhaitez-vous devenir administrateur ?",
    "Why do you want to join as a": "Pourquoi souhaitez-vous rejoindre la plateforme en tant que",
    "Categories you will organize (pick at least one)": "Catégories que vous organiserez (choisissez-en au moins une)",
    "You will only be able to manage hackathons in these categories. An admin can change this later.": "Vous pourrez uniquement gérer les hackathons dans ces catégories. Un administrateur pourra modifier cela plus tard.",
    "Upload CV (PDF / DOC, max 5 MB)": "Télécharger votre CV (PDF / DOC, 5 Mo maximum)",
    "Submitting…": "Inscription en cours…",
    "Log In": "Se connecter",
    "CV must be under 5 MB.": "Le CV doit faire moins de 5 Mo.",
    "Please fill in all required fields.": "Veuillez remplir tous les champs obligatoires.",
    "Please enter a valid email address.": "Veuillez saisir une adresse e-mail valide.",
    "Password must be at least 8 characters.": "Le mot de passe doit contenir au moins 8 caractères.",
    "Password must include an uppercase letter.": "Le mot de passe doit contenir une lettre majuscule.",
    "Password must include a lowercase letter.": "Le mot de passe doit contenir une lettre minuscule.",
    "Password must include a number.": "Le mot de passe doit contenir un chiffre.",
    "Password must include a symbol.": "Le mot de passe doit contenir un symbole.",
    "Passwords do not match.": "Les mots de passe ne correspondent pas.",
    "Please fill in your bio, experience and reason.": "Veuillez remplir votre biographie, votre expérience et votre motivation.",
    "Please upload your CV (PDF / DOC).": "Veuillez télécharger votre CV (PDF / DOC).",
    "Please select at least one category you will organize.": "Veuillez sélectionner au moins une catégorie que vous organiserez.",
    "Application submitted! Your account will be reviewed by": "Candidature envoyée ! Votre compte sera examiné par",
    "an existing admin": "un administrateur actuel",
    "an admin": "un administrateur",
    "before you can sign in.": "avant que vous puissiez vous connecter.",
    "Registration failed.": "Échec de l'inscription.",
    "Enter your email": "Entrez votre adresse e-mail",
    "Enter your password": "Entrez votre mot de passe",
    "Forget Password?": "Mot de passe oublié ?",
    "Already have an account?": "Vous avez déjà un compte ?",
    "Register now": "Inscrivez-vous maintenant",
    "Email and password are required.": "L'e-mail et le mot de passe sont obligatoires.",
    "Please enter a valid email address.": "Veuillez saisir une adresse e-mail valide.",
    "Login failed.": "Échec de la connexion.",
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
    "Manage Hackathons": "Gérez les hackathons",
    "With Ease": "En toute simplicité",
    "Explore hackathons, build teams, submit solutions, and compete with innovators — all in one place.": "Explorez les hackathons, créez des équipes, soumettez des solutions et participez à la compétition avec des innovateurs — tout au même endroit.",
    "Admin Login": "Connexion administrateur",
    "Register": "S'inscrire",
    "Already have an account?": "Vous avez déjà un compte ?",
    "Log in": "Se connecter",
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
  root.lang = map[language] || "en";
  root.dir = language === "Arabic" ? "rtl" : "ltr";
}

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SYS_KEY) || "null");
      if (saved && saved.theme && saved.language) return { theme: saved.theme, language: saved.language };
    } catch { }
    return defaults;
  });

  // hydrate from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SYS_KEY) || "null");
      if (saved && saved.theme && saved.language) {
        setPrefs({ theme: saved.theme, language: saved.language });
      }
    } catch { }
  }, []);

  // apply side effects + persist
  useEffect(() => {
    applyTheme(prefs.theme);
    applyLanguage(prefs.language);
    // Translate everything on screen (all pages) when a non-English language is chosen.
    setAutoTranslation(DICTIONARIES[prefs.language] ? dict[prefs.language] : null);
  }, [prefs]);

  // sync across tabs / other components writing to SYS_KEY directly
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== SYS_KEY || !e.newValue) return;
      try {
        const saved = JSON.parse(e.newValue);
        if (saved?.theme && saved?.language) setPrefs(saved);
      } catch { }
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

  const t = (key) => dict[prefs.language]?.[key] ?? translate(prefs.language, key) ?? key;

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
      setTheme: () => { },
      setLanguage: () => { },
      t: (k) => k,
    };
  }
  return ctx;
}

