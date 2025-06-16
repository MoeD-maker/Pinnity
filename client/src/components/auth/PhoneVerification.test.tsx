import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PhoneVerification from './PhoneVerification';
import { sendSMSVerification, verifySMSCode } from '@/lib/smsService';
import { useToast } from '@/hooks/use-toast';

// Mock the SMS service functions
vi.mock('@/lib/smsService', () => ({
  sendSMSVerification: vi.fn(),
  verifySMSCode: vi.fn(),
  formatPhoneForDisplay: vi.fn((phone) => phone),
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon">Loading</div>,
  Phone: () => <div data-testid="phone-icon">Phone</div>,
  Shield: () => <div data-testid="shield-icon">Shield</div>,
}));

describe('PhoneVerification', () => {
  const mockOnVerificationComplete = vi.fn();
  const mockOnPhoneChange = vi.fn();
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
  });

  const defaultProps = {
    phoneNumber: '',
    onVerificationComplete: mockOnVerificationComplete,
    onPhoneChange: mockOnPhoneChange,
  };

  describe('Core Requirements Tests', () => {
    it('renders phone input and Send Code button', () => {
      render(<PhoneVerification {...defaultProps} />);

      // Test requirement 1: Shows phone input and Send Code button
      const phoneInput = screen.getByLabelText(/phone number/i);
      const sendButton = screen.getByRole('button', { name: /send verification code/i });
      
      expect(phoneInput).toBeDefined();
      expect(sendButton).toBeDefined();
      expect(phoneInput.getAttribute('type')).toBe('tel');
    });

    it('calls sendSMSVerification with phone number when Send Code clicked', async () => {
      const user = userEvent.setup();
      const testPhone = '1234567890';
      (sendSMSVerification as any).mockResolvedValue(true);

      render(<PhoneVerification {...defaultProps} phoneNumber={testPhone} />);

      const sendButton = screen.getByRole('button', { name: /send verification code/i });
      await user.click(sendButton);

      // Test requirement 2: Calls sendSMSVerification with the number
      expect(sendSMSVerification).toHaveBeenCalledWith(testPhone);
    });

    it('transitions to code input after successful SMS send', async () => {
      const user = userEvent.setup();
      const testPhone = '1234567890';
      (sendSMSVerification as any).mockResolvedValue(true);

      render(<PhoneVerification {...defaultProps} phoneNumber={testPhone} />);

      const sendButton = screen.getByRole('button', { name: /send verification code/i });
      await user.click(sendButton);

      // Wait for transition to code input step
      await waitFor(() => {
        const codeInput = screen.getByLabelText(/verification code/i);
        expect(codeInput).toBeDefined();
      });
    });

    it('calls verifySMSCode with phone and code when verify clicked', async () => {
      const user = userEvent.setup();
      const testPhone = '1234567890';
      const testCode = '123456';
      (sendSMSVerification as any).mockResolvedValue(true);
      (verifySMSCode as any).mockResolvedValue(true);

      render(<PhoneVerification {...defaultProps} phoneNumber={testPhone} />);

      // First send the SMS
      const sendButton = screen.getByRole('button', { name: /send verification code/i });
      await user.click(sendButton);

      // Wait for code input to appear
      await waitFor(() => {
        const codeInput = screen.getByLabelText(/verification code/i);
        expect(codeInput).toBeDefined();
      });

      // Enter code and verify
      const codeInput = screen.getByLabelText(/verification code/i);
      const verifyButton = screen.getByRole('button', { name: /verify code/i });
      
      await user.type(codeInput, testCode);
      await user.click(verifyButton);

      // Test requirement 3: Calls verifySMSCode correctly
      expect(verifySMSCode).toHaveBeenCalledWith(testPhone, testCode);
    });

    it('calls onVerificationComplete when verification succeeds', async () => {
      const user = userEvent.setup();
      const testPhone = '1234567890';
      const testCode = '123456';
      (sendSMSVerification as any).mockResolvedValue(true);
      (verifySMSCode as any).mockResolvedValue(true);

      render(<PhoneVerification {...defaultProps} phoneNumber={testPhone} />);

      // Send SMS
      const sendButton = screen.getByRole('button', { name: /send verification code/i });
      await user.click(sendButton);

      // Wait for code input
      await waitFor(() => {
        screen.getByLabelText(/verification code/i);
      });

      // Enter code and verify
      const codeInput = screen.getByLabelText(/verification code/i);
      const verifyButton = screen.getByRole('button', { name: /verify code/i });
      
      await user.type(codeInput, testCode);
      await user.click(verifyButton);

      // Should call completion callback
      await waitFor(() => {
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(true);
      });
    });

    it('handles verification failure correctly', async () => {
      const user = userEvent.setup();
      const testPhone = '1234567890';
      const testCode = '123456';
      (sendSMSVerification as any).mockResolvedValue(true);
      (verifySMSCode as any).mockResolvedValue(false);

      render(<PhoneVerification {...defaultProps} phoneNumber={testPhone} />);

      // Send SMS
      const sendButton = screen.getByRole('button', { name: /send verification code/i });
      await user.click(sendButton);

      // Wait for code input
      await waitFor(() => {
        screen.getByLabelText(/verification code/i);
      });

      // Enter code and verify
      const codeInput = screen.getByLabelText(/verification code/i);
      const verifyButton = screen.getByRole('button', { name: /verify code/i });
      
      await user.type(codeInput, testCode);
      await user.click(verifyButton);

      // Should show error toast and not call completion
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Invalid code",
            variant: "destructive",
          })
        );
      });
      expect(mockOnVerificationComplete).not.toHaveBeenCalled();
    });

    it('validates phone number before sending SMS', async () => {
      const user = userEvent.setup();
      const shortPhone = '123';

      render(<PhoneVerification {...defaultProps} phoneNumber={shortPhone} />);

      const sendButton = screen.getByRole('button', { name: /send verification code/i });
      await user.click(sendButton);

      // Should show validation error and not call SMS service
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Invalid phone number",
          variant: "destructive",
        })
      );
      expect(sendSMSVerification).not.toHaveBeenCalled();
    });

    it('limits code input to 6 numeric digits', async () => {
      const user = userEvent.setup();
      const testPhone = '1234567890';
      (sendSMSVerification as any).mockResolvedValue(true);

      render(<PhoneVerification {...defaultProps} phoneNumber={testPhone} />);

      // Send SMS to get to code input
      const sendButton = screen.getByRole('button', { name: /send verification code/i });
      await user.click(sendButton);

      await waitFor(() => {
        screen.getByLabelText(/verification code/i);
      });

      const codeInput = screen.getByLabelText(/verification code/i);
      
      // Try to enter more than 6 characters with letters
      await user.type(codeInput, 'abc123def456789');

      // Should only contain 6 numeric digits
      expect((codeInput as HTMLInputElement).value).toBe('123456');
    });
  });
});