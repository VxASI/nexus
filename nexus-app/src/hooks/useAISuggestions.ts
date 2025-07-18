import { useState, useEffect, useRef } from 'react';

export function useAISuggestions(content: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:8000';
  // Assume supabase from auth context
  import { useAuth } from '../hooks/useAuth';  // Adjust as needed

  useEffect(() => {
    if (!content.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (timerRef.current) clearTimeout(timerRef.current);

    const fetchSuggestions = async () => {
        try {
            const { supabase } = useAuth();
            const token = (await supabase.auth.getSession())?.data.session?.access_token;
            const response = await fetch(`${BACKEND_URL}/api/suggestions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ full_text: content }),
            });
            if (!response.ok) throw new Error('Failed to generate suggestions');
            const data = await response.json();
            setSuggestions(data.items.map(item => item.insertText));
        } catch (err) {
            setError('Failed to generate suggestions');
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    };
    timerRef.current = setTimeout(fetchSuggestions, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content]);

  return { suggestions, isLoading, error };
} 