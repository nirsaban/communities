/// Hebrew-only string table.
///
/// We intentionally skip flutter_localizations/ARB for now — the spec calls for
/// EN + Hebrew at launch, but the client has been scoped to Hebrew-only.
/// When/if English returns, swap this file for an intl-generated lookup.
class S {
  S._();

  // App
  static const appTitle = 'קהילה';

  // Common
  static const required = 'שדה חובה';
  static const cancel = 'ביטול';
  static const save = 'שמירה';
  static const retry = 'נסה שוב';
  static const loading = 'טוען...';
  static const close = 'סגור';
  static const confirm = 'אשר';

  // Auth — labels
  static const email = 'דוא"ל';
  static const password = 'סיסמה';
  static const newPassword = 'סיסמה חדשה';
  static const confirmPassword = 'אישור סיסמה';
  static const name = 'שם';
  static const fullName = 'שם מלא';
  static const username = 'שם משתמש';
  static const resetToken = 'אסימון איפוס';
  static const otpCode = 'קוד אימות';
  static const next = 'המשך';
  static const skip = 'דלג';
  static const back = 'חזרה';
  static const verify = 'אמת';
  static const updatePassword = 'עדכן סיסמה';
  static const checkInbox = 'בדוק את תיבת הדואר';
  static const sendResetCta = 'שלח קישור איפוס';
  static const backToLogin = 'חזרה להתחברות';
  static const resendIn = 'שלח שוב בעוד';
  static const resendNow = 'שלח שוב';
  static const tagline = 'הקהילה שלך, בכיס';
  static String stepOfN(int current, int total) => 'שלב $current מתוך $total';
  static const profileSetupTitle = 'בואו נכיר';
  static const interestsTitle = 'מה מעניין אותך?';
  static const interestsBody = 'בחר לפחות 3 נושאים כדי שנמליץ לך על אירועים מתאימים.';
  static String interestsSelectedCount(int n) =>
      n == 0 ? 'בחר תחומי עניין' : 'נבחרו $n';
  static const passwordsMustMatch = 'הסיסמאות אינן תואמות';
  static const termsLabel = 'אני מסכים לתנאי השימוש ולמדיניות הפרטיות';
  static const continueCta = 'המשך';
  static const continueWithGoogle = 'המשך עם Google';
  static const continueWithApple = 'המשך עם Apple';
  static const orSeparator = 'או';
  static const verifyEmailTitle = 'אימות הדוא"ל';
  static String verifyEmailBody(String email) =>
      'שלחנו קוד בן 6 ספרות אל $email. הזן אותו כאן.';
  static const forgotTitle = 'איפוס סיסמה';
  static const forgotBody =
      'הכנס את כתובת הדוא"ל שלך ונשלח לך קישור איפוס.';
  static const resetSentTitle = 'בדוק את הדוא"ל';
  static const resetSentBody = 'אם החשבון קיים, אימייל יישלח עם הוראות.';
  static const onboardingSlide1Title = 'מצא את הקהילה שלך';
  static const onboardingSlide1Body =
      'הצטרף לקהילות שמדברות אליך — לימוד, ספורט, התנדבות ועוד.';
  static const onboardingSlide2Title = 'אירועים ללא חיכוך';
  static const onboardingSlide2Body =
      'גלה אירועים, אשר נוכחות, ושמור על עדכניות עם תזכורות חכמות.';
  static const onboardingSlide3Title = 'הקול שלך נחשב';
  static const onboardingSlide3Body =
      'הצעה ליוזמה, שיחה בקהילה, מענה לשאלות — כל זה במקום אחד.';

  // Auth — screens
  static const signIn = 'התחברות';
  static const signInTitle = 'התחברות לחשבון';
  static const signInCta = 'התחבר';
  static const signOut = 'התנתקות';
  static const forgotPassword = 'שכחת סיסמה?';
  static const noAccountSignUp = 'אין לך חשבון? הרשמה';
  static const createAccount = 'יצירת חשבון';
  static const createAccountCta = 'צור חשבון';
  static const resetPassword = 'איפוס סיסמה';
  static const resetPasswordCta = 'אפס סיסמה';
  static const setNewPassword = 'הגדר סיסמה חדשה';
  static const sendResetEmail = 'שלח אימייל לאיפוס';
  static const haveResetToken = 'יש לי כבר אסימון איפוס';
  static const passwordResetSent =
      'אם החשבון קיים, אימייל לאיפוס סיסמה נשלח אליו.';
  static const passwordResetDone = 'הסיסמה אופסה. אנא התחבר.';

  // Validators
  static const emailRequired = 'יש להזין דוא"ל';
  static const emailInvalid = 'יש להזין דוא"ל תקין';
  static const passwordRequired = 'יש להזין סיסמה';
  static const passwordMinChars = 'לפחות 8 תווים';
  static const passwordNeedsLetter = 'נדרשת אות אנגלית';
  static const passwordNeedsDigit = 'נדרש לפחות ספרה אחת';
  static const passwordHelper = 'לפחות 8 תווים, אות וספרה';
  static const nameRequired = 'יש להזין שם';
  static const tokenRequired = 'יש להזין אסימון';

