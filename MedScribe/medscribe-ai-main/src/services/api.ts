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

/**
 * Main API service object with organized endpoints
 */
export const api = {
  consultations: consultationsApi,
  notes: notesApi,
  templates: templatesApi,
};
