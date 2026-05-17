// src/hooks/useBiometric.js
import { useState } from 'react';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

export function useBiometric() {
  const isBiometricAvailable = async () => {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const result = await BiometricAuth.checkBiometry();
      return result.isAvailable;
    } catch {
      return false;
    }
  };

  const loginWithBiometric = async () => {
    try {
      const verified = await BiometricAuth.authenticate({
        reason: 'Login to Najah platform',
      });
      if (verified) {
        // Mock credentials fetch as BiometricAuth doesn't store credentials directly,
        // it just authenticates the user. SecureStoragePlugin is needed for that.
        // Returning true for successful verification.
        return true; 
      }
    } catch (e) {
      toast.error('Biometric authentication failed');
    }
    return null;
  };

  const setupBiometric = async (email, password) => {
    if (!(await isBiometricAvailable())) return;
    try {
      // Just save a flag for now
      localStorage.setItem('biometric_enabled', 'true');
      localStorage.setItem('bio_email', email);
    } catch (e) {
      console.warn('Failed to save biometric credentials', e);
    }
  };

  return { isBiometricAvailable, loginWithBiometric, setupBiometric };
}