  // Home
  static const home = 'בית';
  static const welcome = 'ברוכים הבאים';
  static String welcomeUser(String name) => 'שלום, $name';
  static String greetingFor(String name) => 'שלום, $name';
  static const noCommunities = 'אינך חבר בקהילה כלשהי עדיין.';
  static String communitiesCount(int n) => 'קהילות: $n';
  static const happeningSoon = 'בקרוב';
  static const seeAll = 'הצג הכל';
  static const inYourCommunity = 'מהקהילה שלך';
  static const announcementPinned = 'הודעה מוצמדת';
  static const noCommunityYet = 'עדיין אין לך קהילה';
  static const noCommunityYetBody =
      'מצא קהילה שמתאימה לך כדי שנוכל להציג כאן את הפיד.';
  static const exploreCommunities = 'גלה קהילות';
  static const emptyHomeHeadline = 'הפיד שלך ייטען בקרוב';
  static const emptyHomeBody =
      'ברגע שיתחילו אירועים ופוסטים בקהילה שלך, הם יופיעו כאן.';

  // Events
  static const events = 'אירועים';
  static const eventsUpcoming = 'הקרובים';
  static const eventsPast = 'שעברו';
  static const eventsAll = 'הכל';
  static const eventFilterAll = 'הכל';
  static const eventFilterFree = 'חינם';
  static const eventFilterPaid = 'בתשלום';
  static const eventFilterOnline = 'אונליין';
  static const eventFilterInPerson = 'פנים אל פנים';
  static const eventsEmptyHeadline = 'אין עדיין אירועים';
  static const eventsEmptyBody =
      'נעדכן אותך ברגע שהקהילה תפרסם אירוע חדש.';
  static const notifyMe = 'הודיעו לי';
  static const calendar = 'יומן';
  static const list = 'רשימה';
  static const aboutEvent = 'על האירוע';
  static const speakers = 'מרצים';
  static const location = 'מיקום';
  static const dateAndTime = 'תאריך ושעה';
  static const eventCancelled = 'האירוע בוטל';
  static const eventCompleted = 'הסתיים';
  static const eventDraft = 'טיוטה';
  static const soldOut = 'אזל המקום';
  static String capacityProgress(int filled, int total) => '$filled / $total';
  static String waitingCount(int n) => '$n ברשימת המתנה';
  static const rsvpFree = 'אישור הגעה';
  static const rsvpPaid = 'הרשמה לתשלום';
  static const rsvpJoinWaitlist = 'הצטרף לרשימת המתנה';
  static const rsvpAttending = 'אתה רשום';
  static const rsvpCancel = 'ביטול הרשמה';
  static const rsvpExternal = 'הרשמה באתר חיצוני';
  static const rsvpSubscriptionOnly = 'דורש מנוי פעיל';
  static const rsvpFailed = 'ההרשמה נכשלה. נסה שוב.';
  static const rsvpCheckoutOpening = 'פותח את מסך התשלום...';
  static const rsvpCancelled = 'ההרשמה בוטלה.';

  // RSVP confirmation
  static const rsvpConfirmedTitle = 'אתה רשום!';
  static const rsvpConfirmedBody = 'שמרנו לך מקום באירוע.';
  static const addToCalendar = 'הוסף ליומן';
  static const shareEvent = 'שתף';
  static const inviteFriend = 'הזמן חבר';

  // Waitlist
  static const waitlistJoinedTitle = 'אתה ברשימת ההמתנה';
  static String waitlistPositionBody(int n) =>
      'מקום #$n בתור. נשלח לך הודעה ברגע שיתפנה מקום.';
  static const waitlistNotifyNote =
      'יהיו לך שעתיים לאשר את המקום ברגע שיתפנה.';
  static const gotIt = 'הבנתי';

  // Full-capacity variant
  static const fullCapacityTitle = 'האירוע מלא';
  static const fullCapacityBody =
      'הצטרף לרשימת ההמתנה ונודיע לך ברגע שיתפנה מקום.';

  // Payments
  static const payments = 'תשלומים';
  static const payNow = 'שלם עכשיו';
  static const checkoutOpening = 'פותח מסך תשלום מאובטח...';
  static const checkoutOpenedExternally =
      'הופנית לדף תשלום של Stripe. חזור לאפליקציה לאחר התשלום.';
  static const checkoutOpenFailed = 'לא ניתן לפתוח את דף התשלום.';
  static const subscriptions = 'מנויים';
  static const mySubscriptions = 'המנויים שלי';
  static const noActiveSubscriptions = 'אין לך מנוי פעיל.';
  static const subscribeMonthly = 'מנוי חודשי';
  static const subscribeAnnual = 'מנוי שנתי';
  static const cancelSubscription = 'ביטול מנוי';
  static const cancelSubscriptionTitle = 'ביטול המנוי';
  static const cancelSubscriptionBody =
      'המנוי יישאר פעיל עד תום תקופת החיוב הנוכחית, ולאחר מכן יבוטל.';
  static const subscriptionCancelled = 'המנוי יבוטל בסוף תקופת החיוב.';
  static String planLabel(String plan) =>
      plan == 'monthly' ? 'חודשי' : (plan == 'annual' ? 'שנתי' : plan);
  static String statusLabel(String status) {
    switch (status) {
      case 'active':
        return 'פעיל';
      case 'past_due':
        return 'איחור בתשלום';
      case 'cancelled':
        return 'מבוטל';
      case 'incomplete':
        return 'לא הושלם';
      default:
        return status;
    }
  }

  // Financial dashboard
  static const financialDashboard = 'לוח כספים';
  static const totalRevenue = 'סך הכנסות';
  static const revenueThisMonth = 'החודש';
  static const revenueThisWeek = 'השבוע';
  static const activeSubscriptionsLabel = 'מנויים פעילים';
  static const revenueByEvent = 'הכנסות לפי אירוע';
  static const paidCount = 'משלמים';
  static const noFinancialData = 'אין עדיין נתונים כספיים.';

