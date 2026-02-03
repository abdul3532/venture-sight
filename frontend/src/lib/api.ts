import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    VCThesis, ThesisCreate, PitchDeck, PitchDeckDetail,
    CouncilAnalysis, ChatMessage, ChatRequest, Conversation,
    DocumentUploadResponse
} from './types';
import { supabase } from './supabase';


const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const res = await fetch(url, { ...options, headers });
    return res;
};

// ============ THESIS API ============
export const useThesis = () => {
    return useQuery({
        queryKey: ['thesis'],
        queryFn: async (): Promise<VCThesis | null> => {
            const res = await authenticatedFetch(`${API_BASE}/api/thesis`);
            if (!res.ok) {
                if (res.status === 404) return null;
                throw new Error('Failed to fetch thesis');
            }
            return res.json();
        }
    });
};

export const useUpdateThesis = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (thesis: ThesisCreate): Promise<VCThesis> => {
            const res = await authenticatedFetch(`${API_BASE}/api/thesis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(thesis)
            });
            if (!res.ok) throw new Error('Failed to save thesis');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['thesis'] });
        }
    });
};

// ============ DECKS API ============
export const useDecks = (status?: string) => {
    return useQuery({
        queryKey: ['decks', status],
        queryFn: async (): Promise<PitchDeck[]> => {
            const url = status
                ? `${API_BASE}/api/decks?status=${status}`
                : `${API_BASE}/api/decks`;
            const res = await authenticatedFetch(url);
            if (!res.ok) throw new Error('Failed to fetch decks');
            return res.json();
        }
    });
};

export const useDeck = (deckId: string | null) => {
    return useQuery({
        queryKey: ['deck', deckId],
        queryFn: async (): Promise<PitchDeckDetail | null> => {
            if (!deckId) return null;
            const res = await authenticatedFetch(`${API_BASE}/api/decks/${deckId}`);
            if (!res.ok) throw new Error('Failed to fetch deck');
            return res.json();
        },
        enabled: !!deckId
    });
};

export const useUploadDeck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (file: File): Promise<PitchDeck> => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await authenticatedFetch(`${API_BASE}/api/decks/upload`, {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error('Failed to upload deck');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decks'] });
        }
    });
};

export const useArchiveDeck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (deckId: string): Promise<void> => {
            const res = await authenticatedFetch(`${API_BASE}/api/decks/${deckId}/archive`, {
                method: 'PATCH'
            });
            if (!res.ok) throw new Error('Failed to archive deck');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decks'] });
        }
    });
};

export const useDeleteDeck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (deckId: string): Promise<void> => {
            const res = await authenticatedFetch(`${API_BASE}/api/decks/${deckId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete deck');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decks'] });
        }
    });
};

export const useSaveNotes = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ deckId, notes }: { deckId: string; notes: string }): Promise<void> => {
            const res = await authenticatedFetch(`${API_BASE}/api/decks/${deckId}/notes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            });
            if (!res.ok) throw new Error('Failed to save notes');
        },
        onSuccess: (_, { deckId }) => {
            queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
        }
    });
};

// ============ COUNCIL API ============
export const useCouncilAnalysis = (deckId: string | null) => {
    return useQuery({
        queryKey: ['council', deckId],
        queryFn: async (): Promise<CouncilAnalysis | null> => {
            if (!deckId) return null;
            const res = await authenticatedFetch(`${API_BASE}/api/council/${deckId}`);
            if (!res.ok) throw new Error('Failed to fetch analysis');
            return res.json();
        },
        enabled: !!deckId,
        refetchInterval: (query) => {
            // Poll while analyzing
            const data = query.state.data;
            return data?.status === 'analyzing' ? 3000 : false;
        }
    });
};

export const useTriggerAnalysis = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (deckId: string): Promise<{ deck_id: string; message: string; status: string }> => {
            const res = await authenticatedFetch(`${API_BASE}/api/council/analyze/${deckId}`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed to trigger analysis');
            return res.json();
        },
        onSuccess: (_, deckId) => {
            queryClient.invalidateQueries({ queryKey: ['council', deckId] });
            queryClient.invalidateQueries({ queryKey: ['decks'] });
        }
    });
};

// ============ CHAT / ASSOCIATE API ============
export const useChat = () => {
    return useMutation({
        mutationFn: async (request: ChatRequest): Promise<{ content: string; conversation_id: string; role: string; id: string }> => {
            const res = await authenticatedFetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            });
            if (!res.ok) throw new Error('Chat request failed');
            return res.json();
        },
    });
};

export const useChatHistory = () => {
    return useQuery({
        queryKey: ['chatHistory'],
        queryFn: async (): Promise<Conversation[]> => {
            const res = await authenticatedFetch(`${API_BASE}/api/chat/history`);
            if (!res.ok) throw new Error('Failed to fetch history');
            return res.json();
        },
        retry: false
    });
};

export const useChatMessages = (conversationId: string | null) => {
    return useQuery({
        queryKey: ['chatMessages', conversationId],
        queryFn: async (): Promise<ChatMessage[]> => {
            if (!conversationId) return [];
            const res = await authenticatedFetch(`${API_BASE}/api/chat/${conversationId}/messages`);
            if (!res.ok) throw new Error('Failed to fetch messages');
            return res.json();
        },
        enabled: !!conversationId
    });
};

export const useUploadDocument = () => {
    return useMutation({
        mutationFn: async (file: File): Promise<DocumentUploadResponse> => {
            const formData = new FormData();
            formData.append('file', file);

            const res = await authenticatedFetch(`${API_BASE}/api/chat/upload-document`, {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error('Document upload failed');
            return res.json();
        }
    });
};
export const useDeleteConversation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string): Promise<void> => {
            const res = await authenticatedFetch(`${API_BASE}/api/chat/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete conversation');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chatHistory'] });
        }
    });
};

export const useClearHistory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<void> => {
            const res = await authenticatedFetch(`${API_BASE}/api/chat`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to clear history');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chatHistory'] });
            queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
        }
    });
};
