import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ============================================================================
// TYPES
// ============================================================================

export interface BusinessSettings {
  industry: 'saas_b2b' | 'saas_b2c' | 'education' | 'other' | 'auto';
  averageContractValue: 'low' | 'medium' | 'high' | 'auto';
}

interface UserSettingsContextType {
  businessSettings: BusinessSettings;
  updateBusinessSettings: (settings: Partial<BusinessSettings>) => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  detectedIndustry: string | null;
  detectedContractValue: string | null;
  setDetectedValues: (industry: string | null, contractValue: string | null) => void;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const defaultBusinessSettings: BusinessSettings = {
  industry: 'auto',
  averageContractValue: 'auto',
};

// ============================================================================
// CONTEXT
// ============================================================================

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(defaultBusinessSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [detectedIndustry, setDetectedIndustry] = useState<string | null>(null);
  const [detectedContractValue, setDetectedContractValue] = useState<string | null>(null);

  // Load settings from database or localStorage
  useEffect(() => {
    async function loadSettings() {
      // If user is not logged in, use localStorage
      if (!user) {
        const stored = localStorage.getItem('businessSettings');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setBusinessSettings(parsed);
          } catch (e) {
            console.error('Failed to parse stored business settings:', e);
          }
        }
        setIsLoading(false);
        return;
      }

      // User is logged in - fetch from database
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('industry, contract_value')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading settings from database:', error);
          // Fallback to localStorage
          const stored = localStorage.getItem('businessSettings');
          if (stored) {
            setBusinessSettings(JSON.parse(stored));
          }
        } else if (data) {
          const dbSettings: BusinessSettings = {
            industry: (data.industry as BusinessSettings['industry']) || 'auto',
            averageContractValue: (data.contract_value as BusinessSettings['averageContractValue']) || 'auto',
          };
          setBusinessSettings(dbSettings);
          // Sync localStorage with database values
          localStorage.setItem('businessSettings', JSON.stringify(dbSettings));
        }
      } catch (e) {
        console.error('Error loading settings:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, [user]);

  const updateBusinessSettings = useCallback(async (updates: Partial<BusinessSettings>) => {
    const newSettings = { ...businessSettings, ...updates };
    setBusinessSettings(newSettings);
    
    // Always save to localStorage as fallback
    localStorage.setItem('businessSettings', JSON.stringify(newSettings));

    // If user is logged in, save to database
    if (user) {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            industry: newSettings.industry,
            contract_value: newSettings.averageContractValue,
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Error saving settings to database:', error);
          throw error;
        }
      } finally {
        setIsSaving(false);
      }
    }
  }, [businessSettings, user]);

  const setDetectedValues = useCallback((industry: string | null, contractValue: string | null) => {
    setDetectedIndustry(industry);
    setDetectedContractValue(contractValue);
  }, []);

  return (
    <UserSettingsContext.Provider
      value={{
        businessSettings,
        updateBusinessSettings,
        isLoading,
        isSaving,
        detectedIndustry,
        detectedContractValue,
        setDetectedValues,
      }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
}

// ============================================================================
// HELPER: Get effective settings (resolve 'auto' to actual values)
// ============================================================================

export function getEffectiveBusinessSettings(
  userSettings: BusinessSettings,
  autoDetected: { industry: string; averageContractValue: string }
): { industry: 'saas_b2b' | 'saas_b2c' | 'education' | 'unknown'; averageContractValue: 'low' | 'medium' | 'high' } {
  const industry = userSettings.industry === 'auto' || userSettings.industry === 'other'
    ? (autoDetected.industry as 'saas_b2b' | 'saas_b2c' | 'education' | 'unknown')
    : userSettings.industry;

  const averageContractValue = userSettings.averageContractValue === 'auto'
    ? (autoDetected.averageContractValue as 'low' | 'medium' | 'high')
    : userSettings.averageContractValue;

  return { industry, averageContractValue };
}