  // Initiatives
  static const initiatives = 'יוזמות';
  static const newInitiative = 'יוזמה חדשה';
  static const initiativeTitle = 'כותרת היוזמה';
  static const initiativeDescription = 'תיאור';
  static const initiativeCategory = 'קטגוריה';
  static String initiativeCategoryLabel(String cat) {
    switch (cat) {
      case 'event':
        return 'אירוע';
      case 'volunteer':
        return 'התנדבות';
      case 'product':
        return 'מוצר';
      case 'social':
        return 'חברתי';
      default:
        return 'אחר';
    }
  }
  static String initiativeStatusLabel(String status) {
    switch (status) {
      case 'draft':
        return 'טיוטה';
      case 'submitted':
        return 'הוגשה';
      case 'under_review':
        return 'בבדיקה';
      case 'approved':
        return 'מאושרת';
      case 'active':
        return 'פעילה';
      case 'completed':
        return 'הושלמה';
      case 'rejected':
        return 'נדחתה';
      default:
        return status;
    }
  }
  static const supportInitiative = 'אני בעניין';
  static const unsupportInitiative = 'ביטול תמיכה';
  static const submitInitiativeCta = 'הגש לבדיקה';
  static const noInitiatives = 'אין עדיין יוזמות בקהילה.';
  static String supportersCount(int n) => '$n תומכים';
  static const initiativeCreated = 'היוזמה נוצרה כטיוטה.';
  static const initiativeSubmittedMsg = 'היוזמה הוגשה לבדיקה.';
  static const writeComment = 'כתוב תגובה...';
  static const send = 'שלח';
  static const noComments = 'אין עדיין תגובות.';

  // Profile (C2a)
  static const profile = 'פרופיל';
  static const myProfile = 'הפרופיל שלי';
  static const editProfile = 'עריכת פרופיל';
  static const settings = 'הגדרות';
  static const profileBio = 'אודות';
  static const profileBioHint = 'ספר קצת על עצמך...';
  static const profileEmptyBio = 'עדיין לא הוספת אודות.';
  static const profileEmptyInterests = 'בחר תחומי עניין כדי שנמליץ לך על קהילות.';
  static const profileSaveSuccess = 'הפרופיל עודכן.';
  static const profileSaveFailed = 'שמירת הפרופיל נכשלה. נסה שוב.';
  static const profileMyRsvps = 'ההרשמות שלי';
  static const profileMyInitiatives = 'היוזמות שלי';
  static const profileMyCommunities = 'הקהילות שלי';
  static const profileNotifications = 'התראות';
  static const profileSettingsNotifications = 'הגדרות התראות';
  static const profileLogout = 'התנתקות';
  static String profileStatRsvps(int n) => '$n הרשמות';
  static String profileStatCommunities(int n) => '$n קהילות';
  static String profileStatInterests(int n) => '$n תחומי עניין';

  // Notifications (C2a)
  static const notifications = 'התראות';
  static const inbox = 'תיבה';
  static const inboxEmptyHeadline = 'אין לך התראות חדשות';
  static const inboxEmptyBody = 'נעדכן אותך כשמשהו חשוב יקרה.';
  static const inboxMarkAllRead = 'סמן הכל כנקרא';
  static const inboxMarkedAllRead = 'כל ההתראות סומנו כנקראות.';
  static const inboxGroupToday = 'היום';
  static const inboxGroupYesterday = 'אתמול';
  static const inboxGroupEarlier = 'קודם';
  static const notifPrefsTitle = 'התראות';
  static const notifPrefsHeaderPush = 'דחיפה';
  static const notifPrefsHeaderEmail = 'אימייל';
  static const notifPrefsSaved = 'ההעדפות נשמרו.';
  static const notifPrefsSaveFailed = 'שמירת ההעדפות נכשלה.';
  static const notifPrefsPushBanner = 'התראות דחיפה כבויות במכשיר. הפעל אותן בהגדרות המערכת.';
  static String notifPrefLabel(String key) {
    switch (key) {
      case 'events':
        return 'אירועים חדשים';
      case 'rsvp':
        return 'הרשמות ורשימות המתנה';
      case 'initiatives':
        return 'עדכוני יוזמות';
      case 'posts':
        return 'פוסטים ותגובות';
      case 'system':
        return 'הודעות מערכת';
      default:
        return key;
    }
  }

  // Communities (C2b)
  static const communities = 'קהילות';
  static const communitySwitcherTitle = 'החלף קהילה';
  static const switcherDiscoverMore = 'גלה עוד קהילות';
  static const discoveryTitle = 'גלה קהילות';
  static const discoveryInviteCode = 'הזן קוד הזמנה';
  static const discoveryRecommended = 'מומלצות בשבילך';
  static const discoveryEmptyHeadline = 'לא נמצאו קהילות חדשות';
  static const discoveryEmptyBody = 'נסה לחפש בשם או הזן קוד הזמנה.';
  static const discoveryJoin = 'הצטרף';
  static const discoveryRequest = 'בקש הצטרפות';
  static const discoveryJoined = 'הצטרפת לקהילה!';
  static const discoveryRequested = 'הבקשה נשלחה. נחכה לאישור.';
  static const discoveryJoinFailed = 'ההצטרפות נכשלה.';
  static const communityPrivacyPublic = 'ציבורית';
  static const communityPrivacyApplication = 'בקשת הצטרפות';
  static const communityPrivacyInvite = 'הזמנה בלבד';
  static String memberCountLabel(int n) => '$n חברים';
  static const welcomeContinue = 'המשך';
  static const rulesTitle = 'תקנון הקהילה';
  static const rulesAgreeLabel = 'קראתי ואני מסכים לתקנון';
  static const rulesAgreeCta = 'אישור';
  static const rulesAcked = 'תודה על האישור.';
  static const rulesAckFailed = 'שמירת האישור נכשלה.';
  static const rulesEmpty = 'לקהילה זו אין תקנון מוגדר.';
  static const myRsvpsTitle = 'ההרשמות שלי';
  static const myRsvpsEmptyHeadline = 'אין הרשמות פעילות';
  static const myRsvpsEmptyBody = 'כל אירוע שתאשר אליו הגעה יופיע כאן.';
  static String waitlistPositionShort(int n) => 'רשימת המתנה #$n';
  static const rsvpStatusGoing = 'מאושר';
  static const rsvpStatusWaitlist = 'רשימת המתנה';
  static const rsvpStatusPaid = 'שולם';

