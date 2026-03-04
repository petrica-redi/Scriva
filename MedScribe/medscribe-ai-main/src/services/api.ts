import {
  Consultation,
  ConsultationWithRelations,
  ClinicalNote,
  NoteTemplate,
  ApiError,
} from "@/types";

interface PaginationParams {
  page?: number;
  limit?: number;
  status?: string;
}

interface ListResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Handles API response parsing and error handling
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (!response.ok) {
    let errorData: ErrorResponse = {
      error: "Unknown error",
      code: "UNKNOWN",
    };

    if (isJson) {
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: response.statusText || "Unknown error",
          code: `HTTP_${response.status}`,
        };
      }
    }

    const error = new Error(errorData.error) as Error & { code?: string };
    error.code = errorData.code;
    throw error;
  }

  if (!isJson) {
    throw new Error("Invalid response format");
  }

  return response.json();
}

/**
 * API service for consultations
 */
const consultationsApi = {
  /**
   * List consultations with pagination and filtering
   */
  async list(params?: PaginationParams): Promise<ListResponse<Consultation>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", String(params.page));
    if (params?.limit) searchParams.append("limit", String(params.limit));
    if (params?.status) searchParams.append("status", params.status);

    const response = await fetch(
      `/api/consultations?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return handleResponse<ListResponse<Consultation>>(response);
  },

  /**
   * Fetch a single consultation with relations
   */
  async get(id: string): Promise<ConsultationWithRelations> {
    const response = await fetch(`/api/consultations/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return handleResponse<ConsultationWithRelations>(response);
  },

  /**
   * Create a new consultation
   */
  async create(data: {
    visit_type: string;
    patient_name?: string;
    notes?: string;
  }): Promise<Consultation> {
    const response = await fetch("/api/consultations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return handleResponse<Consultation>(response);
  },

  /**
   * Update a consultation
   */
  async update(
    id: string,
    data: {
      status?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Consultation> {
    const response = await fetch(`/api/consultations/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return handleResponse<Consultation>(response);
  },

  /**
   * Delete a consultation
   */
  async delete(id: string): Promise<{ message: string }> {
    const response = await fetch(`/api/consultations/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return handleResponse<{ message: string }>(response);
  },
};

/**
 * API service for clinical notes
 */
const notesApi = {
  /**
   * Generate a clinical note from a transcript
   */
  async generate(data: {
    consultation_id: string;
    template: string;
    transcript: string;
    metadata?: {
      specialty?: string;
    };
  }): Promise<ClinicalNote> {
    const response = await fetch("/api/generate-note", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return handleResponse<ClinicalNote>(response);
  },
};

/**
 * API service for templates
 */
const templatesApi = {
  /**
   * List templates with optional filtering
   */
  async list(filter?: "system" | "user" | "published"): Promise<
    NoteTemplate[]
  > {
    const searchParams = new URLSearchParams();
    if (filter) searchParams.append("filter", filter);

    const response = await fetch(`/api/templates?${searchParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return handleResponse<NoteTemplate[]>(response);
  },

  /**
   * Get a single template by ID
   */
  async get(id: string): Promise<NoteTemplate> {
    const response = await fetch(`/api/templates/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return handleResponse<NoteTemplate>(response);
  },

  /**
   * Create a new template
   */
  async create(data: {
    name: string;
    description?: string;
    specialty?: string;
    sections: Array<{
      title: string;
      prompt: string;
      example?: string;
      order: number;
    }>;
  }): Promise<NoteTemplate> {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return handleResponse<NoteTemplate>(response);
  },
};

const followUpsApi = {
  async list(params?: { patient_id?: string; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.patient_id) searchParams.append("patient_id", params.patient_id);
    if (params?.status) searchParams.append("status", params.status);
    const response = await fetch(`/api/follow-ups?${searchParams}`, { headers: { "Content-Type": "application/json" } });
    return handleResponse<{ data: unknown[] }>(response);
  },
  async create(data: { patient_id: string; type: string; title: string; due_date: string; description?: string; priority?: string; consultation_id?: string }) {
    const response = await fetch("/api/follow-ups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return handleResponse<unknown>(response);
  },
  async update(data: { id: string; status?: string; snoozed_until?: string }) {
    const response = await fetch("/api/follow-ups", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return handleResponse<unknown>(response);
  },
};

const vitalsApi = {
  async list(patientId: string, params?: { reading_type?: string; days?: number }) {
    const searchParams = new URLSearchParams({ patient_id: patientId });
    if (params?.reading_type) searchParams.append("reading_type", params.reading_type);
    if (params?.days) searchParams.append("days", String(params.days));
    const response = await fetch(`/api/vitals?${searchParams}`, { headers: { "Content-Type": "application/json" } });
    return handleResponse<{ data: unknown[]; trends: Record<string, unknown> }>(response);
  },
  async record(data: { patient_id: string; device_type: string; reading_type: string; value: number; unit: string; device_name?: string; notes?: string }) {
    const response = await fetch("/api/vitals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return handleResponse<unknown>(response);
  },
};

const cdsApi = {
  async analyze(data: { transcript: string; medications?: string[]; patient_history?: string; consultation_id?: string; patient_id?: string }) {
    const response = await fetch("/api/ai/clinical-decision-support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return handleResponse<unknown>(response);
  },
};

const schedulingApi = {
  async getPreferences() {
    const response = await fetch("/api/scheduling", { headers: { "Content-Type": "application/json" } });
    return handleResponse<{ data: unknown[] }>(response);
  },
  async suggest(date: string, visitType?: string) {
    const searchParams = new URLSearchParams({ action: "suggest", date });
    if (visitType) searchParams.append("visit_type", visitType);
    const response = await fetch(`/api/scheduling?${searchParams}`, { headers: { "Content-Type": "application/json" } });
    return handleResponse<{ suggestions: unknown[] }>(response);
  },
  async savePreferences(preferences: unknown[]) {
    const response = await fetch("/api/scheduling", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferences }) });
    return handleResponse<{ data: unknown[] }>(response);
  },
};

const teamApi = {
  async get() {
    const response = await fetch("/api/team", { headers: { "Content-Type": "application/json" } });
    return handleResponse<{ organizations: unknown[]; members: unknown[]; myRole: string }>(response);
  },
  async createOrg(name: string, type?: string) {
    const response = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_org", name, type }) });
    return handleResponse<unknown>(response);
  },
  async invite(organizationId: string, email: string, role?: string) {
    const response = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "invite", organization_id: organizationId, email, role }) });
    return handleResponse<unknown>(response);
  },
};

const intakeApi = {
  async listForms(type?: string) {
    const searchParams = new URLSearchParams();
    if (type) searchParams.append("type", type);
    const response = await fetch(`/api/intake/forms?${searchParams}`, { headers: { "Content-Type": "application/json" } });
    return handleResponse<{ data: unknown[] }>(response);
  },
  async createForm(data: { name: string; form_type: string; questions: unknown[]; description?: string }) {
    const response = await fetch("/api/intake/forms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return handleResponse<unknown>(response);
  },
  async submitResponse(data: { form_id: string; responses: Record<string, unknown>; respondent_name?: string; respondent_email?: string; patient_id?: string }) {
    const response = await fetch("/api/intake/responses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return handleResponse<unknown>(response);
  },
};

const fhirApi = {
  async status() {
    const response = await fetch("/api/fhir?action=status", { headers: { "Content-Type": "application/json" } });
    return handleResponse<{ configured: boolean; reachable: boolean; server: string | null }>(response);
  },
  async searchPatient(params: { name?: string; identifier?: string }) {
    const searchParams = new URLSearchParams({ action: "search_patient" });
    if (params.name) searchParams.append("name", params.name);
    if (params.identifier) searchParams.append("identifier", params.identifier);
    const response = await fetch(`/api/fhir?${searchParams}`, { headers: { "Content-Type": "application/json" } });
    return handleResponse<{ patients: unknown[] }>(response);
  },
  async importPatient(fhirId: string) {
    const response = await fetch("/api/fhir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import_patient", fhir_id: fhirId }) });
    return handleResponse<unknown>(response);
  },
  async exportNote(consultationId: string) {
    const response = await fetch("/api/fhir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "export_note", consultation_id: consultationId }) });
    return handleResponse<unknown>(response);
  },
};

const analyticsApi = {
  async advanced(days?: number) {
    const response = await fetch(`/api/analytics/advanced?days=${days || 90}`, { headers: { "Content-Type": "application/json" } });
    return handleResponse<unknown>(response);
  },
};

const portalApi = {
  async getMessages(patientId: string) {
    const response = await fetch(`/api/portal/messages?patient_id=${patientId}`, { headers: { "Content-Type": "application/json" } });
    return handleResponse<{ data: unknown[] }>(response);
  },
  async sendMessage(data: { patient_id: string; body: string; subject?: string; parent_id?: string }) {
    const response = await fetch("/api/portal/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    return handleResponse<unknown>(response);
  },
};

/**
 * Main API service object with organized endpoints
 */
export const api = {
  consultations: consultationsApi,
  notes: notesApi,
  templates: templatesApi,
  followUps: followUpsApi,
  vitals: vitalsApi,
  cds: cdsApi,
  scheduling: schedulingApi,
  team: teamApi,
  intake: intakeApi,
  fhir: fhirApi,
  analytics: analyticsApi,
  portal: portalApi,
};
