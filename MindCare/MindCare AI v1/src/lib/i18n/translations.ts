export type Locale = 'en' | 'ro';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Sidebar
    'nav.dashboard': 'Dashboard',
    'nav.consultation': 'Consultation',
    'nav.aiAssistant': 'AI Assistant',
    'nav.patientDatabase': 'Patient Database',
    'nav.analytics': 'Analytics',
    'nav.calendar': 'Calendar',
    'nav.templates': 'Templates',
    'nav.settings': 'Settings',

    // Auth
    'auth.signOut': 'Sign out',
    'auth.signedInAs': 'Signed in as',

    // Search
    'search.placeholder': 'Search consultations, patients, notes...',

    // Dashboard greetings
    'greeting.morning': 'Good morning',
    'greeting.afternoon': 'Good afternoon',
    'greeting.evening': 'Good evening',
    'dashboard.welcome': 'Welcome back to your medical scribe dashboard',
    'dashboard.todayConsultations': "Today's Consultations",
    'dashboard.pendingReviews': 'Pending Reviews',
    'dashboard.notesFinalized': 'Notes Finalized',
    'dashboard.patientsAtRisk': 'Patients at Risk',
    'dashboard.startNew': 'Start New Consultation',
    'dashboard.pendingActions': 'Pending Actions — Patients Needing Attention',
    'dashboard.reviewNow': 'Review Now',
    'dashboard.todaySchedule': "Today's Schedule",
    'dashboard.viewCalendar': 'View Calendar',
    'dashboard.recentConsultations': 'Recent Consultations',
    'dashboard.view': 'View',
    'dashboard.viewNote': 'View Note',
    'dashboard.noConsultationsToday': 'No consultations scheduled for today.',
    'dashboard.startNewConsultation': 'Start a new consultation',
    'dashboard.noConsultationsYet': 'No consultations yet. Start your first one above.',
    'dashboard.reviewTranscript': 'Review transcript',
    'dashboard.reviewGeneratedNote': 'Review generated note',

    // Table headers
    'table.patientCode': 'Patient Code',
    'table.name': 'Name',
    'table.type': 'Type',
    'table.diagnosis': 'Diagnosis',
    'table.risk': 'Risk',
    'table.appointment': 'Appointment',
    'table.status': 'Status',
    'table.actions': 'Actions',

    // Risk
    'risk.atRisk': 'At Risk',
    'risk.watch': 'Watch',
    'risk.normal': 'Normal',

    // Notifications
    'notifications.title': 'Notifications',
    'notifications.none': 'No new notifications',

    // Search results
    'search.consultations': 'Consultations',
    'search.patients': 'Patients',
    'search.transcriptMatches': 'Transcript Matches',
    'search.noResults': 'No results found for',
  },
  ro: {
    // Sidebar
    'nav.dashboard': 'Panou Principal',
    'nav.consultation': 'Consultație',
    'nav.aiAssistant': 'Asistent AI',
    'nav.patientDatabase': 'Baza de Pacienți',
    'nav.analytics': 'Analize',
    'nav.calendar': 'Calendar',
    'nav.templates': 'Șabloane',
    'nav.settings': 'Setări',

    // Auth
    'auth.signOut': 'Deconectare',
    'auth.signedInAs': 'Conectat ca',

    // Search
    'search.placeholder': 'Caută consultații, pacienți, note...',

    // Dashboard greetings
    'greeting.morning': 'Bună dimineața',
    'greeting.afternoon': 'Bună ziua',
    'greeting.evening': 'Bună seara',
    'dashboard.welcome': 'Bine ai revenit la panoul tău medical',
    'dashboard.todayConsultations': 'Consultațiile de Azi',
    'dashboard.pendingReviews': 'Recenzii în Așteptare',
    'dashboard.notesFinalized': 'Note Finalizate',
    'dashboard.patientsAtRisk': 'Pacienți la Risc',
    'dashboard.startNew': 'Consultație Nouă',
    'dashboard.pendingActions': 'Acțiuni în Așteptare — Pacienți care Necesită Atenție',
    'dashboard.reviewNow': 'Revizuiește',
    'dashboard.todaySchedule': 'Programul de Azi',
    'dashboard.viewCalendar': 'Vezi Calendar',
    'dashboard.recentConsultations': 'Consultații Recente',
    'dashboard.view': 'Vezi',
    'dashboard.viewNote': 'Vezi Nota',
    'dashboard.noConsultationsToday': 'Nu sunt consultații programate pentru astăzi.',
    'dashboard.startNewConsultation': 'Începe o consultație nouă',
    'dashboard.noConsultationsYet': 'Nu sunt consultații încă. Începe prima mai sus.',
    'dashboard.reviewTranscript': 'Revizuiește transcrierea',
    'dashboard.reviewGeneratedNote': 'Revizuiește nota generată',

    // Table headers
    'table.patientCode': 'Cod Pacient',
    'table.name': 'Nume',
    'table.type': 'Tip',
    'table.diagnosis': 'Diagnostic',
    'table.risk': 'Risc',
    'table.appointment': 'Programare',
    'table.status': 'Status',
    'table.actions': 'Acțiuni',

    // Risk
    'risk.atRisk': 'La Risc',
    'risk.watch': 'Monitorizare',
    'risk.normal': 'Normal',

    // Notifications
    'notifications.title': 'Notificări',
    'notifications.none': 'Nu sunt notificări noi',

    // Search results
    'search.consultations': 'Consultații',
    'search.patients': 'Pacienți',
    'search.transcriptMatches': 'Potriviri în Transcrieri',
    'search.noResults': 'Nu s-au găsit rezultate pentru',
  },
};

export default translations;