  // Account deletion (C2b)
  static const deleteAccountTitle = 'מחיקת חשבון';
  static const deleteAccountSummary =
      'מחיקת החשבון מסירה את הגישה לכל הקהילות שלך. יש חלון של 30 ימים לביטול לפני המחיקה הסופית.';
  static const deleteAccountConsequence1 = 'תאבד גישה לכל הקהילות והאירועים שלך';
  static const deleteAccountConsequence2 = 'התקפת RSVP פעילים יבוטלו';
  static const deleteAccountConsequence3 = 'מנויים פעילים יופסקו בסוף תקופת החיוב';
  static const deleteAccountConsequence4 = 'לאחר 30 ימים — הנתונים נמחקים ולא ניתן לשחזרם';
  static const deleteAccountTypeToConfirm = 'הקלד DELETE כדי לאשר';
  static const deleteAccountCta = 'מחק את החשבון שלי';
  static const deleteAccountKeep = 'השאר את החשבון';
  static String deleteAccountScheduled(DateTime when) =>
      'החשבון שלך מתוזמן למחיקה ב-${when.day}/${when.month}/${when.year}.';
  static const deleteAccountFailed = 'בקשת המחיקה נכשלה. נסה שוב.';

  // Payments + subscriptions (C3)
  static const plansTitle = 'בחר את התוכנית שלך';
  static const planMonthly = 'חודשי';
  static const planAnnual = 'שנתי';
  static String planMonthlyPrice() => '\$12 / חודש';
  static String planAnnualPrice() => '\$120 / שנה';
  static const planAnnualSavings = 'חיסכון של חודשיים';
  static const planFeature1 = 'גישה לכל האירועים המנויים';
  static const planFeature2 = 'כניסה מוקדמת לרישום';
  static const planFeature3 = 'תמיכה בחברי הקהילה';
  static const planFeature4 = 'ביטול בכל עת';
  static const subscribeCta = 'הצטרף לחברות';
  static const subscribeOpening = 'פותח את מסך התשלום...';

  static const checkoutTitle = 'תשלום';
  static const checkoutSummary = 'סיכום הזמנה';
  static const checkoutLineTicket = 'כרטיס לאירוע';
  static const checkoutLineProcessing = 'עמלת עיבוד';
  static const checkoutTotal = 'סה״כ לתשלום';
  static const checkoutSecuredBy = 'מאובטח על-ידי Stripe — נתוני הכרטיס לא נשמרים באפליקציה.';
  static const checkoutPay = 'שלם';
  static const checkoutOpenedSnack = 'פותח את מסך התשלום. חזור לאפליקציה לאחר התשלום.';

  static const paymentSuccessTitle = 'התשלום התקבל!';
  static const paymentSuccessBody = 'שמרנו לך מקום באירוע.';
  static const paymentSuccessReceipt = 'קבלה';
  static const paymentSuccessConfirming = 'מאמת מול Stripe...';
  static const paymentSuccessTimeoutHint = 'אם זה לוקח יותר ממספר רגעים, רענן את ההרשמות שלי.';
  static const viewMyRsvps = 'צפה בהרשמות שלי';
  static const paymentReturnDone = 'סיום';

  static const paymentFailedTitle = 'התשלום נכשל';
  static const paymentFailedBody = 'לא חויבת. שמרנו לך את המקום ל-10 דקות.';
  static const paymentFailedTryAgain = 'נסה שוב';
  static const paymentFailedDifferentCard = 'אמצעי תשלום אחר';
  static const paymentFailedReason = 'סיבה';

  static const membershipTitle = 'החברות שלי';
  static const membershipNoPlans = 'אין לך מנוי פעיל.';
  static const membershipExplorePlans = 'הצג תוכניות';
  static const membershipRenewsOn = 'מתחדש ב-';
  static const membershipEndsOn = 'תוקף עד ';
  static const membershipBillingHistory = 'היסטוריית חיובים';
  static const membershipUpdatePayment = 'עדכן אמצעי תשלום';
  static const membershipCancelLink = 'ביטול חברות';

  static const cancelMembershipTitle = 'ביטול חברות';
  static const cancelMembershipBody = 'תשמור גישה עד סוף תקופת החיוב הנוכחית.';
  static const cancelLoseCard = 'מה תפסיד';
  static const cancelLose1 = 'גישה לכל האירועים המנויים';
  static const cancelLose2 = 'כניסה מוקדמת לרישום';
  static const cancelLose3 = 'הגנת חברות נוספת';
  static const cancelKeep = 'השאר את החברות שלי';
  static const cancelAnyway = 'בטל בכל זאת';
  static const cancelScheduled = 'הביטול נקבע לסוף תקופת החיוב.';

  static const refundTitle = 'ההחזר התקבל';
  static const refundCardLabel = 'פרטי החזר';
  static const refundAmount = 'סכום';
  static const refundReference = 'מספר אסמכתה';
  static const refundArrives = 'יגיע לכרטיס שלך תוך 5–10 ימי עסקים.';
  static const refundDone = 'סגור';

  // Event manager (C4)
  static const myEventsTitle = 'האירועים שלי';
  static const myEventsEmptyHeadline = 'אין לך אירועים לניהול';
  static const myEventsEmptyBody = 'אירועים שאתה מנהל יופיעו כאן.';
  static const commandCenter = 'מרכז ניהול';
  static const cmdAttendees = 'נרשמים';
  static const cmdMaterials = 'חומרים';
  static const cmdQa = 'שאלות ותשובות';
  static const cmdRecap = 'סיכום';
  static const cmdBroadcast = 'שליחת הודעה';
  static const kpiRsvps = 'הרשמות';
  static const kpiCheckedIn = 'נרשמו לכניסה';
  static const kpiWaitlist = 'רשימת המתנה';
  static const attendeesTitle = 'נרשמים';
  static const attendeesAll = 'הכל';
  static const attendeesGoing = 'מגיעים';
  static const attendeesCheckedIn = 'נרשמו';
  static const attendeesWaitlist = 'המתנה';
  static const attendeesEmpty = 'אין נרשמים עדיין.';
  static const attendeeCheckedIn = 'סומן ככניסה.';
  static const checkInAllCta = 'סמן הכל';
  static const checkInAllDone = 'כל המגיעים סומנו ככניסה.';
  static const materialsTitle = 'חומרי האירוע';
  static const materialsEmpty = 'אין עדיין חומרים.';
  static const materialsAdd = 'הוסף חומר';
  static const materialsUploadTitle = 'העלאת חומר';
  static const materialUrl = 'קישור לקובץ';
  static const materialFileType = 'סוג קובץ';
  static const materialDescription = 'תיאור';
  static const materialAttendeesOnly = 'גלוי רק לנרשמים';
  static const materialAdded = 'החומר נוסף.';
  static const materialAddFailed = 'הוספת החומר נכשלה.';
  static const qaTitle = 'שאלות ותשובות';
  static const qaEmpty = 'אין עדיין שאלות. שאל אחת!';
  static const qaAskHint = 'הקלד שאלה...';
  static const qaSend = 'שלח';
  static const qaAnsweredBy = 'נענה';
  static const qaPinned = 'מוצמד';
  static const qaResolved = 'נפתר';
  static const qaUnanswered = 'ממתינות לתשובה';
  static const qaManagementTitle = 'ניהול שאלות';
  static const qaAnswerCta = 'ענה';
  static const qaPinCta = 'הצמד';
  static const qaUnpinCta = 'בטל הצמדה';
  static const qaResolveCta = 'סמן כפתור';
  static const qaUnresolveCta = 'בטל';
  static const qaAnswerHint = 'הקלד תשובה...';
  static const qaQuestionRequired = 'יש להזין שאלה.';
  static const qaPosted = 'השאלה נשלחה.';
  static const qaAnswered = 'התשובה נשמרה.';
  static const recapTitle = 'סיכום האירוע';
  static const recapBody = 'תוכן הסיכום';
  static const recapBodyHint = 'איך עבר האירוע?';
  static const recapPhotos = 'תמונות';
  static const recapAddPhoto = 'הוסף תמונה (URL)';
  static const recapNotify = 'שלח הודעה למשתתפים';
  static const recapPublish = 'פרסם סיכום';
  static const recapPublished = 'הסיכום פורסם.';
  static const recapPublishFailed = 'פרסום הסיכום נכשל.';
  static const recapEmpty = 'הסיכום של האירוע יופיע כאן לאחר הפרסום.';
  static const recapAttendees = 'משתתפים';
  static const recapPhotosCount = 'תמונות';
  static const viewMaterialsCta = 'צפה בחומרים';
  static const eventCreateTitle = 'אירוע חדש';
  static const eventEditTitle = 'עריכת אירוע';
  static const eventPricingTitle = 'עריכת מחירים';
  static const eventTitleField = 'שם האירוע';
  static const eventDateField = 'תאריך (YYYY-MM-DD)';
  static const eventTimeField = 'שעה (HH:MM)';
  static const eventLocationField = 'מיקום';
  static const eventCapacityField = 'מקסימום משתתפים';
  static const eventWaitlistToggle = 'אפשר רשימת המתנה';
  static const eventPricingFree = 'חינם';
  static const eventPricingPaid = 'בתשלום';
  static const eventPricingSubscription = 'מנוי';
  static const eventPricingExternal = 'תשלום חיצוני';
  static const eventPriceField = 'מחיר (USD)';
  static const eventSubsIncluded = 'חינם למנויים';
  static const eventPublishCta = 'פרסם אירוע';
  static const eventSaveCta = 'שמור שינויים';
  static const eventCancelCta = 'בטל אירוע';
  static const eventCancelConfirm = 'בטל את האירוע? תישלח הודעה לכל הנרשמים.';
  static const eventCancelledToast = 'האירוע בוטל.';
  static const eventCreated = 'האירוע נוצר.';
  static const eventCreateFailed = 'יצירת האירוע נכשלה.';
  static const eventSaveFailed = 'שמירת השינויים נכשלה.';
  static const eventPricingLocked = 'מחירים נעולים — דורש הרשאת מנהל.';
  static const eventPricingIntegrityWarning = 'שינוי מחיר באירוע עם הרשמות עלול לדרוש החזרים ידניים.';
  static const draft = 'טיוטה';
  static const draftSave = 'שמור טיוטה';
  static const draftSaved = 'הטיוטה נשמרה.';
  static const broadcastSoon = 'שידור הודעות זמין בעדכון הבא.';

  // Sub-admin / admin (C5)
  static const subAdminOverviewTitle = 'מרכז מנהלים';
  static const limitedAdmin = 'מנהל משנה — ללא גישה כספית';
  static const revenueGuardBanner = 'מידע פיננסי חסום עבור מנהלי משנה. פנה למנהל הראשי.';
  static const kpiMembers = 'חברים';
  static const kpiUpcoming = 'אירועים קרובים';
  static const kpiPending = 'בקשות ממתינות';
  static const kpiFlagged = 'תכנים בעייתיים';
  static const adminActivity = 'פעילות אחרונה';
  static const analyticsTitle = 'אנליטיקות';
  static const analyticsTabGrowth = 'צמיחה';
  static const analyticsTabAttendance = 'נוכחות';
  static const analyticsTabMembers = 'חברים פעילים';
  static const attendanceRate = 'אחוז נוכחות';
  static const totalMembers = 'סך חברים';
  static const joined90d = 'הצטרפו ב-90 ימים';
  static const left90d = 'עזבו';
  static const net90d = 'נטו';
  static const bestTurnout = 'נוכחות גבוהה';
  static const worstTurnout = 'נוכחות נמוכה';
  static const leaderboardEmpty = 'אין עדיין מספיק פעילות.';
  static const approvalsTitle = 'בקשות חברות';
  static const approvalsEmpty = 'אין בקשות ממתינות.';
  static const applicantBio = 'פרטים נוספים';
  static const approve = 'אשר';
  static const reject = 'דחה';
  static const approvedToast = 'הבקשה אושרה.';
  static const rejectedToast = 'הבקשה נדחתה.';
  static const memberListTitle = 'חברי הקהילה';
  static const memberListSearchHint = 'חיפוש שם / אימייל';
  static const roleFilterAll = 'הכל';
  static const roleFilterAdmin = 'מנהלים';
  static const roleFilterSubadmin = 'מנהלי משנה';
  static const roleFilterEventMgr = 'אחראי אירועים';
  static const roleFilterMember = 'חברים';
  static const memberListEmpty = 'לא נמצאו חברים.';
  static const memberDetailTitle = 'פרופיל חבר';
  static const memberJoinedAt = 'הצטרפ/ה';
  static const memberEventsAttended = 'אירועים שהשתתפ/ה';
  static const memberPostsAuthored = 'פוסטים';
  static const memberInitiativesAuthored = 'יוזמות';
  static const memberSpendHidden = 'הוצאות חבר זמינות למנהל ראשי בלבד.';
  static const memberPromote = 'קדם להרשאות מנהל';
  static const memberSuspend = 'השעיה';
  static const memberRemove = 'הסר מהקהילה';
  static const moderationTitle = 'ניהול תכנים';
  static const moderationEmpty = 'אין כרגע תכנים לבדיקה.';
  static const modKeep = 'השאר';
  static const modWarn = 'הזהר';
  static const modRemove = 'הסר';
  static const modRemovedToast = 'התוכן הוסר.';
  static const modKeptToast = 'התוכן הושאר.';
  static const modWarnedToast = 'הופקה התראה (נרשם ביומן).';
  static const modHiddenBadge = 'הוסתר';
  static const initiativesPendingTitle = 'יוזמות לאישור';
  static const initiativesPendingEmpty = 'אין יוזמות הממתינות לאישור.';
  static const initiativeApproved = 'היוזמה אושרה.';
  static const initiativeRejected = 'היוזמה נדחתה.';
  static const initiativeRejectReason = 'סיבת הדחייה';
  static const broadcastTitle = 'שידור הודעה';
  static const broadcastTo = 'לכל הנרשמים לאירוע';
  static const broadcastMessageHint = 'מה לשלוח?';
  static const broadcastSchedule = 'תזמן לשליחה מאוחר יותר';
  static const broadcastChannels = 'ערוצים';
  static const broadcastChannelPush = 'דחיפה';
  static const broadcastChannelInbox = 'תיבה';
  static const broadcastChannelEmail = 'אימייל';
  static const broadcastSend = 'שלח';
  static String broadcastSent(int n) => 'נשלחו $n הודעות.';
  static const broadcastFailed = 'שליחת ההודעה נכשלה.';

  // Admin (C6)
  static const adminDashboardTitle = 'מרכז הקהילה';
  static const adminRevenue = 'הכנסות הקהילה';
  static const adminSetupTitle = 'הגדרת הקהילה';
  static String adminSetupStep(int i, int n) => 'שלב $i מתוך $n';
  static const wizardBasicsHeadline = 'יסודות הקהילה';
  static const wizardBasicsBody = 'שם הקהילה והתיאור שיופיע לחברים.';
  static const wizardBrandingHeadline = 'מיתוג';
  static const wizardBrandingBody = 'בחר צבעי מותג ולוגו.';
  static const wizardPrivacyHeadline = 'פרטיות';
  static const wizardPrivacyBody = 'מי יכול להצטרף לקהילה?';
  static const wizardExperienceHeadline = 'חוויית החבר';
  static const wizardExperienceBody = 'הודעת ברוכים-הבאים, תקנון, הגדרות ראשוניות.';
  static const wizardFirstEventHeadline = 'האירוע הראשון שלך';
  static const wizardFirstEventBody = 'הוסף אירוע פתיחה שיברך את החברים.';
  static const wizardInviteHeadline = 'הזמן את החברים';
  static const wizardInviteBody = 'הזן רשימת מיילים לשליחת הזמנות.';
  static const wizardNext = 'הבא';
  static const wizardBack = 'חזרה';
  static const wizardFinish = 'סיים';
  static const wizardSkip = 'דלג לעת עתה';
  static const wizardDone = 'ההגדרה הסתיימה!';
  static const wizardSaveFailed = 'שמירת השלב נכשלה.';
  static const createCommunityTitle = 'יצירת קהילה חדשה';
  static const createCommunityNameHint = 'שם הקהילה';
  static const createCommunityDescHint = 'תיאור קצר';
  static const createCommunityCategory = 'קטגוריה';
  static const createCommunitySlug = 'מזהה ייחודי (slug)';
  static const createCommunityAdminEmail = 'מייל המנהל הראשי';
  static const createCommunityCta = 'צור קהילה';
  static const createCommunityNote =
      'יצירת קהילות חדשות זמינה ל-Super Admin בלבד. אם אתה משתמש רגיל — תוכל להצטרף לקהילות קיימות מסך הגלה קהילות.';
  static const settingsTitle = 'הגדרות הקהילה';
  static const settingsBasics = 'יסודות';
  static const settingsBranding = 'מיתוג';
  static const settingsPrivacy = 'פרטיות';
  static const settingsRoles = 'תפקידים';
  static const settingsRules = 'תקנון';
  static const settingsWelcome = 'הודעת ברוכים הבאים';
  static const settingsSaved = 'ההגדרות נשמרו.';
  static const settingsSaveFailed = 'שמירת ההגדרות נכשלה.';
  static const brandingTitle = 'התאמת מיתוג';
  static const brandingPrimary = 'צבע ראשי (hex)';
  static const brandingAccent = 'צבע משני (hex)';
  static const brandingLogoUrl = 'כתובת לוגו';
  static const brandingCoverUrl = 'כתובת תמונת רקע';
  static const brandingPreview = 'תצוגה מקדימה';
  static const inviteMemberTitle = 'הזמנת חבר חדש';
  static const inviteMemberEmail = 'דוא"ל החבר';
  static const inviteMemberRole = 'תפקיד';
  static const inviteMemberSend = 'שלח הזמנה';
  static const inviteSent = 'ההזמנה נשלחה.';
  static const inviteFailed = 'שליחת ההזמנה נכשלה.';
  static const roleMgmtTitle = 'ניהול תפקידים';
  static const roleMgmtAdmin = 'מנהלים';
  static const roleMgmtSubadmin = 'מנהלי משנה';
  static const roleMgmtEventMgr = 'אחראי אירועים';
  static const roleMgmtPromote = 'קדם';
  static const roleMgmtDemote = 'הורד';
  static const roleChanged = 'התפקיד עודכן.';
  static const roleChangeFailed = 'עדכון התפקיד נכשל.';
  static const assignEvtMgrTitle = 'הקצאת אחראי אירוע';
  static const assignEvtMgrHint = 'הזן מזהה חבר (userId)';
  static const assignEvtMgrAssign = 'הקצה';
  static const assignedToast = 'נשמר.';
  static const adminEventsTitle = 'אירועי הקהילה';
  static const adminEventsAll = 'הכל';
  static const adminEventsDraft = 'טיוטות';
  static const adminEventsPublished = 'פורסם';
  static const adminEventsCancelled = 'בוטל';
  static const adminEventsEmpty = 'אין עדיין אירועים. צור אחד חדש.';
  static const adminEventNew = 'צור אירוע';
  static const adminEventDetailTitle = 'פרטי אירוע (מנהל)';
  static const adminEditEvent = 'עריכת אירוע';
  static const adminEditPricing = 'עריכת מחירים';
  static const adminAssignManager = 'הקצה אחראי';
  static const adminIssueRefund = 'הוצא החזר';
  static const adminViewAttendees = 'רשימת נרשמים';
  static const adminViewMaterials = 'חומרים';
  static const adminViewQA = 'שאלות ותשובות';
  static const adminViewRecap = 'סיכום';
  static const finDashboardTitle = 'לוח כספים';
  static const finRevenueByEvent = 'הכנסות לפי אירוע';
  static const finSubscriptions = 'מנויים פעילים';
  static const finManageSubs = 'נהל מנויים';
  static const finNoData = 'אין עדיין נתונים כספיים.';
  static const subsManagementTitle = 'ניהול מנויים';
  static const subsActive = 'פעילים';
  static const subsCancelling = 'מתבטלים';
  static const subsEmpty = 'אין מנויים בקהילה.';
  static const refundTitleA = 'הוצאת החזר';
  static const refundChoosePayment = 'בחר תשלום להחזרה';
  static const refundAmountField = 'סכום ההחזר (בסנט; ריק = החזר מלא)';
  static const refundReasonField = 'סיבה';
  static const refundIssue = 'בצע החזר';
  static const refundIssuedToast = 'ההחזר הופק.';
  static const refundFailed = 'בקשת ההחזר נכשלה.';

  // Super admin (C7)
  static const superDashboardTitle = 'מרכז הפלטפורמה';
  static const platformBadge = 'Super Admin';
  static const superKpiCommunities = 'קהילות';
  static const superKpiUsers = 'משתמשים';
  static const superKpiMrr = 'הכנסה חודשית';
  static const superKpiDau = 'פעילים החודש';
  static const superActivityFeed = 'פעילות אחרונה';
  static const superCommunitiesTitle = 'קהילות בפלטפורמה';
  static const superCommunitiesNew = 'צור קהילה';
  static const superCommunityVitalMembers = 'חברים';
  static const superCommunityVitalEvents = 'אירועים';
  static const superCommunityVitalMrr = 'מנויים';
  static const superCommunityVitalPlan = 'תוכנית';
  static const superSuspendCta = 'השעיה';
  static const superRestoreCta = 'שחזר';
  static const superDeleteCta = 'מחק';
  static const superSuspendTitle = 'השעיית קהילה';
  static const superSuspendTypeName = 'הקלד את שם הקהילה לאישור';
  static const superSuspendReason = 'סיבת ההשעיה';
  static const superSuspendDone = 'הקהילה הושעתה.';
  static const superRestoreDone = 'הקהילה שוחזרה.';
  static const superDeleteConfirm = 'למחוק את הקהילה? פעולה זו מסירה גישה לכל החברים.';
  static const superDeleteDone = 'הקהילה נמחקה.';
  static const superUsersTitle = 'משתמשי הפלטפורמה';
  static const superUsersEmpty = 'לא נמצאו משתמשים.';
  static const superUserDetailTitle = 'פרופיל משתמש (Super)';
  static const superUserCommunities = 'קהילות שהמשתמש שייך אליהן';
  static const superUserAccount = 'פעולות חשבון';
  static const superUserDisable = 'השבת חשבון';
  static const superUserEnable = 'הפעל מחדש';
  static const superUserDisabled = 'החשבון הושבת.';
  static const superUserEnabled = 'החשבון הופעל מחדש.';
  static const superSettingsTitle = 'הגדרות פלטפורמה';
  static const superSettingsBilling = 'מפתחות חיוב (Stripe)';
  static const superSettingsMaintenance = 'מצב תחזוקה';
  static const superSettingsAllowSignups = 'אפשר הרשמות חדשות';
  static const superSettingsEmailTemplates = 'תבניות אימייל';
  static const superSettingsTerms = 'תקנון השירות';
  static const superSettingsSaved = 'ההגדרות נשמרו.';
  static const suspendedCommunityHeadline = 'הקהילה הושעתה';
  static const suspendedCommunityBody =
      'מנהל הפלטפורמה השעה את הקהילה. החברות שלך נשמרה — תוכל להמשיך בקהילות אחרות בינתיים.';
  static const suspendedOtherCta = 'לקהילות אחרות';
  static const suspendedSupportCta = 'פנייה לתמיכה';

  // Edge states (C8)
  static const notFoundHeadline = 'הדף לא נמצא';
  static const notFoundBody = 'הקישור הזה לא קיים יותר או הוקלד שגוי. נחזיר אותך הביתה.';
  static const errorHomeCta = 'חזרה לבית';
  static const unauthorizedHeadline = 'אין לך גישה לדף הזה';
  static const unauthorizedBody = 'הדף הזה דורש הרשאות שאינן שמורות לתפקיד שלך.';
  static String unauthorizedNeedsRole(String role) => 'נדרש: $role';
  static const error500Headline = 'משהו השתבש אצלנו';
  static const error500Body = 'מאמצים לפתור — נסה שוב בעוד רגע. שמרנו את האירוע למעקב.';
  static const tryAgain = 'נסה שוב';
  static const contactSupport = 'פנייה לתמיכה';
  static String errorId(String id) => 'מזהה תקלה: $id';
  static const offlineBanner = 'אין חיבור לאינטרנט — מנסים שוב...';
  static String offlineLastSync(DateTime when) =>
      'סינכרון אחרון: ${when.hour.toString().padLeft(2, '0')}:${when.minute.toString().padLeft(2, '0')}';
  static const offlineHeadline = 'אתה במצב לא מקוון';
  static const offlineBody = 'התוכן שנטען נשמר זמנית. נחזור לפעולה מלאה ברגע שהחיבור יחזור.';
  static const updateRequiredHeadline = 'נדרש עדכון לאפליקציה';
  static const updateRequiredBody = 'הגרסה שלך אינה נתמכת יותר. עדכן כדי להמשיך.';
  static const updateButton = 'עדכן עכשיו';
  static String appVersionLabel(String v) => 'גרסה $v';
  static const privacyTitle = 'פרטיות';
  static const privacyProfileVisibility = 'מי רואה את הפרופיל שלך?';
  static const privacyVisMembers = 'חברי הקהילה';
  static const privacyVisEveryone = 'כולם';
  static const privacyVisOnlyMe = 'רק אני';
  static const privacyShowAttendance = 'הצג את הנוכחות באירועים';
  static const privacyShowInitiatives = 'הצג את היוזמות שלי';
  static const privacyAllowMessages = 'אפשר הודעות פרטיות מחברים';
  static const privacyBlockedMembers = 'חברים חסומים';

  // Discussions / posts
  static const discussions = 'שיחות';
  static const newPost = 'פוסט חדש';
  static const postBody = 'תוכן הפוסט';
  static const postCreated = 'הפוסט פורסם.';
  static const noPosts = 'אין עדיין פוסטים בקהילה.';
  static const pinnedBadge = 'מוצמד';
  static const lockedBadge = 'נעול';
}
